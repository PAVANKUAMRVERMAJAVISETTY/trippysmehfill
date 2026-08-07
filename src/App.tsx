import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Header } from './components/common/Header';
import { NotificationBanner } from './components/common/NotificationBanner';
import { HeroSection } from './components/customer/HeroSection';
import { CategoryPills } from './components/customer/CategoryPills';
import { TodaysSpecials } from './components/customer/TodaysSpecials';
import { MenuCard } from './components/customer/MenuCard';
import { CartDrawer } from './components/customer/CartDrawer';
import { OrderTrackerModal } from './components/customer/OrderTrackerModal';
import { CustomerFeedbackModal } from './components/customer/CustomerFeedbackModal';
import { CustomerDashboardModal } from './components/customer/CustomerDashboardModal';
import { AuthModal } from './components/common/AuthModal';
import { ConfigErrorScreen, RequireRole } from './components/common/ProtectedRoute';
import { WhatsAppVerificationGate } from './components/common/WhatsAppVerificationGate';

// Admin Components
import { AdminHeaderNav, AdminTab } from './components/admin/AdminHeaderNav';
import { DashboardView } from './components/admin/DashboardView';
import { LiveOrdersView } from './components/admin/LiveOrdersView';
import { KitchenView } from './components/admin/KitchenView';
import { PendingRegistrationsView } from './components/admin/PendingRegistrationsView';
import { MenuManagerView } from './components/admin/MenuManagerView';
import { InventoryView } from './components/admin/InventoryView';
import { OrderHistoryView } from './components/admin/OrderHistoryView';
import { FeedbackView } from './components/admin/FeedbackView';
import { DriverStatsView } from './components/admin/DriverStatsView';
import { StaffDriversView } from './components/admin/StaffDriversView';
import { CustomersView } from './components/admin/CustomersView';
import { GalleryView } from './components/admin/GalleryView';
import { SettingsView } from './components/admin/SettingsView';

// Customer Components
import { GallerySection } from './components/customer/GallerySection';
import { OffersSection } from './components/customer/OffersSection';
import { RightOrderPanel } from './components/customer/RightOrderPanel';
import { AdminGuardView } from './components/admin/AdminGuardView';

// Driver Component
import { DriverView } from './components/driver/DriverView';

import {
  initialMenuItems,
  initialOrders,
  initialPendingRegistrations,
  initialStaffAndDrivers,
  initialCustomers,
  initialGalleryItems,
  initialInventory,
  initialFeedback,
  initialBanners
} from './lib/initialData';
import { FoodCategory, MenuItem, Order, OrderStatus, UserProfile, InventoryItem, Feedback, PromotionalBanner, GalleryItem } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { usePersistentState } from './lib/usePersistentState';

