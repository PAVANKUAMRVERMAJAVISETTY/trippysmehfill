import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Order, MenuItem } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { openWhatsAppSupport } from '../../lib/whatsapp';
import {
  User,
  ShoppingBag,
  MapPin,
  Gift,
  Wallet,
  Award,
  Heart,
  Share2,
  HelpCircle,
  Star,
  Sparkles,
  Check,
  Clock,
  ChevronRight,
  X,
  Copy,
  RefreshCw,
  Flame,
  Truck,
  LogOut,
  ShieldAlert,
  Smartphone,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  FileText,
  Printer,
  Download,
  Repeat,
  CheckCircle2,
  Utensils,
  Store,
  AlertCircle,
  Receipt,
  ThumbsUp
} from 'lucide-react';

interface CustomerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  menuItems: MenuItem[];
  onTrackOrder: (order: Order) => void;
  onOpenSupport: () => void;
}

type TabType =
  | 'overview'
  | 'orders'
  | 'live_tracking'
  | 'wallet_rewards'
  | 'coupons'
  | 'addresses'
  | 'referral'
  | 'profile';

export const CustomerDashboardModal: React.FC<CustomerDashboardModalProps> = ({
  isOpen,
  onClose,
  orders,
  menuItems,
  onTrackOrder,
  onOpenSupport
}) => {
  const { user, signOut, updateProfile } = useAuth();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter state for orders
  const [orderFilter, setOrderFilter] = useState<'all' | 'delivered' | 'active'>('all');

  // Sub-modal states
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [givenRating, setGivenRating] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  // Password & Profile Management states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');

  const [passUpdateError, setPassUpdateError] = useState<string | null>(null);
  const [passUpdateSuccess, setPassUpdateSuccess] = useState<string | null>(null);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Editable Profile Form state
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editAddress, setEditAddress] = useState(user?.hostel_address || '');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Editable Address state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [hostelName, setHostelName] = useState(user?.hostel_name || 'GD Goenka University Campus');
  const [roomNumber, setRoomNumber] = useState(user?.room_number || '');
  const [towerBlock, setTowerBlock] = useState(user?.tower_block || '');
  const [addressLandmark, setAddressLandmark] = useState(user?.landmark || '');
  const [deliveryNotes, setDeliveryNotes] = useState(user?.delivery_notes || '');
  const [isDefaultAddress, setIsDefaultAddress] = useState(true);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  if (!isOpen || !user) return null;

  // Show quick toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSuccessMsg(null);
    setIsSavingAddress(true);

    try {
      const fullAddressParts = [];
      if (hostelName.trim()) fullAddressParts.push(hostelName.trim());
      if (towerBlock.trim()) fullAddressParts.push(towerBlock.trim());
      if (roomNumber.trim()) fullAddressParts.push(`Room ${roomNumber.trim()}`);
      if (addressLandmark.trim()) fullAddressParts.push(`Landmark: ${addressLandmark.trim()}`);
      if (deliveryNotes.trim()) fullAddressParts.push(`Notes: ${deliveryNotes.trim()}`);

      const fullHostelAddress = fullAddressParts.length > 0
        ? fullAddressParts.join(', ')
        : 'Goenka University Campus - Hostel Gate 5';

      await updateProfile({
        hostel_address: fullHostelAddress,
        hostel_name: hostelName,
        room_number: roomNumber,
        tower_block: towerBlock,
        landmark: addressLandmark,
        delivery_notes: deliveryNotes,
        is_default_address: isDefaultAddress
      });

      setAddressSuccessMsg('✅ Default delivery address updated successfully! Future orders will automatically use this address.');
      triggerToast('Default Address Saved!');
      setIsEditingAddress(false);
    } catch (err: any) {
      alert('Failed to save delivery address: ' + (err?.message || 'Error occurred'));
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Filter orders for current user
  const customerOrders = orders.filter(
    (o) => o.customer_id === user.id || o.customer_phone === user.phone || o.customer_name === user.full_name
  );

  const activeOrder = customerOrders.find(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );

  const filteredOrders = customerOrders.filter((ord) => {
    if (orderFilter === 'active') return ord.status !== 'delivered' && ord.status !== 'cancelled';
    if (orderFilter === 'delivered') return ord.status === 'delivered';
    return true;
  });

  // Favorite / Recommended dishes
  const recommendedDishes = menuItems.slice(0, 4);

  const availableCoupons = [
    { code: 'TRIPPY50', discount: '50% OFF up to ₹100', minSpend: '₹199', desc: 'Welcome special offer for food lovers' },
    { code: 'HOSTELFEAST', discount: 'Flat ₹75 OFF', minSpend: '₹299', desc: 'Hostel bulk order discount code' },
    { code: 'MEHFIL100', discount: '₹100 Cashback in Wallet', minSpend: '₹499', desc: 'Weekend Mehfil Biryani Treat' }
  ];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    triggerToast(`Coupon ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyReferral = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedReferral(true);
    triggerToast(`Referral code ${code} copied!`);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  // REORDER FUNCTION (Swiggy / Zomato style Repeat Order)
  const handleReorder = (ord: Order) => {
    if (!ord.items || ord.items.length === 0) return;
    let addedCount = 0;
    ord.items.forEach((item) => {
      // Find matching item in menu
      const match = menuItems.find(
        (m) => m.id === item.dish_id || m.name.toLowerCase() === item.dish_name.toLowerCase()
      );
      if (match) {
        for (let q = 0; q < item.quantity; q++) {
          addToCart(match);
        }
        addedCount += item.quantity;
      } else {
        // Synthesize fallback MenuItem
        const fallbackItem: MenuItem = {
          id: item.dish_id || 'm-' + Date.now(),
          name: item.dish_name,
          description: 'Reordered item from past order #' + ord.order_number,
          price: item.price,
          category: 'Biryani',
          image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
          is_veg: item.is_veg ?? false,
          is_available: true,
          is_todays_special: false
        };
        for (let q = 0; q < item.quantity; q++) {
          addToCart(fallbackItem);
        }
        addedCount += item.quantity;
      }
    });

    triggerToast(`🛒 Added ${addedCount} items from Order #${ord.order_number} to your cart!`);
  };

  // PASSWORD STRENGTH CALCULATION
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-gray-700' };
    if (pass.length < 6) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    let score = 1;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  // HANDLE PASSWORD UPDATE
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassUpdateError(null);
    setPassUpdateSuccess(null);

    if (!newPassInput) {
      setPassUpdateError('Please enter a new password.');
      return;
    }
    if (newPassInput.length < 6) {
      setPassUpdateError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setPassUpdateError('New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPass(true);
    try {
      // 1. If Supabase is configured, update auth password
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ password: newPassInput });
        if (error) {
          throw new Error(error.message);
        }
      }

      // 2. Update user profile state
      await updateProfile({ password: newPassInput });

      setPassUpdateSuccess('✅ Password updated successfully! Your account is secured with the new password.');
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      triggerToast('Password changed successfully!');
    } catch (err: any) {
      setPassUpdateError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  // HANDLE PROFILE DETAILS UPDATE
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    try {
      await updateProfile({
        full_name: editName,
        phone: editPhone,
        email: editEmail,
        hostel_address: editAddress
      });
      setProfileSuccessMsg('Profile details updated successfully!');
      triggerToast('Profile updated!');
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message);
    }
  };

  const strength = getPasswordStrength(newPassInput);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6 overflow-y-auto">
      
      {/* Toast Popup Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#C5A059] text-black font-extrabold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-amber-300 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-[#121212] border border-white/15 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden text-white my-auto flex flex-col md:flex-row max-h-[92vh] relative">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-[#0d0d0d] p-4 sm:p-5 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between shrink-0">
          <div className="space-y-5">
            
            {/* User Profile Card */}
            <div className="flex items-center gap-3 p-3 bg-[#181818] rounded-2xl border border-white/10">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#C5A059] to-amber-300 text-black flex items-center justify-center font-black text-lg shadow-md shrink-0">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-extrabold text-white text-sm truncate font-serif">{user.full_name}</h3>
                <p className="text-[10px] text-gray-400 truncate">{user.phone}</p>
                <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-[#C5A059]/20 text-[#C5A059] text-[9px] font-black uppercase border border-[#C5A059]/30">
                  <Award className="w-3 h-3" />
                  <span>Gold Member</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Dashboard Overview', icon: Sparkles },
                { id: 'orders', label: 'Order History', icon: ShoppingBag, badge: customerOrders.length },
                { id: 'live_tracking', label: 'Live Order Tracker', icon: Truck, activePulse: Boolean(activeOrder) },
                { id: 'wallet_rewards', label: 'Wallet & Loyalty', icon: Wallet, val: `₹${user.wallet_balance || 0}` },
                { id: 'coupons', label: 'Coupons & Discounts', icon: Gift },
                { id: 'addresses', label: 'Delivery Location', icon: MapPin },
                { id: 'referral', label: 'Refer & Get 25% OFF', icon: Share2 },
                { id: 'profile', label: 'Profile & Security', icon: User, badgeText: 'Password' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition ${
                      isActive
                        ? 'bg-[#C5A059] text-black shadow-lg shadow-[#C5A059]/20'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>

                    {tab.badge !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isActive ? 'bg-black text-[#C5A059]' : 'bg-white/10 text-gray-300'
                      }`}>
                        {tab.badge}
                      </span>
                    )}

                    {tab.badgeText && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                        isActive ? 'bg-black text-[#C5A059]' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {tab.badgeText}
                      </span>
                    )}

                    {tab.activePulse && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}

                    {tab.val && (
                      <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-black' : 'text-[#C5A059]'}`}>
                        {tab.val}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Logout */}
          <div className="pt-4 border-t border-white/10 mt-4 space-y-2">
            <button
              onClick={() => openWhatsAppSupport({ name: user.full_name, phone: user.phone })}
              className="w-full py-2 px-3 bg-[#181818] hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl flex items-center gap-2 border border-white/10 transition text-left"
            >
              <HelpCircle className="w-4 h-4 text-[#C5A059]" />
              <span>WhatsApp Customer Support</span>
            </button>

            <button
              onClick={() => {
                onClose();
                signOut();
              }}
              className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-2 border border-rose-500/30 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout Account</span>
            </button>
          </div>
        </div>

        {/* Main Panel Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-serif tracking-tight capitalize">
                {activeTab === 'orders' ? 'Order History & Reorder' : activeTab.replace('_', ' ')}
              </h2>
              <p className="text-xs text-gray-400">
                {activeTab === 'orders'
                  ? 'Track your orders, view tax receipts & repeat past orders.'
                  : activeTab === 'profile'
                  ? 'View login password, update password & manage personal details.'
                  : 'Manage your orders, rewards, addresses & account security.'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Active Live Order Banner */}
              {activeOrder ? (
                <div className="bg-gradient-to-r from-amber-600/20 via-orange-500/10 to-[#181818] border border-amber-500/40 rounded-3xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                      <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Order In Progress</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-300">Order #{activeOrder.order_number}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-white text-base">Status: {activeOrder.status.toUpperCase()}</h4>
                      <p className="text-xs text-gray-300 mt-0.5">{activeOrder.items?.map(i => `${i.quantity}x ${i.dish_name || (i as any).menuItem?.name || 'Dish'}`).join(', ')}</p>
                    </div>

                    <button
                      onClick={() => onTrackOrder(activeOrder)}
                      className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Live Order Tracking</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#181818] rounded-3xl p-5 border border-white/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-sm">No Active Orders Right Now</h4>
                    <p className="text-xs text-gray-400">Order authentic dum biryani & starters delivered fresh to your hostel.</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-xs rounded-xl shadow-md transition"
                  >
                    Browse Menu
                  </button>
                </div>
              )}

              {/* Quick Password & Security Quickcard */}
              <div className="bg-gradient-to-r from-orange-950/40 via-[#181818] to-gray-900 border border-orange-500/30 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl border border-orange-500/30">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs">Security & Login Credentials</h4>
                    <p className="text-[11px] text-gray-400">View your login phone & update account password anytime.</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('profile')}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-[#181818] rounded-2xl p-4 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
                  <p className="text-2xl font-black text-white">{customerOrders.length}</p>
                </div>

                <div className="bg-[#181818] rounded-2xl p-4 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Wallet Balance</p>
                  <p className="text-2xl font-black text-[#C5A059]">₹{user.wallet_balance || 0}</p>
                </div>

                <div className="bg-[#181818] rounded-2xl p-4 border border-white/10 space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Loyalty Points</p>
                  <p className="text-2xl font-black text-amber-400">450 pts</p>
                </div>
              </div>

              {/* Recommended Foods */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-[#C5A059] uppercase tracking-wider font-serif">
                  Recommended For You
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendedDishes.map((dish) => (
                    <div key={dish.id} className="bg-[#181818] p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={dish.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                        <div>
                          <h4 className="font-bold text-white text-xs line-clamp-1">{dish.name}</h4>
                          <span className="text-xs font-black text-[#C5A059]">₹{dish.price}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          addToCart(dish);
                          triggerToast(`Added ${dish.name} to cart!`);
                        }}
                        className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-xs rounded-xl transition"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SWIGGY / ZOMATO STYLE ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              
              {/* Order Filter Pills */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOrderFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      orderFilter === 'all' ? 'bg-[#C5A059] text-black' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    All Orders ({customerOrders.length})
                  </button>
                  <button
                    onClick={() => setOrderFilter('delivered')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      orderFilter === 'delivered' ? 'bg-[#C5A059] text-black' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    Delivered
                  </button>
                  <button
                    onClick={() => setOrderFilter('active')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      orderFilter === 'active' ? 'bg-[#C5A059] text-black' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    Active / In Progress
                  </button>
                </div>

                <span className="text-xs text-gray-400 hidden sm:inline">
                  Showing {filteredOrders.length} orders
                </span>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-[#181818] rounded-3xl border border-white/10 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-[#C5A059] mx-auto opacity-50" />
                  <p className="font-bold text-white text-sm">No orders found in this category</p>
                  <p className="text-xs text-gray-400">Order fresh dum biryani & starters to get started!</p>
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 bg-[#C5A059] text-black font-extrabold text-xs rounded-2xl shadow-lg"
                  >
                    Explore Food Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-[#181818] rounded-3xl border border-white/10 overflow-hidden shadow-lg hover:border-[#C5A059]/40 transition space-y-0"
                    >
                      {/* Order Card Header */}
                      <div className="p-4 sm:p-5 bg-black/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
                            <Store className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-white text-sm">Trippy's Mehfill Cloud Kitchen</h4>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#C5A059]" />
                              <span>Gachibowli Hub • Order #{ord.order_number}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            ord.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            ord.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                          }`}>
                            {ord.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-mono text-gray-400">{ord.created_at || 'Today'}</span>
                        </div>
                      </div>

                      {/* Order Itemized Body */}
                      <div className="p-4 sm:p-5 space-y-3">
                        
                        {/* Dishes list */}
                        <div className="space-y-2 border-b border-white/10 pb-3">
                          {ord.items?.map((item, i) => {
                            const isVeg = item.is_veg ?? true;
                            return (
                              <div key={i} className="flex items-center justify-between text-xs font-medium">
                                <div className="flex items-center gap-2">
                                  {/* Veg / Non-Veg Indicator */}
                                  <span className={`w-3.5 h-3.5 border flex items-center justify-center rounded-sm shrink-0 ${
                                    isVeg ? 'border-emerald-500' : 'border-red-500'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                  </span>

                                  <span className="text-white font-extrabold">{item.quantity} x</span>
                                  <span className="text-gray-200">{item.dish_name || (item as any).menuItem?.name || 'Special Dish'}</span>
                                </div>

                                <span className="font-mono text-gray-300">
                                  ₹{(item.price || (item as any).menuItem?.price || 0) * item.quantity}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Order Total & Delivery Location */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Delivered To: </span>
                            <span className="text-white font-bold">{ord.delivery_address || user.hostel_address || 'Hostel Campus Gate'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Total Paid:</span>
                            <span className="text-base font-black text-[#C5A059] font-mono">₹{ord.total_amount}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300 font-bold uppercase">
                              {ord.payment_method || 'UPI'}
                            </span>
                          </div>
                        </div>

                        {/* ORDER ACTION BUTTONS */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            
                            {/* REORDER / REPEAT ORDER BUTTON */}
                            <button
                              onClick={() => handleReorder(ord)}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-600/20 transition flex items-center gap-1.5"
                            >
                              <Repeat className="w-3.5 h-3.5" />
                              <span>Reorder Items</span>
                            </button>

                            {/* VIEW INVOICE RECEIPT BUTTON */}
                            <button
                              onClick={() => setSelectedInvoiceOrder(ord)}
                              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                              <span>Tax Invoice</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* RATE ORDER BUTTON */}
                            <button
                              onClick={() => {
                                setRatingOrder(ord);
                                setGivenRating(5);
                                setRatingSubmitted(false);
                              }}
                              className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              <span>Rate Order</span>
                            </button>

                            {/* LIVE TRACK BUTTON IF ACTIVE */}
                            {ord.status !== 'delivered' && ord.status !== 'cancelled' && (
                              <button
                                onClick={() => onTrackOrder(ord)}
                                className="px-4 py-2 bg-[#C5A059] text-black font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Track Live</span>
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: LIVE ORDER TRACKING */}
          {activeTab === 'live_tracking' && (
            <div className="space-y-6">
              {activeOrder ? (
                <div className="bg-[#181818] p-6 rounded-3xl border border-white/10 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="font-black text-white text-lg font-serif">Live Order Status</h3>
                      <p className="text-xs text-gray-400 font-mono">Order ID: #{activeOrder.order_number}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase border border-emerald-500/30">
                      ETA: ~25 mins
                    </span>
                  </div>

                  {/* Animated Order Steps Timeline */}
                  <div className="space-y-4">
                    {[
                      { step: 1, label: 'Order Received', desc: 'Kitchen acknowledged order details', status: 'pending' },
                      { step: 2, label: 'Kitchen Cooking', desc: 'Chef preparing fresh spices & dish', status: 'cooking' },
                      { step: 3, label: 'Packing & Quality Check', desc: 'Hygienic foil sealing & verification', status: 'ready' },
                      { step: 4, label: 'Driver Assigned', desc: activeOrder.driver_name ? `Driver ${activeOrder.driver_name}` : 'Assigning nearest hostel runner', status: 'assigned' },
                      { step: 5, label: 'Out for Delivery', desc: 'Heading towards campus gate / hostel', status: 'out_for_delivery' },
                      { step: 6, label: 'Delivered', desc: 'Enjoy your hot meal!', status: 'delivered' }
                    ].map((st) => (
                      <div key={st.step} className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#C5A059] text-black font-black flex items-center justify-center text-xs shrink-0 shadow-md">
                          {st.step}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white text-sm">{st.label}</h4>
                          <p className="text-xs text-gray-400">{st.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-[#181818] rounded-3xl border border-white/10">
                  <Truck className="w-12 h-12 text-gray-500 mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-white">No order in progress right now</p>
                  <p className="text-xs text-gray-400 mt-1">When you place an order, live tracking will appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WALLET & REWARDS */}
          {activeTab === 'wallet_rewards' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-tr from-[#181818] to-[#242424] p-6 rounded-3xl border border-[#C5A059]/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">Trippy's Cash Wallet</span>
                    <h3 className="text-3xl font-black text-white font-mono mt-1">₹{(user.wallet_balance || 0).toFixed(2)}</h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#C5A059]/10 text-[#C5A059]">
                    <Wallet className="w-8 h-8" />
                  </div>
                </div>
                <p className="text-xs text-gray-400">100% usable on your next food order with auto-deduction at checkout.</p>
              </div>

              {/* Loyalty Tier Progress */}
              <div className="bg-[#181818] p-5 rounded-3xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-white text-sm">Gold Loyalty Status</h4>
                  <span className="text-xs text-[#C5A059] font-bold">450 / 1000 Points</span>
                </div>
                <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div className="h-full bg-[#C5A059] rounded-full w-[45%]" />
                </div>
                <p className="text-[11px] text-gray-400">Earn 550 more points to unlock Platinum Tier (Free delivery on all orders!)</p>
              </div>
            </div>
          )}

          {/* TAB 5: COUPONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-4">
              {availableCoupons.map((c) => (
                <div key={c.code} className="bg-[#181818] p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-xl text-[#C5A059] font-mono font-black text-xs">
                      <Gift className="w-3.5 h-3.5" />
                      <span>{c.code}</span>
                    </div>
                    <h4 className="font-extrabold text-white text-sm">{c.discount}</h4>
                    <p className="text-xs text-gray-400">{c.desc} (Min spend: {c.minSpend})</p>
                  </div>

                  <button
                    onClick={() => handleCopyCode(c.code)}
                    className="px-4 py-2 bg-white/10 hover:bg-[#C5A059] hover:text-black text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Coupon'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: ADDRESSES (DELIVERY LOCATION MANAGEMENT) */}
          {activeTab === 'addresses' && (
            <div className="space-y-5">
              
              {/* Success Notification Banner */}
              {addressSuccessMsg && (
                <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs rounded-2xl flex items-center justify-between gap-3 font-bold animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{addressSuccessMsg}</span>
                  </div>
                  <button
                    onClick={() => setAddressSuccessMsg(null)}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* CURRENT DEFAULT ADDRESS CARD */}
              <div className="bg-[#181818] p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-orange-600/20 text-orange-400 border border-orange-500/30">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base font-serif">Default Delivery Address</h4>
                      <p className="text-[11px] text-gray-400">Used automatically for all upcoming food orders.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#C5A059]/20 text-[#C5A059] text-[10px] font-black uppercase border border-[#C5A059]/30">
                      Default Address
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                      className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                    >
                      <span>{isEditingAddress ? 'Cancel' : '✏️ Edit Address'}</span>
                    </button>
                  </div>
                </div>

                {/* Display Current Address Details */}
                <div className="space-y-2 text-xs">
                  <p className="text-gray-200 font-extrabold text-sm leading-relaxed">
                    {user.hostel_address || 'GD Goenka University Campus - Hostel Gate 5'}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] text-gray-400">
                    <div className="bg-[#0d0d0d] p-2.5 rounded-xl border border-white/5">
                      <span className="text-gray-500 font-bold block">Hostel / Campus:</span>
                      <span className="text-white font-medium">{user.hostel_name || 'GD Goenka Campus Hostel'}</span>
                    </div>
                    <div className="bg-[#0d0d0d] p-2.5 rounded-xl border border-white/5">
                      <span className="text-gray-500 font-bold block">Room & Tower:</span>
                      <span className="text-white font-medium">
                        {user.room_number ? `Room ${user.room_number}` : 'N/A'}{user.tower_block ? `, ${user.tower_block}` : ''}
                      </span>
                    </div>
                    {user.landmark && (
                      <div className="bg-[#0d0d0d] p-2.5 rounded-xl border border-white/5">
                        <span className="text-gray-500 font-bold block">Landmark:</span>
                        <span className="text-amber-300 font-medium">{user.landmark}</span>
                      </div>
                    )}
                    {user.delivery_notes && (
                      <div className="bg-[#0d0d0d] p-2.5 rounded-xl border border-white/5">
                        <span className="text-gray-500 font-bold block">Delivery Notes:</span>
                        <span className="text-gray-300 italic">{user.delivery_notes}</span>
                      </div>
                    )}
                  </div>

                  {user.latitude && user.longitude && (
                    <p className="text-[10px] text-emerald-400 font-mono pt-1">
                      📍 Verified GPS Coordinates: {user.latitude}, {user.longitude}
                    </p>
                  )}
                </div>
              </div>

              {/* EDIT ADDRESS FORM */}
              {isEditingAddress && (
                <form onSubmit={handleSaveAddress} className="bg-[#181818] p-5 sm:p-6 rounded-3xl border border-[#C5A059]/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="font-extrabold text-white text-base font-serif flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#C5A059]" />
                      <span>Update Delivery Location Details</span>
                    </h4>
                    <span className="text-xs text-gray-400 font-medium">Auto-saves to Supabase profile</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    
                    {/* Hostel / Campus */}
                    <div>
                      <label className="font-bold text-gray-300 block mb-1">Hostel / Building Name *</label>
                      <input
                        type="text"
                        value={hostelName}
                        onChange={(e) => setHostelName(e.target.value)}
                        placeholder="e.g. GD Goenka Hostel / Boys Hostel 2"
                        className="w-full p-3 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059]"
                        required
                      />
                    </div>

                    {/* Room Number */}
                    <div>
                      <label className="font-bold text-gray-300 block mb-1">Room Number *</label>
                      <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="e.g. Room 304"
                        className="w-full p-3 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059]"
                        required
                      />
                    </div>

                    {/* Tower / Block */}
                    <div>
                      <label className="font-bold text-gray-300 block mb-1">Tower / Block (Optional)</label>
                      <input
                        type="text"
                        value={towerBlock}
                        onChange={(e) => setTowerBlock(e.target.value)}
                        placeholder="e.g. Block B / Tower 3"
                        className="w-full p-3 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059]"
                      />
                    </div>

                    {/* Landmark */}
                    <div>
                      <label className="font-bold text-gray-300 block mb-1">Landmark (Optional)</label>
                      <input
                        type="text"
                        value={addressLandmark}
                        onChange={(e) => setAddressLandmark(e.target.value)}
                        placeholder="e.g. Near Gate 5 Canteen / Opposite Library"
                        className="w-full p-3 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059]"
                      />
                    </div>

                    {/* Delivery Notes */}
                    <div className="sm:col-span-2">
                      <label className="font-bold text-gray-300 block mb-1">Delivery Instructions / Notes (Optional)</label>
                      <input
                        type="text"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="e.g. Please call when arriving at gate, do not ring bell late night"
                        className="w-full p-3 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059]"
                      />
                    </div>

                    {/* Default Address Checkbox */}
                    <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isDefaultCheckbox"
                        checked={isDefaultAddress}
                        onChange={(e) => setIsDefaultAddress(e.target.checked)}
                        className="w-4 h-4 accent-[#C5A059] rounded cursor-pointer"
                      />
                      <label htmlFor="isDefaultCheckbox" className="text-xs text-gray-300 font-bold cursor-pointer">
                        Set as Default Address for all future orders
                      </label>
                    </div>

                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingAddress}
                      className="flex-1 py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSavingAddress ? 'Saving Address...' : 'Save & Set as Default Address'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="px-5 py-3 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-bold rounded-2xl transition text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* TAB 7: REFERRAL */}
          {activeTab === 'referral' && (
            <div className="bg-[#181818] p-6 rounded-3xl border border-white/10 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center mx-auto">
                <Share2 className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white font-serif">Refer Friends & Get 25% OFF</h3>
                <div className="text-xs text-gray-300 max-w-md mx-auto space-y-1.5 text-left bg-[#0d0d0d] p-4 rounded-2xl border border-white/10">
                  <p className="font-bold text-amber-300">Invite your friends to Trippy's Mehfill.</p>
                  <p className="text-gray-400">When a referred customer places their first successful order using your referral code:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300 pt-1">
                    <li>Friend receives <strong className="text-emerald-400">25% OFF</strong> on their first order.</li>
                    <li>Referrer also receives <strong className="text-emerald-400">25% OFF coupon</strong> for their next order.</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-[#0d0d0d] rounded-2xl border border-white/15 inline-flex items-center gap-4">
                <span className="font-mono font-black text-lg text-[#C5A059]">{user.referral_code || `TRIPPY-${(user.full_name?.slice(0, 4)?.toUpperCase() || 'USER')}-${user.phone?.slice(-4) || '2026'}`}</span>
                <button
                  onClick={() => handleCopyReferral(user.referral_code || `TRIPPY-${(user.full_name?.slice(0, 4)?.toUpperCase() || 'USER')}-${user.phone?.slice(-4) || '2026'}`)}
                  className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  {copiedReferral ? 'Copied Code!' : 'Copy Code'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: PROFILE & SECURITY (SHOW LOGIN CREDENTIALS & UPDATE PASSWORD) */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              {/* CURRENT LOGIN CREDENTIALS & PASSWORD DISPLAY CARD */}
              <div className="bg-gradient-to-tr from-[#181818] to-gray-900 p-5 sm:p-6 rounded-3xl border border-orange-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-orange-600/20 text-orange-400 border border-orange-500/30">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base font-serif">Your Account Credentials</h3>
                      <p className="text-[11px] text-gray-400">Use phone number or email with password to log in.</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-full border border-emerald-500/30">
                    Account Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  
                  {/* Phone / Login ID */}
                  <div className="bg-[#0d0d0d] p-3.5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Login Phone / Username</span>
                    <span className="text-white font-mono font-black text-sm">
                      {user.phone || user.username || <span className="text-gray-500 font-normal">Not set</span>}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="bg-[#0d0d0d] p-3.5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Registered Email</span>
                    <span className="text-white font-mono font-bold text-xs truncate block">{user.email || 'Not attached'}</span>
                  </div>

                  {/* CURRENT PASSWORD VIEW / HIDE TOGGLE CARD */}
                  <div className="bg-[#0d0d0d] p-3.5 rounded-2xl border border-orange-500/30 sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-orange-400 uppercase font-black tracking-wider block">
                        Account Password Credentials
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="text-xs text-gray-300 hover:text-white flex items-center gap-1 font-bold underline"
                      >
                        {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5 text-orange-400" /> : <Eye className="w-3.5 h-3.5 text-orange-400" />}
                        <span>{showCurrentPassword ? 'Hide Password' : 'Show Password'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-black/60 p-2.5 rounded-xl border border-white/10 font-mono">
                      <span className="text-sm font-black text-amber-300 tracking-wider">
                        {user.password ? (showCurrentPassword ? user.password : '••••••••••••') : '••••••••••••'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {user.password ? 'Custom Password Saved' : 'Secured via Auth'}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* UPDATE PASSWORD FORM */}
              <div className="bg-[#181818] p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Lock className="w-5 h-5 text-[#C5A059]" />
                  <h3 className="font-extrabold text-white text-base font-serif">Change & Update Password</h3>
                </div>

                {passUpdateError && (
                  <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-2xl flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passUpdateError}</span>
                  </div>
                )}

                {passUpdateSuccess && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-2xl flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{passUpdateSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordUpdate} className="space-y-4 text-xs">
                  
                  {/* Current Password Field */}
                  <div>
                    <label className="font-bold text-gray-300 block mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassInput}
                        onChange={(e) => setCurrentPassInput(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full p-3 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059] font-mono text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password Field */}
                  <div>
                    <label className="font-bold text-gray-300 block mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassInput}
                        onChange={(e) => setNewPassInput(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full p-3 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059] font-mono text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength Indicator */}
                    {newPassInput && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400">
                          <span>Password Strength:</span>
                          <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${(strength.score / 4) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password Field */}
                  <div>
                    <label className="font-bold text-gray-300 block mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassInput}
                        onChange={(e) => setConfirmPassInput(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full p-3 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059] font-mono text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingPass}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isUpdatingPass ? 'Updating Security...' : 'Save New Password'}</span>
                  </button>
                </form>
              </div>

              {/* EDIT PERSONAL PROFILE DETAILS FORM */}
              <div className="bg-[#181818] p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4">
                <h3 className="font-extrabold text-white text-base font-serif border-b border-white/10 pb-2">
                  Update Profile Details
                </h3>

                {profileSuccessMsg && (
                  <div className="p-3 bg-emerald-500/20 text-emerald-300 text-xs rounded-2xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-gray-300 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-2.5 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-300 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full p-2.5 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-300 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full p-2.5 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-300 block mb-1">Campus / Hostel Address</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full p-2.5 bg-[#0d0d0d] border border-white/15 rounded-xl text-white outline-none focus:border-[#C5A059]"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-2xl shadow-lg transition"
                    >
                      Save Profile Details
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* SWIGGY / ZOMATO TAX INVOICE RECEIPT MODAL */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white text-gray-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-200 my-auto">
            
            {/* Header */}
            <div className="bg-orange-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6" />
                <div>
                  <h3 className="font-black text-lg font-serif">Tax Invoice & Receipt</h3>
                  <p className="text-[10px] text-orange-200">Trippy's Mehfill Dum Biryani & Kitchen</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceOrder(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Printable Content */}
            <div className="p-6 space-y-4 text-xs font-sans">
              
              {/* Order Meta */}
              <div className="flex justify-between border-b pb-3 text-gray-600">
                <div>
                  <span className="font-bold block text-gray-900">Order ID: #{selectedInvoiceOrder.order_number}</span>
                  <span>Date: {selectedInvoiceOrder.created_at || '03 Aug 2026'}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold block text-emerald-700 uppercase">{selectedInvoiceOrder.status}</span>
                  <span>Paid via {selectedInvoiceOrder.payment_method || 'UPI'}</span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-1">
                <span className="font-bold text-gray-900 block">Customer Info:</span>
                <p className="text-gray-700">{user.full_name} ({user.phone})</p>
                <p className="text-gray-500 text-[11px]">{selectedInvoiceOrder.delivery_address || user.hostel_address}</p>
              </div>

              {/* Items breakdown */}
              <div className="space-y-2">
                <span className="font-extrabold text-gray-900 block border-b pb-1">Ordered Dishes</span>
                {selectedInvoiceOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between font-medium">
                    <span>{it.quantity}x {it.dish_name || (it as any).menuItem?.name || 'Dish'}</span>
                    <span className="font-mono font-bold">₹{(it.price || 150) * it.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div className="border-t pt-3 space-y-1.5 text-gray-600 text-xs">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-mono">₹{selectedInvoiceOrder.total_amount - 20}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST & Restaurant Taxes (5%)</span>
                  <span className="font-mono">₹10</span>
                </div>
                <div className="flex justify-between">
                  <span>Hostel Express Delivery</span>
                  <span className="font-mono">₹10</span>
                </div>
                <div className="flex justify-between font-black text-sm text-gray-900 border-t pt-2">
                  <span>Total Amount Paid</span>
                  <span className="font-mono text-orange-600">₹{selectedInvoiceOrder.total_amount}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => {
                    triggerToast(`Downloading Invoice #${selectedInvoiceOrder.order_number}...`);
                    setSelectedInvoiceOrder(null);
                  }}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Receipt</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* RATING SUB-MODAL */}
      {ratingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#181818] border border-white/15 w-full max-w-md rounded-3xl p-6 text-white space-y-4">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-base font-serif">Rate Order #{ratingOrder.order_number}</h3>
              <button onClick={() => setRatingOrder(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {ratingSubmitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <ThumbsUp className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">Thank you for your rating!</h4>
                <p className="text-xs text-gray-400">Your feedback helps our kitchen maintain authentic taste.</p>
                <button
                  onClick={() => setRatingOrder(null)}
                  className="px-5 py-2 bg-[#C5A059] text-black font-extrabold text-xs rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-xs text-gray-300 mb-2 font-medium">How was your food & delivery experience?</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setGivenRating(star)}
                        className="p-1 hover:scale-125 transition"
                      >
                        <Star className={`w-7 h-7 ${star <= givenRating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Add Feedback / Comment</label>
                  <textarea
                    rows={3}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="e.g. Biryani was hot & super delicious!"
                    className="w-full p-2.5 bg-[#0d0d0d] border border-white/15 rounded-xl text-xs text-white outline-none focus:border-[#C5A059]"
                  />
                </div>

                <button
                  onClick={() => {
                    setRatingSubmitted(true);
                    triggerToast('Rating submitted successfully!');
                  }}
                  className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-xs rounded-2xl shadow-lg"
                >
                  Submit Feedback
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
