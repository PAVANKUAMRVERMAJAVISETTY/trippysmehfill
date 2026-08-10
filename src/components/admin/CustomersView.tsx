import React, { useState } from 'react';
import { UserProfile, Order } from '../../types';
import { UserCheck, Search, Plus, Mail, Phone, MapPin, Key, Trash2, CheckCircle, XCircle, ShieldAlert, User, Calendar, Database, Copy, Check, MessageSquare, Lock, ShieldCheck, ExternalLink, Activity, Eye } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatDistanceText, getRouteDirectionsUrl } from '../../lib/geoUtils';
import { usePresence } from '../../context/PresenceContext';
import { formatRelativeTime, getActivityStatus } from '../../lib/timeUtils';
import { CustomerDetailModal } from './CustomerDetailModal';

interface CustomersViewProps {
  customersList: UserProfile[];
  orders?: Order[];
  onAddCustomer: (user: UserProfile) => void;
  onToggleActive: (userId: string) => void;
  onDeleteCustomer: (userId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customersList,
  orders = [],
  onAddCustomer,
  onToggleActive,
  onDeleteCustomer
}) => {
  const { liveCustomers, liveCount, setIsLiveModalOpen } = usePresence();
  const liveUserIdSet = React.useMemo(() => new Set(liveCustomers.map((s) => s.user_id)), [liveCustomers]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'active' | 'inactive' | 'whatsapp_pending' | 'blocked_fraud'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'recent' | 'today' | 'older'>('all');
  const [successMsg, setSuccessMsg] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<UserProfile | null>(null);
  const [selectedDetailCustomer, setSelectedDetailCustomer] = useState<UserProfile | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const sqlSchemaScript = `-- COMPLETE PROFILES DATABASE SCHEMA & MIGRATION SCRIPT
-- Copy and execute this entire SQL script inside the Supabase SQL Editor.
-- Safe and idempotent: updates existing public.profiles table if columns are missing.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_location_update_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION DEFAULT 15.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_allowed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'Desktop';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS os_name TEXT DEFAULT 'Windows';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS browser_name TEXT DEFAULT 'Chrome';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at DESC);
`;

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    try {
      let createdUserId = '';

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              hostel_address: hostelAddress.trim(),
            }
          }
        });

        if (error) throw error;
        if (data.user) createdUserId = data.user.id;
      }

      const newCustomer: UserProfile = {
        id: createdUserId || `cust-${Date.now()}`,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        hostel_address: hostelAddress.trim(),
        role: 'customer',
        account_status: 'active',
        is_whatsapp_verified: false,
        is_approved: true,
        is_active: true,
        auth_provider: 'Email',
        ip_address: '103.211.14.82',
        latitude: 17.3850,
        longitude: 78.4867,
        location_city: 'GLS Arawali Homes, Sohna',
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      };

      onAddCustomer(newCustomer);
      setSuccessMsg(`Customer account created successfully for ${fullName}`);

      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setHostelAddress('');
    } catch (err: any) {
      alert(`Error creating customer: ${err.message || err}`);
    }
  };

  const sortedCustomers = React.useMemo(() => {
    return [...customersList].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [customersList]);

  const filteredCustomers = sortedCustomers.filter(c => {
    const matchesSearch =
      (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || '').includes(searchQuery) ||
      (c.hostel_address && c.hostel_address.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'live' ? liveUserIdSet.has(c.id) :
      statusFilter === 'active' ? c.is_active && c.account_status !== 'blocked_fraud' :
      statusFilter === 'whatsapp_pending' ? !c.is_whatsapp_verified :
      statusFilter === 'blocked_fraud' ? c.account_status === 'blocked_fraud' :
      !c.is_active;

    let matchesActivity = true;
    const actBadge = getActivityStatus(c.last_seen_at || c.updated_at);
    if (activityFilter === 'recent') matchesActivity = actBadge.category === 'recent';
    else if (activityFilter === 'today') matchesActivity = actBadge.category === 'today' || actBadge.category === 'recent';
    else if (activityFilter === 'older') matchesActivity = actBadge.category === 'older';

    return matchesSearch && matchesStatus && matchesActivity;
  });

  const activeCount = customersList.filter(c => c.is_active && c.account_status !== 'blocked_fraud').length;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-[#1F2933]" style={{ backgroundColor: '#F5F1E8' }}>
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#252525] font-serif tracking-wide flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-[#B8862D]" />
            <span>Customer Directory & Activity Telemetry</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-0.5">
            View last-seen activity timestamps, last-known GPS location, device specifications, and anti-fraud status.
          </p>
        </div>

        {/* Quick Actions & Stats */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            onClick={() => setShowSqlModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-white hover:bg-[#F0E8D8] border border-[#DDD6C8] text-[#B8862D] font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Database className="w-4 h-4 text-[#B8862D]" />
            <span>View SQL Schema</span>
          </button>

          <div className="bg-white border border-[#DDD6C8] px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
            <span className="text-[#5F6368] font-medium">Total Registered:</span>
            <span className="text-[#1F2933] font-extrabold text-sm">{customersList.length}</span>
          </div>
          <div className="bg-white border border-[#DDD6C8] px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
            <span className="text-[#5F6368] font-medium">Active Accounts:</span>
            <span className="text-[#146C43] font-extrabold text-sm">{activeCount}</span>
          </div>
          <button
            onClick={() => setIsLiveModalOpen(true)}
            className="bg-[#D1FAE5] border border-[#86EFAC] px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-sm cursor-pointer hover:bg-[#A7F3D0] transition"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#198754] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#198754]"></span>
            </span>
            <span className="text-[#146C43] font-extrabold text-xs">🟢 Live Now: {liveCount}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-[#D1FAE5] border border-[#86EFAC] text-[#146C43] text-xs rounded-2xl flex items-center justify-between font-bold">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-[#146C43] hover:text-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Account Creation Panel */}
      <div className="bg-white p-5 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[#1F2933] font-bold text-sm font-serif">
          <Plus className="w-4 h-4 text-[#D95F0A]" />
          <span>Create Customer Account (Email & Password Login)</span>
        </div>

        <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <input
            type="text"
            placeholder="Full Name *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
          />
          <input
            type="email"
            placeholder="Email Address *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
          />
          <input
            type="password"
            placeholder="Password *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
          />
          <input
            type="text"
            placeholder="Hostel / Delivery Address"
            value={hostelAddress}
            onChange={(e) => setHostelAddress(e.target.value)}
            className="p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
          />

          <button
            type="submit"
            className="py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded-xl border border-[#B94D00] shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Register Customer</span>
          </button>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4 bg-white p-4 rounded-2xl border border-[#DDD6C8] shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#5F6368] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customers by name, mail, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-xs text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs w-full sm:w-auto flex-wrap">
            <span className="text-[#5F6368] font-bold">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
                statusFilter === 'all'
                  ? 'bg-[#B8862D] text-white border-[#B8862D]'
                  : 'bg-white text-[#1F2933] border-[#DDD6C8] hover:bg-[#F7F4EC]'
              }`}
            >
              All ({customersList.length})
            </button>
            <button
              onClick={() => setStatusFilter('live')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                statusFilter === 'live'
                  ? 'bg-[#146C43] text-white border-[#146C43]'
                  : 'bg-white text-[#146C43] border-[#86EFAC] hover:bg-[#D1FAE5]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#198754] animate-pulse" />
              <span>Live Now ({liveCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
                statusFilter === 'active'
                  ? 'bg-[#198754] text-white border-[#146C43]'
                  : 'bg-white text-[#1F2933] border-[#DDD6C8] hover:bg-[#F7F4EC]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('blocked_fraud')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
                statusFilter === 'blocked_fraud'
                  ? 'bg-[#C0392B] text-white border-[#922B21]'
                  : 'bg-white text-[#922B21] border-[#F5A6A1] hover:bg-[#FDE2E1]'
              }`}
            >
              Fraud Suspended
            </button>
          </div>
        </div>

        {/* Activity Filter Row */}
        <div className="flex items-center gap-2 text-xs pt-2 border-t border-[#DDD6C8] flex-wrap">
          <span className="text-[#5F6368] font-bold flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-[#D95F0A]" /> Last Activity Filter:
          </span>
          <button
            onClick={() => setActivityFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer border ${
              activityFilter === 'all'
                ? 'bg-[#121212] text-[#C5A059] border-[#C5A059]'
                : 'bg-[#F7F4EC] text-[#5F6368] border-[#DDD6C8] hover:text-[#1F2933]'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setActivityFilter('recent')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer border ${
              activityFilter === 'recent'
                ? 'bg-emerald-700 text-white border-emerald-800'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            🟢 Recently Active (&lt; 2 hrs)
          </button>
          <button
            onClick={() => setActivityFilter('today')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer border ${
              activityFilter === 'today'
                ? 'bg-orange-700 text-white border-orange-800'
                : 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100'
            }`}
          >
            🟠 Active Today (&lt; 24 hrs)
          </button>
          <button
            onClick={() => setActivityFilter('older')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer border ${
              activityFilter === 'older'
                ? 'bg-gray-700 text-white border-gray-800'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            }`}
          >
            ⚪ Older Activity (&gt; 24 hrs)
          </button>
        </div>
      </div>

      {/* Customer Accounts Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-[#DDD6C8] shadow-sm">
          <User className="w-12 h-12 text-[#5F6368] mx-auto mb-2" />
          <p className="text-[#1F2933] font-bold">No registered customer accounts found.</p>
          <p className="text-xs text-[#5F6368] mt-1">
            {searchQuery ? 'Try adjusting your search criteria or activity filter.' : 'Create a customer account above or users will register when signing up on the app.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((cust) => {
            const isBlocked = cust.account_status === 'blocked_fraud';
            const isLiveNow = liveUserIdSet.has(cust.id);
            const actBadge = getActivityStatus(cust.last_seen_at || cust.updated_at);
            const relativeLastSeen = formatRelativeTime(cust.last_seen_at || cust.updated_at);

            return (
              <div
                key={cust.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition space-y-4 flex flex-col justify-between ${
                  isBlocked
                    ? 'border-[#F5A6A1] bg-[#FDE2E1]/20'
                    : isLiveNow
                    ? 'border-[#86EFAC] ring-2 ring-[#86EFAC]/40'
                    : 'border-[#DDD6C8] hover:border-[#B8862D]'
                }`}
              >
                <div className="space-y-3">
                  {/* Header info */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`relative w-10 h-10 rounded-2xl font-black flex items-center justify-center text-base ${
                        isBlocked
                          ? 'bg-[#FDE2E1] text-[#922B21] border border-[#F5A6A1]'
                          : isLiveNow
                          ? 'bg-[#D1FAE5] border border-[#86EFAC] text-[#146C43]'
                          : 'bg-[#FFF0CC] border border-[#E8C66A] text-[#8A5A00]'
                      }`}>
                        {cust.full_name ? cust.full_name.charAt(0).toUpperCase() : 'C'}
                        {isLiveNow && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#198754] border-2 border-white animate-pulse" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[#1F2933] text-sm line-clamp-1">{cust.full_name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#F7F4EC] border border-[#DDD6C8] text-[#B8862D]">
                            Customer
                          </span>
                          {cust.is_whatsapp_verified ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D1FAE5] text-[#146C43] border border-[#86EFAC] flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-[#146C43]" /> WA Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF0CC] text-[#8A5A00] border border-[#E8C66A]">
                              WA Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* Presence Badge */}
                      {isLiveNow ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 bg-[#D1FAE5] border border-[#86EFAC] text-[#146C43] shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-[#198754] animate-pulse" />
                          <span>🟢 LIVE NOW</span>
                        </span>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${actBadge.badgeBg} ${actBadge.badgeText} ${actBadge.badgeBorder}`}>
                          <span>{actBadge.dot}</span>
                          <span>Last seen: {relativeLastSeen}</span>
                        </span>
                      )}

                      {/* Account Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-1 border ${
                          isBlocked
                            ? 'bg-[#FDE2E1] border-[#F5A6A1] text-[#922B21]'
                            : cust.is_active
                            ? 'bg-[#F7F4EC] border-[#DDD6C8] text-[#146C43]'
                            : 'bg-[#FDE2E1] border-[#F5A6A1] text-[#922B21]'
                        }`}
                      >
                        {isBlocked ? (
                          <>
                            <ShieldAlert className="w-3 h-3 text-[#922B21]" />
                            <span>BLOCKED</span>
                          </>
                        ) : cust.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>ACCOUNT ACTIVE</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>DISABLED</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-center gap-2 text-[#1F2933]">
                      <Mail className="w-3.5 h-3.5 text-[#B8862D] shrink-0" />
                      <span className="truncate">{cust.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[#1F2933]">
                      <Phone className="w-3.5 h-3.5 text-[#B8862D] shrink-0" />
                      <span>📱 {cust.phone || 'N/A'}</span>
                    </div>

                    {/* Device & Location Preview */}
                    <div className="pt-2 border-t border-[#DDD6C8] space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-[10px] text-[#5F6368] bg-[#F7F4EC] p-2 rounded-xl border border-[#DDD6C8]">
                        <span className="font-bold text-[#1F2933]">💻 {cust.device_type || 'Desktop'} ({cust.os_name || 'Windows'})</span>
                        <span className="font-mono text-[#D95F0A] font-bold">🌐 {cust.ip_address || 'IP unavailable'}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#5F6368] font-bold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#D95F0A]" /> Last Location:
                        </span>
                        <span className="text-[#146C43] font-mono font-bold truncate max-w-[170px]">
                          📍 {cust.location_city || 'Sohna, Haryana'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#DDD6C8] space-y-2">
                  <button
                    onClick={() => setSelectedDetailCustomer(cust)}
                    className="w-full py-2 bg-[#121212] hover:bg-black text-[#C5A059] font-extrabold text-xs rounded-xl border border-[#C5A059]/40 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>View Customer Activity & Location</span>
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onToggleActive(cust.id)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-extrabold border transition cursor-pointer flex items-center justify-center gap-1 ${
                        cust.is_active
                          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      {cust.is_active ? 'Disable Access' : 'Enable Access'}
                    </button>

                    <button
                      onClick={() => setCustomerToDelete(cust)}
                      className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-[10px] rounded-xl border border-red-200 transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3 text-red-700" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Activity Detail Modal */}
      {selectedDetailCustomer && (
        <CustomerDetailModal
          customer={selectedDetailCustomer}
          orders={orders}
          onClose={() => setSelectedDetailCustomer(null)}
        />
      )}

      {/* SQL Migration Script Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 border border-[#DDD6C8] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
              <h3 className="font-extrabold text-[#1F2933] text-base font-serif flex items-center gap-2">
                <Database className="w-5 h-5 text-[#B8862D]" />
                <span>Supabase Telemetry Migration Script</span>
              </h3>
              <button onClick={() => setShowSqlModal(false)} className="text-[#5F6368] hover:text-black font-bold">✕</button>
            </div>

            <textarea
              readOnly
              value={sqlSchemaScript}
              className="w-full h-64 p-3 bg-[#1A1A1A] text-emerald-400 font-mono text-xs rounded-2xl outline-none"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sqlSchemaScript);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="px-5 py-2 bg-[#B8862D] hover:bg-[#8A5A00] text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Script'}</span>
              </button>
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 bg-[#F8F6F0] text-[#1F2933] font-bold rounded-xl border border-[#9F988A] hover:bg-[#EFECE6] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#DDD6C8] shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <h3 className="font-extrabold text-[#1F2933] text-base font-serif">Confirm Account Deletion</h3>
            </div>

            <p className="text-xs text-[#5F6368]">
              Are you sure you want to delete <strong className="text-[#1F2933]">{customerToDelete.full_name}</strong> ({customerToDelete.email})? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 bg-[#F8F6F0] text-[#1F2933] font-bold text-xs rounded-xl border border-[#9F988A] hover:bg-[#EFECE6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteCustomer(customerToDelete.id);
                  setCustomerToDelete(null);
                  setSuccessMsg(`Deleted account for ${customerToDelete.full_name}`);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
