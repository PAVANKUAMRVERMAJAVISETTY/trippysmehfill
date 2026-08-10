import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useRestaurantSettings } from '../../context/RestaurantSettingsContext';
import { ShoppingBag, User, LogOut, Shield, Bike, HelpCircle, Bell, Menu as MenuIcon, X, Calendar, Home, Image as ImageIcon, Tag, PhoneCall, Bed, Utensils } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { SupportModal } from './SupportModal';
import { AppSection } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface OrderNotificationItem {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: string;
  deliveryAddress: string;
  time: string;
  event: 'NEW_ORDER' | 'STATUS_CHANGE';
}

interface HeaderProps {
  activeSection: AppSection;
  setActiveSection: (sec: AppSection) => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onLogoClick?: () => void;
  onOpenAuth?: (tab?: 'signin' | 'register') => void;
  onOpenCustomerDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  setActiveSection,
  onOpenCart,
  onOpenOrders,
  onLogoClick,
  onOpenAuth,
  onOpenCustomerDashboard
}) => {
  const { user, signOut } = useAuth();
  const { totalCount } = useCart();
  const { restaurantSettings } = useRestaurantSettings();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'register'>('signin');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [orderNotifications, setOrderNotifications] = useState<OrderNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !user || (user.role !== 'admin' && user.role !== 'staff')) return;

    const fetchLiveOrders = async () => {
      try {
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8);

        if (recentOrders && recentOrders.length > 0) {
          const items: OrderNotificationItem[] = recentOrders.map((ord: any) => ({
            id: 'ord-notif-' + ord.id,
            orderId: ord.id,
            orderNumber: ord.order_number || `#${ord.id.slice(0, 6)}`,
            customerName: ord.customer_name || 'Customer',
            customerPhone: ord.customer_phone || '',
            totalAmount: ord.total_amount || 0,
            status: ord.status || 'pending',
            deliveryAddress: ord.delivery_address || 'Delivery Address',
            time: ord.created_at ? new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live',
            event: 'NEW_ORDER'
          }));
          setOrderNotifications(items);
          setUnreadCount(items.filter(i => i.status === 'pending').length);
        }
      } catch (err) {
        console.error('Error fetching live order notifications:', err);
      }
    };

    fetchLiveOrders();

    const channel = supabase
      .channel('realtime-live-orders-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrd = payload.new as any;
          const item: OrderNotificationItem = {
            id: 'ord-notif-ins-' + newOrd.id + '-' + Date.now(),
            orderId: newOrd.id,
            orderNumber: newOrd.order_number || `#${newOrd.id.slice(0, 6)}`,
            customerName: newOrd.customer_name || 'Customer',
            customerPhone: newOrd.customer_phone || '',
            totalAmount: newOrd.total_amount || 0,
            status: newOrd.status || 'pending',
            deliveryAddress: newOrd.delivery_address || '',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            event: 'NEW_ORDER'
          };
          setOrderNotifications((prev) => [item, ...prev.slice(0, 9)]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrd = payload.new as any;
          const item: OrderNotificationItem = {
            id: 'ord-notif-upd-' + updatedOrd.id + '-' + Date.now(),
            orderId: updatedOrd.id,
            orderNumber: updatedOrd.order_number || `#${updatedOrd.id.slice(0, 6)}`,
            customerName: updatedOrd.customer_name || 'Customer',
            customerPhone: updatedOrd.customer_phone || '',
            totalAmount: updatedOrd.total_amount || 0,
            status: updatedOrd.status || 'pending',
            deliveryAddress: updatedOrd.delivery_address || '',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            event: 'STATUS_CHANGE'
          };
          setOrderNotifications((prev) => [item, ...prev.filter(i => i.orderId !== updatedOrd.id).slice(0, 8)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleLogoClick = () => {
    setIsMobileDrawerOpen(false);
    if (onLogoClick) {
      onLogoClick();
    } else {
      setActiveSection('menu');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSignInClick = (tab: 'signin' | 'register' = 'signin') => {
    setIsMobileDrawerOpen(false);
    if (onOpenAuth) {
      onOpenAuth(tab);
    } else {
      setAuthDefaultTab(tab);
      setIsAuthOpen(true);
    }
  };

  const handleLogout = async () => {
    setIsMenuDropdownOpen(false);
    setIsMobileDrawerOpen(false);
    await signOut();
    setActiveSection('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    setIsMobileDrawerOpen(false);
    setActiveSection('menu');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <>
      <header className="bg-[#121212]/95 backdrop-blur-md text-[#F7F2E8] sticky top-0 z-40 shadow-xl border-b border-[#C5A059]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo & Brand Container */}
            <div
              className="flex items-center gap-3 cursor-pointer group px-3 py-1.5 rounded-2xl bg-[#1A1A1A] border border-[#C5A059]/40 hover:border-[#C5A059] transition shadow-md"
              onClick={handleLogoClick}
            >
              <div className="w-11 h-11 rounded-xl bg-[#121212] border border-[#C5A059]/50 flex items-center justify-center p-1 overflow-hidden shadow-xs group-hover:scale-105 transition-transform shrink-0">
                {restaurantSettings.logo_url ? (
                  <img
                    src={restaurantSettings.logo_url}
                    alt={restaurantSettings.restaurant_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Utensils className="w-6 h-6 text-[#C5A059]" />
                )}
              </div>
              <div className="flex flex-col justify-center">
                <span className="block text-[9px] font-black text-[#C5A059] tracking-widest uppercase leading-tight">
                  {restaurantSettings.brand_title || 'CLOUD KITCHEN ERP'}
                </span>
                <span className="text-base sm:text-lg font-black tracking-tight text-white font-serif leading-tight">
                  {restaurantSettings.restaurant_name || "Trippy's Mehfill"}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Bar */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-gray-200">
              <button
                onClick={() => {
                  setActiveSection('menu');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-[#C5A059] hover:bg-[#1A1A1A] px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Home
              </button>

              <button
                onClick={() => scrollToSection('menu-section')}
                className="hover:text-[#C5A059] hover:bg-[#1A1A1A] px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Menu
              </button>

              <button
                onClick={() => scrollToSection('gallery-section')}
                className="hover:text-[#C5A059] hover:bg-[#1A1A1A] px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Gallery
              </button>

              <button
                onClick={() => scrollToSection('events-section')}
                className="hover:text-[#C5A059] hover:bg-[#1A1A1A] px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Events & Parties
              </button>

              <button
                onClick={() => scrollToSection('guesthouse-section')}
                className="hover:text-[#C5A059] hover:bg-[#1A1A1A] px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Guest House
              </button>

              <button
                onClick={() => scrollToSection('offers-section')}
                className="hover:text-[#C5A059] hover:bg-[#1A1A1A] px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Offers
              </button>

              <button
                onClick={() => scrollToSection('contact-section')}
                className="hover:text-[#C5A059] hover:bg-[#1A1A1A] px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Contact
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveSection('admin')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-black text-xs border transition cursor-pointer ${
                    activeSection === 'admin' ? 'bg-[#C5A059] text-black border-[#C5A059]' : 'bg-[#1A1A1A] text-[#C5A059] border-[#C5A059]/40 hover:bg-[#252525]'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Dashboard</span>
                </button>
              )}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3">

              {/* Order Now / Cart Button */}
              <button
                onClick={onOpenCart}
                className="relative px-3.5 py-2 bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-xl border border-[#FF5722] transition flex items-center gap-2 shadow-md cursor-pointer active:scale-95 font-extrabold text-xs"
                title="View Cart & Order"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Order Now</span>
                {totalCount > 0 && (
                  <span className="bg-white text-[#FF5722] font-black text-[11px] px-1.5 py-0.2 rounded-full shadow-xs">
                    {totalCount}
                  </span>
                )}
              </button>

              {/* Support Button */}
              <button
                onClick={() => setIsSupportOpen(true)}
                className="hidden sm:flex items-center gap-1.5 p-2.5 bg-[#1A1A1A] hover:bg-[#252525] text-gray-200 hover:text-[#C5A059] rounded-xl border border-[#333333] transition cursor-pointer text-xs font-bold"
                title="Help & Support"
              >
                <HelpCircle className="w-4 h-4 text-[#C5A059]" />
                <span className="hidden md:inline">Support</span>
              </button>

              {/* Realtime Admin Bell Notification */}
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setUnreadCount(0);
                    }}
                    className="p-2.5 bg-[#1A1A1A] hover:bg-[#252525] text-[#C5A059] rounded-xl border border-[#C5A059]/40 transition relative flex items-center gap-1 cursor-pointer"
                    title="Live Orders Realtime Center"
                  >
                    <Bell className="w-4 h-4 text-[#C5A059]" />
                    {unreadCount > 0 && (
                      <span className="bg-[#FF5722] text-white font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Live Order Dropdown */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#1A1A1A] text-[#F7F2E8] rounded-2xl shadow-2xl border border-[#C5A059]/40 p-4 z-50 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#333333] pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white text-xs font-serif">Live Orders Center</span>
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/40 uppercase">
                            Realtime Live
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {orderNotifications.length} orders
                        </span>
                      </div>

                      <div className="space-y-2 text-xs max-h-80 overflow-y-auto">
                        {orderNotifications.length === 0 ? (
                          <div className="p-5 text-center text-gray-400 text-xs font-medium">
                            No live orders placed yet.
                          </div>
                        ) : (
                          orderNotifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                setActiveSection('admin');
                                setIsNotificationsOpen(false);
                              }}
                              className="p-3 bg-[#222222] hover:bg-[#2A2A2A] rounded-xl border border-[#333333] space-y-1 cursor-pointer transition"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-[#FF5722] text-xs flex items-center gap-1">
                                  {notif.event === 'NEW_ORDER' ? '📦' : '🛵'} {notif.orderNumber}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">{notif.time}</span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-white">
                                <span className="font-bold truncate">{notif.customerName}</span>
                                <span className="font-extrabold text-[#C5A059]">₹{notif.totalAmount}</span>
                              </div>

                              <div className="flex items-center justify-between pt-1 text-[10px]">
                                <span className="text-gray-400 truncate max-w-[200px]">{notif.deliveryAddress}</span>
                                <span className="px-2 py-0.5 rounded-md font-mono font-bold uppercase text-[9px] bg-[#121212] text-[#C5A059] border border-[#C5A059]/30">
                                  {notif.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Auth Controls */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
                    className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#252525] px-3 py-1.5 rounded-xl border border-[#C5A059]/40 text-xs font-bold text-white cursor-pointer shadow-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#C5A059] text-black flex items-center justify-center font-black text-xs uppercase">
                      {user.full_name.charAt(0)}
                    </div>
                    <span className="max-w-[100px] truncate text-white hidden sm:inline">{user.full_name}</span>
                  </button>

                  {isMenuDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1A] text-gray-200 rounded-2xl shadow-2xl border border-[#C5A059]/40 py-2 z-50 text-xs space-y-1">
                      <div className="px-4 py-2 border-b border-[#333333]">
                        <p className="font-bold text-white truncate">{user.full_name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email || user.phone}</p>
                      </div>

                      {user.role === 'customer' && onOpenCustomerDashboard && (
                        <button
                          onClick={() => {
                            onOpenCustomerDashboard();
                            setIsMenuDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-[#252525] text-[#C5A059] font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <User className="w-4 h-4" /> My Profile & Dashboard
                        </button>
                      )}

                      {user.role === 'admin' && (
                        <button
                          onClick={() => { setActiveSection('admin'); setIsMenuDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-[#252525] text-[#C5A059] font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-4 h-4" /> Admin Dashboard
                        </button>
                      )}

                      {user.role === 'driver' && (
                        <button
                          onClick={() => { setActiveSection('driver'); setIsMenuDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-[#252525] text-[#C5A059] font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <Bike className="w-4 h-4" /> Driver Portal
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onOpenOrders();
                          setIsMenuDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#252525] text-white font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" /> Order History
                      </button>

                      <button
                        onClick={() => { setIsSupportOpen(true); setIsMenuDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-[#252525] text-white font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4" /> Support
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 hover:bg-red-950/40 text-red-400 font-bold flex items-center gap-2 border-t border-[#333333] pt-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" /> Logout Account
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => handleSignInClick('signin')}
                    className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-white font-extrabold rounded-xl text-xs border border-[#333333] hover:border-[#C5A059]/40 transition cursor-pointer"
                  >
                    Login
                  </button>

                  <button
                    onClick={() => handleSignInClick('register')}
                    className="px-4 py-2 bg-[#C5A059] hover:bg-[#b58f48] text-black font-extrabold rounded-xl text-xs shadow-md border border-[#C5A059] transition transform active:scale-95 cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {/* Mobile Hamburger Drawer Trigger */}
              <button
                onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
                className="lg:hidden p-2.5 bg-[#1A1A1A] hover:bg-[#252525] text-[#C5A059] rounded-xl border border-[#333333] transition cursor-pointer"
                title="Open Mobile Navigation"
              >
                {isMobileDrawerOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
              </button>

            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer Modal */}
        {isMobileDrawerOpen && (
          <div className="lg:hidden bg-[#1A1A1A] border-b border-[#C5A059]/30 px-4 py-5 space-y-4 text-sm font-bold text-gray-200 shadow-2xl">
            <div className="grid grid-cols-2 gap-2 pb-4 border-b border-[#333333]">
              <button
                onClick={() => {
                  setActiveSection('menu');
                  setIsMobileDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 p-2.5 bg-[#222222] rounded-xl hover:text-[#C5A059] border border-[#333333]"
              >
                <Home className="w-4 h-4 text-[#C5A059]" />
                <span>Home</span>
              </button>

              <button
                onClick={() => scrollToSection('menu-section')}
                className="flex items-center gap-2 p-2.5 bg-[#222222] rounded-xl hover:text-[#C5A059] border border-[#333333]"
              >
                <Utensils className="w-4 h-4 text-[#C5A059]" />
                <span>Menu</span>
              </button>

              <button
                onClick={() => scrollToSection('gallery-section')}
                className="flex items-center gap-2 p-2.5 bg-[#222222] rounded-xl hover:text-[#C5A059] border border-[#333333]"
              >
                <ImageIcon className="w-4 h-4 text-[#C5A059]" />
                <span>Gallery</span>
              </button>

              <button
                onClick={() => scrollToSection('events-section')}
                className="flex items-center gap-2 p-2.5 bg-[#222222] rounded-xl hover:text-[#C5A059] border border-[#333333]"
              >
                <Calendar className="w-4 h-4 text-[#C5A059]" />
                <span>Events</span>
              </button>

              <button
                onClick={() => scrollToSection('guesthouse-section')}
                className="flex items-center gap-2 p-2.5 bg-[#222222] rounded-xl hover:text-[#C5A059] border border-[#333333]"
              >
                <Bed className="w-4 h-4 text-[#C5A059]" />
                <span>Guest House</span>
              </button>

              <button
                onClick={() => scrollToSection('offers-section')}
                className="flex items-center gap-2 p-2.5 bg-[#222222] rounded-xl hover:text-[#C5A059] border border-[#333333]"
              >
                <Tag className="w-4 h-4 text-[#C5A059]" />
                <span>Offers</span>
              </button>

              <button
                onClick={() => scrollToSection('contact-section')}
                className="flex items-center gap-2 p-2.5 bg-[#222222] rounded-xl hover:text-[#C5A059] border border-[#333333] col-span-2"
              >
                <PhoneCall className="w-4 h-4 text-[#C5A059]" />
                <span>Contact & Location</span>
              </button>
            </div>

            {!user && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleSignInClick('signin')}
                  className="flex-1 py-2.5 bg-[#222222] text-white rounded-xl font-black text-center border border-[#333333]"
                >
                  Login
                </button>
                <button
                  onClick={() => handleSignInClick('register')}
                  className="flex-1 py-2.5 bg-[#C5A059] text-black rounded-xl font-black text-center shadow-md"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Modals */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        defaultTab={authDefaultTab}
        onClose={() => setIsAuthOpen(false)}
      />
    </>
  );
};
