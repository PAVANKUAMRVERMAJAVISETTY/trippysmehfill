import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ShoppingBag, User, LogOut, Shield, Bike, HelpCircle, Bell } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { SupportModal } from './SupportModal';
import { AppSection, UserRole } from '../../types';
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
  const { user, signOut, switchDemoRole } = useAuth();
  const { totalCount } = useCart();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'register'>('signin');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [orderNotifications, setOrderNotifications] = useState<OrderNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !user || (user.role !== 'admin' && user.role !== 'staff')) return;

    // 1. Fetch initial live orders from database table
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

    // 2. Listen to REAL-TIME live order inserts & updates from Supabase
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
    if (onLogoClick) {
      onLogoClick();
    } else {
      setActiveSection('menu');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSignInClick = (tab: 'signin' | 'register' = 'signin') => {
    if (onOpenAuth) {
      onOpenAuth(tab);
    } else {
      setAuthDefaultTab(tab);
      setIsAuthOpen(true);
    }
  };

  const handleLogout = async () => {
    setIsMenuDropdownOpen(false);
    await signOut();
    setActiveSection('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
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
      <header className="bg-[#0d0d0d]/95 backdrop-blur-md text-white sticky top-0 z-40 shadow-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo & Brand Title */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={handleLogoClick}
            >
              <div className="w-11 h-11 rounded-2xl bg-[#181818] border-2 border-[#C5A059] flex items-center justify-center p-1.5 shadow-lg group-hover:scale-105 transition-transform">
                <div className="text-center leading-none">
                  <div className="text-[9px] font-black text-[#C5A059] tracking-wider">TRIPPY'S</div>
                  <div className="text-[8px] font-bold text-gray-300">MEHFIL</div>
                </div>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-[#C5A059] tracking-widest uppercase">
                  CLOUD KITCHEN ERP
                </span>
                <span className="text-lg sm:text-xl font-black tracking-tight text-white font-serif">
                  Trippy's Mehfill
                </span>
              </div>
            </div>

            {/* Clean Top Navigation Bar (Gallery, Support, My Orders, Profile) */}
            <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-extrabold tracking-wide">
              <button
                onClick={() => scrollToSection('gallery-section')}
                className="text-gray-300 hover:text-[#C5A059] transition-colors py-1"
              >
                Gallery
              </button>

              <button
                onClick={() => setIsSupportOpen(true)}
                className="text-gray-300 hover:text-[#C5A059] transition-colors py-1 flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Support</span>
              </button>

              {user?.role === 'customer' && (
                <>
                  <button
                    onClick={onOpenOrders}
                    className="text-gray-300 hover:text-[#C5A059] transition-colors py-1 flex items-center gap-1"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>My Orders</span>
                  </button>

                  {onOpenCustomerDashboard && (
                    <button
                      onClick={onOpenCustomerDashboard}
                      className="text-gray-300 hover:text-[#C5A059] transition-colors py-1 flex items-center gap-1"
                    >
                      <User className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Profile</span>
                    </button>
                  )}
                </>
              )}

              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveSection('admin')}
                  className={`flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/40 text-[#C5A059] font-black text-xs transition ${
                    activeSection === 'admin' ? 'bg-[#C5A059] text-black' : 'hover:bg-[#C5A059]/20'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Dashboard</span>
                </button>
              )}
            </nav>

            {/* Right Side Action Controls */}
            <div className="flex items-center gap-2 sm:gap-3">

              {/* Shopping Cart Button */}
              {user?.role === 'customer' && (
                <button
                  onClick={onOpenCart}
                  className="relative p-2.5 bg-[#181818] hover:bg-white/10 text-white rounded-xl border border-[#C5A059]/30 transition flex items-center gap-1.5 shadow-md"
                >
                  <ShoppingBag className="w-4 h-4 text-[#C5A059]" />
                  <span className="hidden sm:inline text-xs font-bold">Cart</span>
                  {totalCount > 0 && (
                    <span className="bg-[#C5A059] text-black text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {totalCount}
                    </span>
                  )}
                </button>
              )}

              {/* Admin Live Notifications Bell Icon (Live Orders Only) */}
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setUnreadCount(0);
                    }}
                    className="p-2.5 bg-[#181818] hover:bg-white/10 text-[#C5A059] rounded-xl border border-[#C5A059]/30 transition relative flex items-center gap-1"
                    title="Live Orders Realtime Center"
                  >
                    <Bell className="w-4 h-4 text-[#C5A059]" />
                    {unreadCount > 0 && (
                      <span className="bg-orange-600 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Live Order Notification Dropdown Panel */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#121212] text-gray-200 rounded-2xl shadow-2xl border border-white/15 p-4 z-50 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white text-xs font-serif">Live Orders Center</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                            Realtime Live
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {orderNotifications.length} orders
                        </span>
                      </div>

                      <div className="space-y-2 text-xs max-h-80 overflow-y-auto">
                        {orderNotifications.length === 0 ? (
                          <div className="p-5 text-center text-gray-500 text-xs font-medium">
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
                              className="p-3 bg-[#181818] hover:bg-white/5 rounded-xl border border-white/5 space-y-1 cursor-pointer transition"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-orange-400 text-xs flex items-center gap-1">
                                  {notif.event === 'NEW_ORDER' ? '📦' : '🛵'} {notif.orderNumber}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">{notif.time}</span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-gray-300">
                                <span className="font-bold truncate">{notif.customerName}</span>
                                <span className="font-extrabold text-emerald-400">₹{notif.totalAmount}</span>
                              </div>

                              <div className="flex items-center justify-between pt-1 text-[10px]">
                                <span className="text-gray-400 truncate max-w-[200px]">{notif.deliveryAddress}</span>
                                <span className={`px-2 py-0.5 rounded-md font-mono font-bold uppercase text-[9px] ${
                                  notif.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                                  notif.status === 'cooking' ? 'bg-amber-500/20 text-amber-400' :
                                  notif.status === 'out_for_delivery' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-orange-500/20 text-orange-400'
                                }`}>
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

              {/* User Account Controls */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
                    className="flex items-center gap-2 bg-[#181818] hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-gray-200"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#C5A059] text-black flex items-center justify-center font-black text-xs uppercase">
                      {user.full_name.charAt(0)}
                    </div>
                    <span className="max-w-[100px] truncate">{user.full_name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#C5A059]/20 text-[#C5A059] font-black uppercase border border-[#C5A059]/30">
                      {user.role}
                    </span>
                  </button>

                  {isMenuDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-[#121212] text-gray-200 rounded-2xl shadow-2xl border border-white/15 py-2 z-50 text-xs space-y-1">
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="font-bold text-white truncate">{user.full_name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email || user.phone}</p>
                      </div>

                      {user.role === 'customer' && onOpenCustomerDashboard && (
                        <button
                          onClick={() => {
                            onOpenCustomerDashboard();
                            setIsMenuDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-[#C5A059] font-bold flex items-center gap-2"
                        >
                          <User className="w-4 h-4" /> My Profile & Dashboard
                        </button>
                      )}

                      {user.role === 'admin' && (
                        <button
                          onClick={() => { setActiveSection('admin'); setIsMenuDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-[#C5A059] font-bold flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" /> Admin Dashboard
                        </button>
                      )}

                      {user.role === 'driver' && (
                        <button
                          onClick={() => { setActiveSection('driver'); setIsMenuDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-[#C5A059] font-bold flex items-center gap-2"
                        >
                          <Bike className="w-4 h-4" /> Driver Portal
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onOpenOrders();
                          setIsMenuDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-300 font-bold flex items-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" /> Order History
                      </button>

                      <button
                        onClick={() => { setIsSupportOpen(true); setIsMenuDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-300 font-bold flex items-center gap-2"
                      >
                        <HelpCircle className="w-4 h-4" /> Support
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-400 font-bold flex items-center gap-2 border-t border-white/10 pt-2"
                      >
                        <LogOut className="w-4 h-4" /> Logout Account
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSignInClick('signin')}
                    className="px-3.5 py-2 bg-[#181818] hover:bg-white/10 text-white font-black rounded-xl text-xs border border-white/15 transition shadow-sm"
                  >
                    Login
                  </button>

                  <button
                    onClick={() => handleSignInClick('register')}
                    className="px-4 py-2 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-xl text-xs shadow-lg transition transform active:scale-95"
                  >
                    Sign Up
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Support Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        defaultTab={authDefaultTab}
        onClose={() => setIsAuthOpen(false)}
      />
    </>
  );
};
