import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { PresenceProvider, usePresence } from './context/PresenceContext';
import { RestaurantSettingsProvider, useRestaurantSettings } from './context/RestaurantSettingsContext';
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
import { LiveCustomersModal } from './components/admin/LiveCustomersModal';
import { AuthModal } from './components/common/AuthModal';
import { ConfigErrorScreen, RequireRole } from './components/common/ProtectedRoute';

// Admin Components
import { AdminHeaderNav, AdminTab } from './components/admin/AdminHeaderNav';
import { DashboardView } from './components/admin/DashboardView';
import { LiveOrdersView } from './components/admin/LiveOrdersView';
import { PaymentVerificationView } from './components/admin/PaymentVerificationView';
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
import { CheckoutView } from './components/customer/CheckoutView';
import { MyOrdersView } from './components/customer/MyOrdersView';
import { ToastHost } from './components/common/ToastHost';
import { statusToastCopy, paymentToastCopy } from './lib/orderStatus';
import { AdminGuardView } from './components/admin/AdminGuardView';
import { ClosedHomepageBanner } from './components/customer/ClosedHomepageBanner';
import { ClosedRestaurantModal } from './components/customer/ClosedRestaurantModal';

// Driver Component
import { DriverView } from './components/driver/DriverView';

import {
  initialMenuItems,
  initialGalleryItems,
  initialInventory,
  initialBanners
} from './lib/initialData';
import { AppSection, FoodCategory, MenuItem, Order, OrderStatus, PaymentStatus, UserProfile, InventoryItem, Feedback, PromotionalBanner, GalleryItem, HomePromotion, Offer } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { playKitchenAlertSound } from './lib/sound';
import {
  menuService,
  ordersService,
  inventoryService,
  feedbackService,
  galleryService,
  bannersService,
  homeContentService,
  offersService,
  realtimeService,
} from './services/supabase';