function MainApp() {
  const { user } = useAuth();
  
  // Navigation & Tabs
  const [activeSection, setActiveSection] = useState<'menu' | 'track' | 'admin' | 'kitchen' | 'driver'>('menu');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Customer View Filters
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Goenka University Campus - Gate 5');

  // App Data States (hydrated from and mirrored to localStorage)
  const [menuItems, setMenuItems] = usePersistentState<MenuItem[]>('trippys_menu', initialMenuItems);
  const [orders, setOrders] = usePersistentState<Order[]>('trippys_orders', initialOrders);
  const [pendingUsers, setPendingUsers] = usePersistentState<UserProfile[]>('trippys_pending', initialPendingRegistrations);
  const [staffList, setStaffList] = usePersistentState<UserProfile[]>('trippys_staff', initialStaffAndDrivers);
  const [customersList, setCustomersList] = usePersistentState<UserProfile[]>('trippys_customers', initialCustomers);
  const [galleryItems, setGalleryItems] = usePersistentState<GalleryItem[]>('trippys_gallery', initialGalleryItems);
  const [inventory, setInventory] = usePersistentState<InventoryItem[]>('trippys_inventory', initialInventory);
  const [feedback, setFeedback] = usePersistentState<Feedback[]>('trippys_feedback', initialFeedback);
  const [banners, setBanners] = usePersistentState<PromotionalBanner[]>('trippys_banners', initialBanners);

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCustomerDashboardOpen, setIsCustomerDashboardOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'register'>('signin');
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [feedbackOrder, setFeedbackOrder] = useState<Order | null>(null);

  // Load live data from Supabase if connected
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    async function loadSupabaseData() {
      try {
        const { data: menu } = await supabase.from('menu_items').select('*');
        if (menu && menu.length > 0) setMenuItems(menu as MenuItem[]);

        if (user && (user.role === 'admin' || user.role === 'staff')) {
          const { data: ords } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
          if (ords && ords.length > 0) setOrders(ords as Order[]);

          const { data: profs } = await supabase.from('profiles').select('*');
          if (profs && profs.length > 0) {
            const pending = profs.filter(p => !p.is_approved && p.role === 'customer');
            const team = profs.filter(p => p.role === 'admin' || p.role === 'staff' || p.role === 'driver');
            const custs = profs.filter(p => p.role === 'customer' && p.is_approved);
            setPendingUsers(pending as UserProfile[]);
            if (team.length > 0) setStaffList(team as UserProfile[]);
            if (custs.length > 0) setCustomersList(custs as UserProfile[]);
          }
        }
      } catch (err) {
        console.error('Supabase fetch error', err);
      }
    }

    loadSupabaseData();
  }, [user]);

  // Ensure default landing page is ALWAYS 'menu' (Home Page) on mount
  useEffect(() => {
    setActiveSection('menu');
  }, []);

  // Guarantee that unauthenticated users are always kept on 'menu' (Home Page)
  useEffect(() => {
    if (!user) {
      if (activeSection !== 'menu') {
        setActiveSection('menu');
      }
    } else if (user.role === 'admin' && activeSection === 'menu') {
      // If admin logs in, switch to admin dashboard
      setActiveSection('admin');
    }
  }, [user]);

  // Logo Click Handler: Navigates to home/menu, resets filters, scrolls up, opens sign in if unauthenticated
  const handleLogoClick = () => {
    setActiveSection('menu');
    setSearchQuery('');
    setSelectedCategory('All');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!user) {
      setIsAuthModalOpen(true);
    }
  };

  // Re-fetch profiles from Supabase to guarantee state synchronization
  const refreshProfilesFromSupabase = async () => {
    if (!isSupabaseConfigured || !user) return;
    try {
      const { data: profs, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.error('[App] Failed to refresh profiles:', error.message);
        return;
      }
      if (profs) {
        const pending = profs.filter(p => !p.is_approved && p.role === 'customer');
        const team = profs.filter(p => p.role === 'admin' || p.role === 'staff' || p.role === 'driver');
        const custs = profs.filter(p => p.role === 'customer' && p.is_approved);
        setPendingUsers(pending as UserProfile[]);
        setStaffList(team as UserProfile[]);
        setCustomersList(custs as UserProfile[]);
      }
    } catch (err) {
      console.error('[App] Error re-fetching profiles:', err);
    }
  };

  // Handlers
  const handleOrderPlaced = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    setActiveTrackingOrder(newOrder);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, driverId?: string, driverName?: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status,
            ...(driverId ? { driver_id: driverId } : {}),
            ...(driverName ? { driver_name: driverName } : {})
          };
        }
        return o;
      })
    );

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('orders').update({
        status,
        ...(driverId ? { driver_id: driverId } : {}),
        ...(driverName ? { driver_name: driverName } : {})
      }).eq('id', orderId);

      if (error) {
        console.error('Failed to update order status in Supabase:', error.message);
      }
    }
  };

  const handleApproveUser = async (userId: string) => {
    const userToApprove = pendingUsers.find(u => u.id === userId);

    // CRITICAL: Immediately update local state so card disappears instantly
    setPendingUsers(prev => prev.filter(u => u.id !== userId));

    if (userToApprove) {
      if (userToApprove.role === 'customer') {
        setCustomersList(prev => [...prev, { ...userToApprove, is_approved: true }]);
      } else {
        setStaffList(prev => [...prev, { ...userToApprove, is_approved: true }]);
      }
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
      if (error) {
        console.error('Failed to approve user in Supabase:', error.message);
      } else {
        await refreshProfilesFromSupabase();
      }
    }
  };

  const handleRejectUser = async (userId: string) => {
    // CRITICAL: Immediately update local state so card disappears instantly
    setPendingUsers(prev => prev.filter(u => u.id !== userId));
    setCustomersList(prev => prev.filter(u => u.id !== userId));

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) {
        console.error('Failed to delete profile from Supabase:', error.message);
      } else {
        await refreshProfilesFromSupabase();
      }
    }
  };

  // Filtered menu dishes for customer storefront
  const filteredDishes = menuItems.filter((dish) => {
    const matchesCategory =
      selectedCategory === 'All' ? true :
      selectedCategory === 'Veg' ? dish.is_veg :
      selectedCategory === 'Non-Veg' ? !dish.is_veg :
      dish.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      (dish.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dish.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const todaysSpecials = menuItems.filter(m => m.is_todays_special && m.is_available);
  const drivers = staffList.filter(s => s.role === 'driver');

  return (
    <div className="min-h-screen bg-[#080808] text-gray-200 font-sans flex flex-col antialiased">
      
      {/* Top Closed Banner Notification if kitchen closed */}
      <NotificationBanner />

      {/* Primary Header */}
      <Header
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => setIsCustomerDashboardOpen(true)}
        onOpenCustomerDashboard={() => setIsCustomerDashboardOpen(true)}
        onLogoClick={handleLogoClick}
        onOpenAuth={(tab = 'signin') => {
          setAuthModalTab(tab);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Admin ERP Sub-Navigation Header */}
      {activeSection === 'admin' && user?.role === 'admin' && (
        <AdminHeaderNav
          activeTab={adminTab}
          setActiveTab={setAdminTab}
          pendingCount={pendingUsers.length}
        />
      )}

      {/* SECTION ROUTING */}

      {/* 1. STOREFRONT MENU VIEW */}
      {activeSection === 'menu' && (
        <main className="flex-1 pb-16">
          <HeroSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            onLogoClick={handleLogoClick}
          />

          {/* Promotional Discount Codes & Offers Section */}
          <OffersSection />

          {/* Interactive Public Gallery Section with Fullscreen Lightbox Zoom */}
          <GallerySection galleryItems={galleryItems} />

          {/* Category Pills & Main Food Menu Section with Persistent Right-Side Order Summary Panel */}
          <div id="menu-section" className="pt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CategoryPills
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Unauthenticated User Prompt Banner */}
            {!user && (
              <div className="max-w-2xl mx-auto my-6">
                <div className="bg-[#181818] border border-orange-500/30 rounded-3xl p-6 text-center shadow-xl space-y-3">
                  <p className="text-sm sm:text-base font-extrabold text-white">
                    Sign in or Register to view prices and place an order.
                  </p>
                  <button
                    onClick={() => {
                      setAuthModalTab('signin');
                      setIsAuthModalOpen(true);
                    }}
                    className="px-8 py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-sm rounded-2xl shadow-lg transition transform active:scale-95"
                  >
                    Sign In to Order
                  </button>
                </div>
              </div>
            )}

            {/* Split Main Area: Left Menu & Right Sticky Live Order Summary Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-6">
              
              {/* Left Column: Specials & Menu Items */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-8">
                {/* Today's Specials */}
                {!searchQuery && selectedCategory === 'All' && (
                  <TodaysSpecials
                    specials={todaysSpecials}
                    onRequireAuth={() => {
                      setAuthModalTab('signin');
                      setIsAuthModalOpen(true);
                    }}
                  />
                )}

                {/* Main Menu Grid */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#C5A059] font-serif mb-4 tracking-wide">
                    Today's Menu
                  </h2>

                  {filteredDishes.length === 0 ? (
                    <div className="text-center py-12 bg-[#121212] rounded-2xl border border-white/10 shadow-xl">
                      <p className="text-gray-200 font-bold">No dishes found matching your search.</p>
                      <p className="text-xs text-gray-500 mt-1">Try searching for "biryani" or selecting another category.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {filteredDishes.map((dish) => (
                        <MenuCard
                          key={dish.id}
                          item={dish}
                          onRequireAuth={() => {
                            setAuthModalTab('signin');
                            setIsAuthModalOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Sticky Live Order Summary & Checkout Panel */}
              <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
                <RightOrderPanel
                  onOrderSuccess={handleOrderPlaced}
                  onRequireAuth={() => {
                    setAuthModalTab('signin');
                    setIsAuthModalOpen(true);
                  }}
                  existingOrders={orders}
                />
              </div>

            </div>
          </div>
        </main>
      )}

      {/* 2. ADMIN ERP MODULE (STRICTLY ADMIN ONLY) */}
      {activeSection === 'admin' && (
        user?.role === 'admin' ? (
          <main className="flex-1 pb-16">
            {adminTab === 'dashboard' && <DashboardView orders={orders} feedback={feedback} />}
            {adminTab === 'live_orders' && (
              <LiveOrdersView orders={orders} drivers={drivers} onUpdateOrderStatus={handleUpdateOrderStatus} />
            )}
            {adminTab === 'kitchen' && (
              <KitchenView orders={orders} onUpdateOrderStatus={handleUpdateOrderStatus} />
            )}
            {adminTab === 'registrations' && (
              <PendingRegistrationsView pendingUsers={pendingUsers} onApprove={handleApproveUser} onReject={handleRejectUser} />
            )}
            {adminTab === 'menu' && (
              <MenuManagerView
                menuItems={menuItems}
                onSaveDish={(dish) => setMenuItems(prev => {
                  const exists = prev.some(m => m.id === dish.id);
                  return exists ? prev.map(m => m.id === dish.id ? dish : m) : [dish, ...prev];
                })}
                onDeleteDish={(id) => setMenuItems(prev => prev.filter(m => m.id !== id))}
                onToggleAvailable={(id) => setMenuItems(prev => prev.map(m => m.id === id ? { ...m, is_available: !m.is_available } : m))}
                onToggleSpecial={(id) => setMenuItems(prev => prev.map(m => m.id === id ? { ...m, is_todays_special: !m.is_todays_special } : m))}
              />
            )}
            {adminTab === 'gallery' && (
              <GalleryView
                galleryItems={galleryItems}
                onAddGalleryItem={(item) => setGalleryItems(prev => [item, ...prev])}
                onUpdateGalleryItem={(item) => setGalleryItems(prev => prev.map(g => g.id === item.id ? item : g))}
                onDeleteGalleryItem={(id) => setGalleryItems(prev => prev.filter(g => g.id !== id))}
              />
            )}
            {adminTab === 'inventory' && (
              <InventoryView
                inventory={inventory}
                menuItems={menuItems}
                onUpdateQuantity={(id, delta) => setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))}
                onAddStockItem={(item) => setInventory(prev => [item, ...prev])}
              />
            )}
            {adminTab === 'history' && <OrderHistoryView orders={orders} drivers={drivers} />}
            {adminTab === 'feedback' && <FeedbackView feedback={feedback} />}
            {adminTab === 'driver_stats' && <DriverStatsView drivers={drivers} orders={orders} />}
            {adminTab === 'staff' && (
              <StaffDriversView
                staffList={staffList}
                onAddStaff={(s) => setStaffList(prev => [...prev, s])}
                onToggleActive={(id) => setStaffList(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s))}
                onDeleteStaff={(id) => setStaffList(prev => prev.filter(s => s.id !== id))}
              />
            )}
            {adminTab === 'customers' && (
              <CustomersView
                customersList={customersList}
                onAddCustomer={(c) => setCustomersList(prev => [...prev, c])}
                onToggleActive={(id) => setCustomersList(prev => prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c))}
                onDeleteCustomer={(id) => {
                  setCustomersList(prev => prev.filter(c => c.id !== id));
                  if (isSupabaseConfigured) {
                    supabase.from('profiles').delete().eq('id', id);
                  }
                }}
              />
            )}
            {adminTab === 'settings' && (
              <SettingsView
                banners={banners}
                onAddBanner={(b) => setBanners(prev => [b, ...prev])}
              />
            )}
          </main>
        ) : (
          <AdminGuardView
            onRequireAuth={() => {
              setAuthModalTab('signin');
              setIsAuthModalOpen(true);
            }}
            onGoToMenu={() => setActiveSection('menu')}
          />
        )
      )}

      {/* 3. DRIVER PORTAL (drivers and admins only) */}
      {activeSection === 'driver' && (
        <main className="flex-1 pb-16">
          <RequireRole
            roles={['driver', 'admin']}
            onRequestSignIn={() => {
              setAuthModalTab('signin');
              setIsAuthModalOpen(true);
            }}
          >
            <DriverView orders={orders} onUpdateOrderStatus={handleUpdateOrderStatus} />
          </RequireRole>
        </main>
      )}

      {/* GLOBAL MODALS */}
      <CartDrawer
        isOpen={isCartOpen}
        existingOrders={orders}
        onClose={() => setIsCartOpen(false)}
        onRequireAuth={() => {
          setAuthModalTab('signin');
          setIsAuthModalOpen(true);
        }}
        onOrderSuccess={handleOrderPlaced}
      />

      <OrderTrackerModal
        isOpen={Boolean(activeTrackingOrder)}
        order={activeTrackingOrder}
        onClose={() => setActiveTrackingOrder(null)}
        onLeaveFeedback={(ord) => setFeedbackOrder(ord)}
      />

      <CustomerFeedbackModal
        isOpen={Boolean(feedbackOrder)}
        order={feedbackOrder}
        onClose={() => setFeedbackOrder(null)}
        onSubmitSuccess={(fb) => setFeedback(prev => [fb, ...prev])}
      />

      <CustomerDashboardModal
        isOpen={isCustomerDashboardOpen}
        onClose={() => setIsCustomerDashboardOpen(false)}
        orders={orders}
        menuItems={menuItems}
        onTrackOrder={(ord) => {
          setIsCustomerDashboardOpen(false);
          setActiveTrackingOrder(ord);
        }}
        onOpenSupport={() => {
          setIsCustomerDashboardOpen(false);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        defaultTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
        onRegisterSuccess={(newCustomer) => setCustomersList(prev => [newCustomer, ...prev])}
      />

      {/* Footer */}
      <footer className="bg-[#080808] text-gray-400 text-xs py-10 px-4 border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#181818] border border-[#C5A059] flex items-center justify-center p-1 shadow-md">
                <div className="text-center leading-none">
                  <div className="text-[8px] font-black text-[#C5A059]">TRIPPY'S</div>
                  <div className="text-[7px] font-bold text-white">MEHFIL</div>
                </div>
              </div>
              <div>
                <span className="text-sm font-black text-white font-serif tracking-tight">TRIPPY'S MEHFIL</span>
                <p className="text-[10px] text-[#C5A059] font-bold uppercase tracking-widest">CLOUD KITCHEN ERP</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Authentic Indian cloud kitchen delivering fresh, flavourful meals to your doorstep & hostel gates.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <p className="text-xs font-black text-white uppercase tracking-wider font-serif">Quick Links</p>
            <ul className="space-y-1.5 text-xs text-gray-300">
              <li>
                <button onClick={() => { setActiveSection('menu'); setTimeout(() => document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="hover:text-[#C5A059] transition">
                  Gallery
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveSection('menu'); setTimeout(() => document.getElementById('offers-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="hover:text-[#C5A059] transition">
                  Offers
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveSection('menu'); setTimeout(() => document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="hover:text-[#C5A059] transition">
                  Menu
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-2">
            <p className="text-xs font-black text-white uppercase tracking-wider font-serif">Contact</p>
            <div className="space-y-1.5 text-xs text-gray-300 font-mono">
              <p>📞 +91 85699 55929</p>
              <p>✉️ trippysmehfill.kitchen@gmail.com</p>
              <p className="text-gray-500 text-[11px] font-sans">📍 Sohna GLS Homes, Near GD Goenka University (GDGU), Sohna, Haryana</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-white/10 text-center text-[11px] text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 Trippy's Mehfill. All rights reserved.</p>
          <p className="text-[#C5A059]">Sohna GLS Homes (Near GDGU, Haryana) Cloud Kitchen & Food Delivery Service</p>
        </div>
      </footer>

    </div>
  );
}

/**
 * Blocks the app with an actionable message when Supabase credentials are
 * missing, rather than letting every auth call fail with an opaque error.
 */
function AppGate() {
  const { isConfigured, configError } = useAuth();

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-neutral-950 py-24">
        <ConfigErrorScreen error={configError} />
      </div>
    );
  }

  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppGate />
      </CartProvider>
    </AuthProvider>
  );
}