function MainApp() {
  const { user } = useAuth();
  // Both branches destructured useCart() for different things: `settings` for
  // the restaurant open/closed gate, `cart` for the header badge. Both are used
  // further down, so both are taken.
  const { cart, settings } = useCart();
  const { restaurantSettings } = useRestaurantSettings();
  const { showToast } = useToast();
  const cartItemCount = cart.length;
  
  // Navigation & Tabs
  const [activeSection, setActiveSection] = useState<AppSection>('menu');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Closed restaurant modal state
  const [isClosedModalOpen, setIsClosedModalOpen] = useState(false);

  // Auto-open closed restaurant modal whenever settings.is_open transitions to false
  useEffect(() => {
    if (!settings.is_open) {
      setIsClosedModalOpen(true);
    } else {
      setIsClosedModalOpen(false);
    }
  }, [settings.is_open]);

  // Customer View Filters
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Goenka University Campus - Gate 5');

  // App Data States (Initialized from initial data fallbacks, hydrated via Supabase)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);

  // People and orders start EMPTY, never seeded.
  //
  // These were previously seeded from initialData, so before Supabase
  // responded -- or whenever it failed to -- the admin dashboard, Live Orders,
  // Kitchen and Payment Verification all displayed fabricated customers and
  // orders: "Utfi - Keity", "Rakesh Ranjan", "Sajid", "Shruti". The owner saw
  // orders that do not exist, and the kitchen could have tried to cook them.
  //
  // An empty list is the honest state before real data arrives. The menu keeps
  // its fallback because that is the restaurant's own content, not a record of
  // a person or a transaction.
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [customersList, setCustomersList] = useState<UserProfile[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(initialGalleryItems);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [banners, setBanners] = useState<PromotionalBanner[]>(initialBanners);
  const [homePromotions, setHomePromotions] = useState<HomePromotion[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Presence Context Hook
  const { liveCount, setIsLiveModalOpen, updateCurrentActivity } = usePresence();

  // Keep presence activity aligned with activeSection
  useEffect(() => {
    const activityMap: Record<string, string> = {
      menu: 'Browsing Menu',
      checkout: 'Checkout',
      orders: 'Order Tracking'
    };
    updateCurrentActivity(activityMap[activeSection] || 'Active on website');
  }, [activeSection, updateCurrentActivity]);

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCustomerDashboardOpen, setIsCustomerDashboardOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'register'>('signin');
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [feedbackOrder, setFeedbackOrder] = useState<Order | null>(null);

  // Last status each of the customer's orders was observed in, so status toasts
  // fire on transitions rather than on every refetch.
  const seenOrderStatuses = useRef<Map<string, OrderStatus>>(new Map());
  const hasSeededOrderStatuses = useRef(false);

  // Same, for payment settlement -- "Payment received and verified." must fire
  // on the transition, not on every list refresh that still says 'completed'.
  const seenPaymentStatuses = useRef<Map<string, PaymentStatus>>(new Map());
  const hasSeededPaymentStatuses = useRef(false);

  // Load live data from Supabase Services
  const loadAllSupabaseData = async () => {
    if (!isSupabaseConfigured) return;

    try {
      const [
        fetchedMenu,
        fetchedOrders,
        fetchedInventory,
        fetchedFeedback,
        fetchedGallery,
        fetchedBanners,
        fetchedHomePromos,
        fetchedOffers,
      ] = await Promise.all([
        menuService.fetchMenuItems().catch(() => null),
        ordersService.fetchOrders().catch(() => null),
        inventoryService.fetchInventory().catch(() => null),
        feedbackService.fetchFeedback().catch(() => null),
        galleryService.fetchGalleryItems().catch(() => null),
        bannersService.fetchBanners().catch(() => null),
        homeContentService.fetchHomePromotions().catch(() => null),
        offersService.fetchOffers().catch(() => null),
      ]);

      if (fetchedMenu && fetchedMenu.length > 0) setMenuItems(fetchedMenu);
      if (fetchedOrders && fetchedOrders.length > 0) setOrders(fetchedOrders);
      if (fetchedInventory && fetchedInventory.length > 0) setInventory(fetchedInventory);
      if (fetchedFeedback && fetchedFeedback.length > 0) setFeedback(fetchedFeedback);
      if (fetchedGallery && fetchedGallery.length > 0) setGalleryItems(fetchedGallery);
      if (fetchedBanners && fetchedBanners.length > 0) setBanners(fetchedBanners);
      if (fetchedHomePromos && fetchedHomePromos.length > 0) setHomePromotions(fetchedHomePromos);
      if (fetchedOffers && fetchedOffers.length > 0) setOffers(fetchedOffers);

      // Fetch Profile Roles & Pending Registrations
      const { data: profs } = await supabase.from('profiles').select('*');
      if (profs && profs.length > 0) {
        const pending = profs.filter((p: any) => !p.is_approved && p.role === 'customer');
        const team = profs.filter((p: any) => p.role === 'admin' || p.role === 'staff' || p.role === 'driver');
        const custs = profs.filter((p: any) => p.role === 'customer' && p.is_approved);
        setPendingUsers(pending as UserProfile[]);
        if (team.length > 0) setStaffList(team as UserProfile[]);
        if (custs.length > 0) setCustomersList(custs as UserProfile[]);
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
    }
  };

  useEffect(() => {
    loadAllSupabaseData();
  }, []);

  // Realtime Postgres Subscriptions for Live ERP Order & Inventory Queue Updates.
  //
  // Keyed on the signed-in identity, not [] -- postgres_changes events are
  // filtered by RLS against the token the socket joined with, so a channel
  // opened while anonymous stays anonymous. An admin signing in after mount
  // would have received nothing on it. Re-joining on identity change gives each
  // role a channel that can actually see its rows.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const ordersChannel = realtimeService.subscribeToOrders((payload) => {
      // Audible alert for the kitchen on a new order, kept from the other
      // branch. It rides on this subscription rather than a second channel of
      // its own: two subscriptions to public.orders would handle every event
      // twice, and the duplicate lacked the [user?.id] re-join above that lets
      // the socket see rows under the signed-in role's RLS.
      if (payload?.eventType === 'INSERT') playKitchenAlertSound();

      ordersService.fetchOrders().then((updatedOrders) => {
        if (updatedOrders) setOrders(updatedOrders);
      }).catch(console.error);
    });

    const inventoryChannel = realtimeService.subscribeToInventory(() => {
      inventoryService.fetchInventory().then((updatedInventory) => {
        if (updatedInventory) setInventory(updatedInventory);
      }).catch(console.error);
    });

    return () => {
      realtimeService.unsubscribe(ordersChannel);
      realtimeService.unsubscribe(inventoryChannel);
    };
  }, [user?.id]);

  // Toast the customer when one of their own orders moves on. Keyed by
  // order+status so a refetch that returns the same rows does not re-announce
  // what they have already been told.
  useEffect(() => {
    if (!user || user.role !== 'customer') return;

    const seen = seenOrderStatuses.current;
    const mine = orders.filter(o => o.customer_id === user.id);

    // The first pass after signing in records where each order already stands
    // without announcing it. Otherwise opening the app would fire "Delivered"
    // for every order the customer has ever received.
    if (!hasSeededOrderStatuses.current) {
      for (const order of mine) seen.set(order.id, order.status);
      hasSeededOrderStatuses.current = true;
      return;
    }

    for (const order of mine) {
      const previous = seen.get(order.id);
      seen.set(order.id, order.status);

      // A brand new order announces itself from the checkout page, not here.
      if (previous === undefined || previous === order.status) continue;

      const copy = statusToastCopy(order.status);
      if (!copy) continue;

      showToast({
        title: copy.title,
        description: `${order.order_number} — ${copy.description}`,
        tone: order.status === 'cancelled' ? 'error' : 'success',
        key: `status-${order.id}-${order.status}`
      });
    }
  }, [orders, user, showToast]);

  // The same treatment for payment settlement. Kept separate from the status
  // effect because the two move independently: an admin can verify a transfer
  // long before the kitchen accepts, and a customer needs to hear about each.
  useEffect(() => {
    if (!user || user.role !== 'customer') return;

    const seen = seenPaymentStatuses.current;
    const mine = orders.filter(o => o.customer_id === user.id);

    // As above: the first pass records where things stand without announcing,
    // otherwise every previously-verified order would toast on sign-in.
    if (!hasSeededPaymentStatuses.current) {
      for (const order of mine) seen.set(order.id, order.payment_status);
      hasSeededPaymentStatuses.current = true;
      return;
    }

    for (const order of mine) {
      const previous = seen.get(order.id);
      seen.set(order.id, order.payment_status);

      if (previous === undefined || previous === order.payment_status) continue;

      const copy = paymentToastCopy(order.payment_status);
      if (!copy) continue;

      showToast({
        title: copy.title,
        description: `${order.order_number} — ${copy.description}`,
        tone: copy.tone,
        key: `payment-${order.id}-${order.payment_status}`
      });
    }
  }, [orders, user, showToast]);

  // Live tracking: the tracker holds the order it was opened with, which would
  // otherwise stay frozen at the moment it was opened. Re-read it from the
  // realtime-updated list so the customer watches it progress.
  //
  // Compared field by field rather than by reference: `orders` is rebuilt on
  // every refetch, so an identity check would reset state on each poll, and
  // checking `status` alone would leave a payment verification invisible to
  // anyone with the tracker already open -- which is the whole point of Phase 3.
  useEffect(() => {
    if (!activeTrackingOrder) return;
    const fresh = orders.find(o => o.id === activeTrackingOrder.id);
    if (!fresh) return;
    if (
      fresh.status !== activeTrackingOrder.status ||
      fresh.payment_status !== activeTrackingOrder.payment_status ||
      fresh.payment_rejection_reason !== activeTrackingOrder.payment_rejection_reason ||
      fresh.driver_name !== activeTrackingOrder.driver_name
    ) {
      setActiveTrackingOrder(fresh);
    }
  }, [orders, activeTrackingOrder]);

  // The mount-time load runs before anyone has signed in, so the admin-only
  // rows (orders, profiles) come back empty under RLS. Re-load once a session
  // exists so staff and admins see their data without a refresh.
  useEffect(() => {
    if (!user) return;
    loadAllSupabaseData();
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
      setActiveSection('admin');
    }
  }, [user]);

  // Where a customer lands after signing in. Coming from the cart they should
  // resume checkout rather than be dropped back on the menu to find it again;
  // signing up with nothing in the cart has no checkout to resume.
  const routeAfterAuth = () => {
    if (cartItemCount > 0) {
      setActiveSection('checkout');
    } else {
      setActiveSection('menu');
    }
    setIsAuthModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Logo Click Handler
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

  // Handlers wired to Supabase Data Layer
  // Optimistic local insert so the order shows up immediately for the customer
  // who placed it. Every other client -- admin, kitchen -- gets it from the
  // realtime subscription instead. The checkout page owns the confirmation
  // screen, so the tracker is no longer forced open here.
  const handleOrderPlaced = (newOrder: Order) => {
    setOrders(prev => (prev.some(o => o.id === newOrder.id) ? prev : [newOrder, ...prev]));
  };

  // The other branch's second public.orders subscription is deliberately absent.
  // It duplicated the realtimeService channel above, which already re-joins on
  // identity change so the socket sees rows under the signed-in role's RLS. Its
  // one unique behaviour, the kitchen alert sound, was moved into that channel.
  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    driverId?: string,
    driverName?: string,
    driverPhone?: string,
    paymentStatus?: PaymentStatus
  ) => {
    // Kept so the write can be rolled back if the database refuses it. The
    // optimistic update previously stayed on screen after a failure, so an
    // admin saw "Delivered" while the row still said something else.
    const previous = orders.find(o => o.id === orderId);


    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status,
            ...(driverId ? { driver_id: driverId } : {}),
            ...(driverName ? { driver_name: driverName } : {}),
            ...(driverPhone ? { driver_phone: driverPhone } : {}),
            ...(paymentStatus ? { payment_status: paymentStatus } : {})
          };
        }
        return o;
      })
    );

    try {
      if (driverId && driverName) {
        // Pass the status through. Without it assignDriver forced 'assigned',
        // so "Mark Delivered" with a driver selected never actually delivered.
        await ordersService.assignDriver(orderId, driverId, driverName, driverPhone || '', status);
      } else {
        await ordersService.updateOrderStatus(orderId, status);
      }

      // Settlement goes through the guarded service calls, never a raw
      // update({ payment_status }) as the other branch did here. Those calls
      // are constrained to rows still in 'pending', so a second click cannot
      // re-settle an order, and they leave the audit columns to the database
      // trigger -- which stamps the admin it actually saw rather than whatever
      // the client claimed. Sending payment_status straight from the client is
      // exactly the path the live tests prove a customer must not have.
      if (paymentStatus === 'completed') {
        await ordersService.verifyPayment(orderId);
      } else if (paymentStatus === 'rejected') {
        await ordersService.rejectPayment(orderId);
      }
    } catch (err) {
      console.error('Error updating order status in Supabase:', err);

      // Put the row back the way the database still has it, and say so. A
      // silent revert on the next refetch looks like the button did nothing.
      if (previous) {
        setOrders(prev => prev.map(o => (o.id === orderId ? previous : o)));
      }
      showToast({
        title: 'Could not update the order',
        description: err instanceof Error ? err.message : 'The database rejected the change. Nothing was saved.',
        tone: 'error',
        key: `order-update-failed-${orderId}`
      });
    }
  };

  // Admin payment verification. The optimistic local write is only a latency
  // hide -- the service resolves with the row the database actually stored, and
  // that authoritative version replaces it. Realtime delivers the same change
  // to every other client.
  const applyOrderPatch = (updated: Order) => {
    setOrders(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o)));
  };

  const handleVerifyPayment = async (orderId: string) => {
    const updated = await ordersService.verifyPayment(orderId);
    applyOrderPatch(updated);
  };

  const handleRejectPayment = async (orderId: string, reason?: string) => {
    const updated = await ordersService.rejectPayment(orderId, reason);
    applyOrderPatch(updated);
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

  const handleToggleStaffActive = async (userId: string) => {
    const target = staffList.find(s => s.id === userId);
    if (!target) return;

    const newIsActive = !target.is_active;

    setStaffList(prev => prev.map(s => s.id === userId ? { ...s, is_active: newIsActive } : s));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_active: newIsActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          console.error('Failed to update staff status in Supabase:', error.message);
          setStaffList(prev => prev.map(s => s.id === userId ? { ...s, is_active: target.is_active } : s));
        } else {
          await refreshProfilesFromSupabase();
        }
      } catch (err) {
        console.error('Error updating staff status:', err);
        setStaffList(prev => prev.map(s => s.id === userId ? { ...s, is_active: target.is_active } : s));
      }
    }
  };

  const handleDeleteStaff = async (userId: string) => {
    setStaffList(prev => prev.filter(s => s.id !== userId));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) {
          console.error('Failed to delete staff profile from Supabase:', error.message);
          await refreshProfilesFromSupabase();
        } else {
          await refreshProfilesFromSupabase();
        }
      } catch (err) {
        console.error('Error deleting staff profile:', err);
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
    <div className="min-h-screen bg-[#F4F1E8] text-[#1F2933] font-sans flex flex-col antialiased">
      
      {/* Top Closed Banner Notification if kitchen closed */}
      <NotificationBanner />

      {/* Primary Header */}
      <Header
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => {
          setActiveSection('orders');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCustomerDashboard={() => setIsCustomerDashboardOpen(true)}
        onLogoClick={handleLogoClick}
        onOpenAuth={(tab = 'signin') => {
          setAuthModalTab(tab);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Global Blue Homepage Banner when Restaurant is CLOSED */}
      <ClosedHomepageBanner
        settings={settings}
        onOpenClosedModal={() => setIsClosedModalOpen(true)}
      />

      {/* Admin ERP Sub-Navigation Header */}
      {activeSection === 'admin' && user?.role === 'admin' && (
        <AdminHeaderNav
          activeTab={adminTab}
          setActiveTab={setAdminTab}
          pendingCount={pendingUsers.length}
          pendingPaymentsCount={
            orders.filter(o => o.payment_method === 'UPI' && o.payment_status === 'pending').length
          }
          liveCount={liveCount}
          onOpenLiveCustomers={() => setIsLiveModalOpen(true)}
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
            promotions={homePromotions}
          />

          {/* Dynamic Active Promotional Banners Section */}
          {banners.filter(b => b.is_active).length > 0 && (
            <section className="py-6 bg-[#F4F1E8] border-b border-[#DDD6C8]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
                {banners.filter(b => b.is_active).map((banner) => (
                  <div key={banner.id} className="bg-white rounded-3xl overflow-hidden border-2 border-[#B8862D]/40 hover:border-[#B8862D] shadow-md grid grid-cols-1 md:grid-cols-12 items-center transition-all">
                    <div className="md:col-span-5 aspect-video md:aspect-auto h-48 md:h-56 overflow-hidden bg-[#F7F4EC] relative">
                      <img src={banner.poster_url} alt={banner.title} className="w-full h-full object-cover object-center select-none" />
                    </div>
                    <div className="md:col-span-7 p-6 space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF0CC] text-[#8A5A00] text-xs font-black uppercase rounded-lg border border-[#E8C66A]">
                        <span>🔥 Special Promotion</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-[#1F2933] font-serif leading-tight">{banner.title}</h3>
                      {banner.link_url && (
                        <a
                          href={banner.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold text-xs rounded-xl shadow-sm border border-[#B94D00] transition cursor-pointer"
                        >
                          <span>View Special Offer</span>
                          <span>→</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Promotional Discount Codes & Offers Section */}
          <OffersSection offers={offers} />

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
                    items={todaysSpecials}
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
                  onRequireAuth={() => {
                    setAuthModalTab('signin');
                    setIsAuthModalOpen(true);
                  }}
                  onProceedToCheckout={() => {
                    setActiveSection('checkout');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>

            </div>
          </div>
        </main>
      )}

      {/* 1b. CHECKOUT (signed-in customers only) */}
      {activeSection === 'checkout' && user && (
        <CheckoutView
          existingOrders={orders}
          onOrderPlaced={handleOrderPlaced}
          onTrackOrder={(order) => setActiveTrackingOrder(order)}
          onBackToMenu={() => {
            setActiveSection('menu');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* 1c. MY ORDERS (signed-in customers only) */}
      {activeSection === 'orders' && user && (
        <MyOrdersView
          orders={orders.filter(o => o.customer_id === user.id)}
          menuItems={menuItems}
          onTrackOrder={(order) => setActiveTrackingOrder(order)}
          onOrderCancelled={(orderId) =>
            setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: 'cancelled' } : o)))
          }
          onBackToMenu={() => {
            setActiveSection('menu');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onGoToCheckout={() => {
            setActiveSection('checkout');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* 2. ADMIN ERP MODULE (STRICTLY ADMIN ONLY) */}
      {activeSection === 'admin' && (
        user?.role === 'admin' ? (
          <main className="flex-1 pb-16">
            {adminTab === 'dashboard' && (
              <DashboardView
                orders={orders}
                feedback={feedback}
                drivers={drivers}
                inventory={inventory}
              />
            )}
            {adminTab === 'live_orders' && (
              <LiveOrdersView orders={orders} drivers={drivers} onUpdateOrderStatus={handleUpdateOrderStatus} />
            )}
            {adminTab === 'payments' && (
              <PaymentVerificationView
                orders={orders}
                onVerifyPayment={handleVerifyPayment}
                onRejectPayment={handleRejectPayment}
              />
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
                onSaveDish={async (dish) => {
                  try {
                    if (dish.id?.startsWith('m-')) {
                      const { id, ...rest } = dish;
                      const created = await menuService.createMenuItem(rest as any);
                      setMenuItems(prev => [created, ...prev]);
                      showToast({ title: 'Dish Created', description: `"${created.name}" has been added to menu.`, tone: 'success' });
                    } else {
                      const updated = await menuService.updateMenuItem(dish.id, dish);
                      setMenuItems(prev => prev.map(m => m.id === updated.id ? updated : m));
                      showToast({ title: 'Dish Updated', description: `"${updated.name}" has been updated.`, tone: 'success' });
                    }
                  } catch (err: any) {
                    console.error('Failed to save dish in Supabase:', err);
                    showToast({ title: 'Error Saving Dish', description: err.message || 'Database error', tone: 'error' });
                  }
                }}
                onDeleteDish={async (id) => {
                  try {
                    await menuService.deleteMenuItem(id);
                    setMenuItems(prev => prev.filter(m => m.id !== id));
                    showToast({ title: 'Dish Retired', description: 'Item disabled on menu.', tone: 'info' });
                  } catch (err: any) {
                    console.error('Failed to delete dish:', err);
                    showToast({ title: 'Delete Failed', description: err.message, tone: 'error' });
                  }
                }}
                onToggleAvailable={async (id) => {
                  const dish = menuItems.find(m => m.id === id);
                  if (!dish) return;
                  const nextAvail = !dish.is_available;
                  setMenuItems(prev => prev.map(m => m.id === id ? { ...m, is_available: nextAvail } : m));
                  try {
                    await menuService.updateMenuItem(id, { is_available: nextAvail });
                  } catch (err) {
                    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, is_available: dish.is_available } : m));
                  }
                }}
                onToggleSpecial={async (id) => {
                  const dish = menuItems.find(m => m.id === id);
                  if (!dish) return;
                  const nextSpecial = !dish.is_todays_special;
                  setMenuItems(prev => prev.map(m => m.id === id ? { ...m, is_todays_special: nextSpecial } : m));
                  try {
                    await menuService.updateMenuItem(id, { is_todays_special: nextSpecial });
                  } catch (err) {
                    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, is_todays_special: dish.is_todays_special } : m));
                  }
                }}
              />
            )}
            {adminTab === 'gallery' && (
              <GalleryView
                galleryItems={galleryItems}
                onAddGalleryItem={async (item) => {
                  try {
                    const created = await galleryService.addGalleryItem({ title: item.title, caption: item.caption, image_url: item.image_url });
                    setGalleryItems(prev => [created, ...prev]);
                    showToast({ title: 'Gallery Item Added', description: `"${created.title}" published.`, tone: 'success' });
                  } catch (err: any) {
                    console.error('Failed to add gallery item:', err);
                    showToast({ title: 'Gallery Upload Failed', description: err.message, tone: 'error' });
                  }
                }}
                onUpdateGalleryItem={async (item) => {
                  try {
                    const updated = await galleryService.updateGalleryItem(item.id, item);
                    setGalleryItems(prev => prev.map(g => g.id === updated.id ? updated : g));
                    showToast({ title: 'Gallery Item Updated', description: 'Changes saved to Supabase.', tone: 'success' });
                  } catch (err: any) {
                    console.error('Failed to update gallery item:', err);
                    showToast({ title: 'Update Failed', description: err.message, tone: 'error' });
                  }
                }}
                onDeleteGalleryItem={async (id) => {
                  try {
                    await galleryService.deleteGalleryItem(id);
                    setGalleryItems(prev => prev.filter(g => g.id !== id));
                    showToast({ title: 'Gallery Item Deleted', description: 'Item removed from database.', tone: 'info' });
                  } catch (err: any) {
                    console.error('Failed to delete gallery item:', err);
                    showToast({ title: 'Delete Failed', description: err.message, tone: 'error' });
                  }
                }}
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
            {adminTab === 'driver_stats' && (
              <DriverStatsView
                drivers={drivers}
                orders={orders}
                onToggleActive={handleToggleStaffActive}
              />
            )}
            {adminTab === 'staff' && (
              <StaffDriversView
                staffList={staffList}
                onAddStaff={(s) => {
                  setStaffList(prev => [...prev.filter(item => item.id !== s.id), s]);
                  refreshProfilesFromSupabase();
                }}
                onToggleActive={handleToggleStaffActive}
                onDeleteStaff={handleDeleteStaff}
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
                onAddBanner={async (b) => {
                  try {
                    const created = await bannersService.createBanner({ title: b.title, poster_url: b.poster_url, link_url: b.link_url, is_active: b.is_active });
                    setBanners(prev => [created, ...prev]);
                    showToast({ title: 'Banner Published', description: `"${created.title}" is live.`, tone: 'success' });
                  } catch (err: any) {
                    console.error('Failed to create banner:', err);
                    showToast({ title: 'Banner Publish Failed', description: err.message, tone: 'error' });
                  }
                }}
                onDeleteBanner={async (id) => {
                  try {
                    await bannersService.deleteBanner(id);
                    setBanners(prev => prev.filter(b => b.id !== id));
                    showToast({ title: 'Banner Deleted', description: 'Banner removed.', tone: 'info' });
                  } catch (err: any) {
                    console.error('Failed to delete banner:', err);
                  }
                }}
                homePromotions={homePromotions}
                onAddHomePromotion={async (promo) => {
                  try {
                    const created = await homeContentService.createHomePromotion(promo);
                    setHomePromotions(prev => [...prev, created]);
                    showToast({ title: 'Home Promo Published', description: `"${created.title}" is now on Home Page.`, tone: 'success' });
                  } catch (err: any) {
                    console.error('Failed to create home promo:', err);
                    showToast({ title: 'Publish Failed', description: err.message, tone: 'error' });
                  }
                }}
                onUpdateHomePromotion={async (id, updates) => {
                  try {
                    const updated = await homeContentService.updateHomePromotion(id, updates);
                    setHomePromotions(prev => prev.map(h => h.id === id ? updated : h));
                    showToast({ title: 'Home Promo Updated', description: 'Changes saved.', tone: 'success' });
                  } catch (err: any) {
                    console.error('Failed to update home promo:', err);
                    showToast({ title: 'Update Failed', description: err.message, tone: 'error' });
                  }
                }}
                onDeleteHomePromotion={async (id) => {
                  try {
                    await homeContentService.deleteHomePromotion(id);
                    setHomePromotions(prev => prev.filter(h => h.id !== id));
                    showToast({ title: 'Promo Deleted', description: 'Removed from Home Page.', tone: 'info' });
                  } catch (err: any) {
                    console.error('Failed to delete home promo:', err);
                  }
                }}
                offers={offers}
                onAddOffer={async (offer) => {
                  try {
                    const created = await offersService.createOffer(offer);
                    setOffers(prev => [...prev, created]);
                    showToast({ title: 'Offer Published', description: `Code ${created.code} is now active.`, tone: 'success' });
                  } catch (err: any) {
                    console.error('Failed to create offer:', err);
                    showToast({ title: 'Offer Creation Failed', description: err.message, tone: 'error' });
                  }
                }}
                onUpdateOffer={async (id, updates) => {
                  try {
                    const updated = await offersService.updateOffer(id, updates);
                    setOffers(prev => prev.map(o => o.id === id ? updated : o));
                    showToast({ title: 'Offer Updated', description: 'Changes saved.', tone: 'success' });
                  } catch (err: any) {
                    console.error('Failed to update offer:', err);
                    showToast({ title: 'Update Failed', description: err.message, tone: 'error' });
                  }
                }}
                onDeleteOffer={async (id) => {
                  try {
                    await offersService.deleteOffer(id);
                    setOffers(prev => prev.filter(o => o.id !== id));
                    showToast({ title: 'Offer Deleted', description: 'Offer removed.', tone: 'info' });
                  } catch (err: any) {
                    console.error('Failed to delete offer:', err);
                  }
                }}
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
        onClose={() => setIsCartOpen(false)}
        onRequireAuth={() => {
          setAuthModalTab('signin');
          setIsAuthModalOpen(true);
        }}
        onProceedToCheckout={() => {
          setActiveSection('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
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
        onRegisterSuccess={(newCustomer) => {
          setCustomersList(prev => [newCustomer, ...prev]);
          routeAfterAuth();
        }}
      />

      {/* Live Customers Presence Panel Modal for Admin */}
      <LiveCustomersModal />

      {/* Global Fullscreen Closed Restaurant Popup Modal */}
      <ClosedRestaurantModal
        isOpen={isClosedModalOpen}
        onClose={() => setIsClosedModalOpen(false)}
        settings={settings}
      />

      {/* Dynamic Redesigned 4-Column Footer */}
      <footer className="bg-[#0B0F17] border-t border-white/10 text-white py-12 px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#141A24] border border-[#C5A059]/40 flex items-center justify-center p-1 overflow-hidden shadow-md shrink-0">
                {restaurantSettings.logo_url ? (
                  <img
                    src={restaurantSettings.logo_url}
                    alt={restaurantSettings.restaurant_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center leading-none">
                    <div className="text-[8px] font-black text-[#C5A059] tracking-wider">TRIPPY'S</div>
                    <div className="text-[7px] font-bold text-white">MEHFIL</div>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-[#C5A059] block tracking-widest uppercase truncate">
                  {restaurantSettings.brand_title || 'CLOUD KITCHEN ERP'}
                </span>
                <span className="text-base font-black text-white font-serif tracking-tight truncate block">
                  {restaurantSettings.restaurant_name || "Trippy's Mehfill"}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Authentic Indian cloud kitchen delivering fresh, flavourful meals to your doorstep & hostel gates.
            </p>
            <p className="text-gray-400 text-xs flex items-start gap-1.5 pt-1">
              <span className="text-[#C5A059] font-bold shrink-0">📍 Location:</span>
              <span className="line-clamp-2">{restaurantSettings.address}</span>
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <p className="text-xs font-black text-white uppercase tracking-wider font-serif border-b border-white/10 pb-1.5 inline-block">
              Quick Links
            </p>
            <ul className="space-y-2 text-xs text-gray-300">
              <li>
                <button
                  onClick={() => { setActiveSection('menu'); setTimeout(() => document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                  className="hover:text-[#C5A059] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-[#C5A059] text-[10px]">›</span> Gallery
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActiveSection('menu'); setTimeout(() => document.getElementById('offers-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                  className="hover:text-[#C5A059] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-[#C5A059] text-[10px]">›</span> Offers
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActiveSection('menu'); setTimeout(() => document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                  className="hover:text-[#C5A059] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-[#C5A059] text-[10px]">›</span> Menu
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActiveSection('menu'); setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100); }}
                  className="hover:text-[#C5A059] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-[#C5A059] text-[10px]">›</span> Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Information */}
          <div className="space-y-3">
            <p className="text-xs font-black text-white uppercase tracking-wider font-serif border-b border-white/10 pb-1.5 inline-block">
              Contact Information
            </p>
            <div className="space-y-2 text-xs text-gray-300">
              <p className="font-mono flex items-center gap-1.5">
                <span>📞 Phone:</span>
                <span className="font-bold text-white">{restaurantSettings.contact_phone}</span>
              </p>
              <p className="flex items-center gap-1.5 flex-wrap">
                <span>📱 WhatsApp:</span>
                {(() => {
                  const raw = restaurantSettings.whatsapp_numbers || '6301196547 / 9030196547';
                  const parts = raw.split(/[\/\,\&]+/).map(p => p.trim()).filter(Boolean);
                  const nums = parts.length > 0 ? parts : ['6301196547', '9030196547'];
                  return nums.map((num, idx) => {
                    const digits = num.replace(/\D/g, '');
                    const waNum = digits.length === 10 ? `91${digits}` : digits;
                    return (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span>/</span>}
                        <a
                          href={`https://wa.me/${waNum}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#C5A059] font-mono font-bold hover:underline"
                        >
                          {num}
                        </a>
                      </React.Fragment>
                    );
                  });
                })()}
              </p>
              <p className="truncate flex items-center gap-1.5">
                <span>✉️ Email:</span>
                <a href="mailto:trippysmehfill.kitchen@gmail.com" className="text-gray-300 hover:text-white transition">
                  trippysmehfill.kitchen@gmail.com
                </a>
              </p>
              <p className="text-gray-400 text-[11px] pt-1 leading-relaxed">
                <span className="text-[#C5A059] font-bold">Address:</span> {restaurantSettings.address}
              </p>
            </div>
          </div>

          {/* Column 4: Website Information */}
          <div className="space-y-3">
            <p className="text-xs font-black text-white uppercase tracking-wider font-serif border-b border-white/10 pb-1.5 inline-block">
              Website Information
            </p>
            <div className="space-y-2 text-xs text-gray-300">
              <p className="text-white font-bold">
                Created by: <span className="text-[#C5A059]">Naga Pavan Kumar</span>
              </p>
              <p className="text-gray-400 text-[11px]">For website-related support/contact:</p>
              <div className="space-y-1.5 font-mono text-xs pt-0.5">
                {(() => {
                  const raw = restaurantSettings.whatsapp_numbers || '6301196547 / 9030196547';
                  const parts = raw.split(/[\/\,\&]+/).map(p => p.trim()).filter(Boolean);
                  const nums = parts.length > 0 ? parts : ['6301196547', '9030196547'];
                  return nums.map((num, idx) => {
                    const digits = num.replace(/\D/g, '');
                    const waNum = digits.length === 10 ? `91${digits}` : digits;
                    return (
                      <p key={idx} className="flex items-center gap-1.5">
                        <span>WhatsApp:</span>
                        <a
                          href={`https://wa.me/${waNum}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#C5A059] hover:underline font-bold"
                        >
                          {num}
                        </a>
                      </p>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

        </div>

        {/* Footer Bottom Credit Bar */}
        <div className="max-w-7xl mx-auto pt-6 mt-8 border-t border-white/10 text-center text-[11px] text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 {restaurantSettings.restaurant_name || "Trippy's Mehfill"}. All rights reserved.</p>
          <p className="text-gray-400 font-medium">
            Designed & Developed by <span className="text-[#C5A059] font-bold">Naga Pavan Kumar</span>
          </p>
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
      <PresenceProvider>
        <RestaurantSettingsProvider>
          <CartProvider>
            <ToastProvider>
              <AppGate />
              <ToastHost />
            </ToastProvider>
          </CartProvider>
        </RestaurantSettingsProvider>
      </PresenceProvider>
    </AuthProvider>
  );
}
