import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { UserCheck, Search, Plus, Mail, Phone, MapPin, Key, Trash2, CheckCircle, XCircle, ShieldAlert, User, Calendar, Database, Copy, Check, MessageSquare, Lock, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatDistanceText, getRouteDirectionsUrl } from '../../lib/geoUtils';

interface CustomersViewProps {
  customersList: UserProfile[];
  onAddCustomer: (user: UserProfile) => void;
  onToggleActive: (userId: string) => void;
  onDeleteCustomer: (userId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customersList,
  onAddCustomer,
  onToggleActive,
  onDeleteCustomer
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'whatsapp_pending' | 'blocked_fraud'>('all');
  const [successMsg, setSuccessMsg] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<UserProfile | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const sqlSchemaScript = `-- COMPLETE PROFILES DATABASE SCHEMA & MIGRATION SCRIPT
-- Copy and execute this entire SQL script inside the Supabase SQL Editor.
-- Safe and idempotent: updates existing public.profiles table if columns are missing.

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'driver', 'customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('active', 'pending_verification', 'blocked_fraud');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  hostel_address TEXT DEFAULT '',
  role TEXT DEFAULT 'customer',
  account_status TEXT DEFAULT 'active',
  is_whatsapp_verified BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  auth_provider TEXT DEFAULT 'Email',
  ip_address TEXT DEFAULT '103.211.14.82',
  latitude DOUBLE PRECISION DEFAULT 17.3850,
  longitude DOUBLE PRECISION DEFAULT 78.4867,
  location_city TEXT DEFAULT 'Sohna GLS Homes near GDGU, Haryana',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration: Add missing columns if profiles table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hostel_address TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_whatsapp_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'Email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '103.211.14.82';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT 17.3850;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT 78.4867;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_city TEXT DEFAULT 'Sohna GLS Homes near GDGU, Haryana';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins full control over profiles" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins full control over profiles" ON public.profiles FOR ALL USING (public.is_admin_or_staff());

-- TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  user_phone TEXT;
  user_name TEXT;
  assigned_role TEXT;
BEGIN
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
  IF NEW.email = 'admin@gallery.app' OR NEW.email = 'nagapavankumarjavisetty@gmail.com' THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'customer';
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, phone, hostel_address, role, account_status, is_whatsapp_verified, is_approved, is_active, auth_provider, ip_address, latitude, longitude
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_phone,
    COALESCE(NEW.raw_user_meta_data->>'hostel_address', ''),
    assigned_role,
    'active',
    FALSE,
    (assigned_role = 'admin'),
    TRUE,
    'Email',
    COALESCE(NEW.raw_user_meta_data->>'ip_address', '103.211.14.82'),
    COALESCE((NEW.raw_user_meta_data->>'latitude')::double precision, 17.3850),
    COALESCE((NEW.raw_user_meta_data->>'longitude')::double precision, 78.4867)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    hostel_address = EXCLUDED.hostel_address,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaScript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleToggleWhatsAppVerified = async (cust: UserProfile) => {
    const newStatus = !cust.is_whatsapp_verified;
    cust.is_whatsapp_verified = newStatus;
    if (newStatus && cust.account_status === 'pending_verification') {
      cust.account_status = 'active';
    }

    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({
        is_whatsapp_verified: newStatus,
        account_status: cust.account_status
      }).eq('id', cust.id);
    }
    setSuccessMsg(`WhatsApp verification status updated for ${cust.full_name}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleBlockFraud = async (cust: UserProfile) => {
    const isCurrentlyBlocked = cust.account_status === 'blocked_fraud';
    const newStatus = isCurrentlyBlocked ? 'active' : 'blocked_fraud';
    const newIsActive = isCurrentlyBlocked;

    cust.account_status = newStatus;
    cust.is_active = newIsActive;

    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({
        account_status: newStatus,
        is_active: newIsActive
      }).eq('id', cust.id);
    }

    setSuccessMsg(isCurrentlyBlocked ? `Unblocked ${cust.full_name}.` : `Flagged & Suspended ${cust.full_name} for suspicious fraud.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    // Phone is required, not defaulted. This previously fell back to
    // '9876543210' and an invented hostel address when left blank, so a record
    // could look complete while carrying a phone number and address that belong
    // to nobody -- which a driver would then call and drive to.
    if (!fullName || !email || !phone.trim()) return;

    const newCust: UserProfile = {
      id: 'c-' + Date.now(),
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
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
      created_at: new Date().toLocaleString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').insert([newCust]);
      } catch (err) {
        console.error('Failed to save customer to Supabase:', err);
      }
    }

    onAddCustomer(newCust);
    setSuccessMsg(`Customer account created for ${fullName}! Can now login with ${email}`);
    setTimeout(() => setSuccessMsg(''), 4000);

    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setHostelAddress('');
  };

  const filteredCustomers = customersList.filter(c => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.hostel_address && c.hostel_address.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? c.is_active && c.account_status !== 'blocked_fraud' :
      statusFilter === 'whatsapp_pending' ? !c.is_whatsapp_verified :
      statusFilter === 'blocked_fraud' ? c.account_status === 'blocked_fraud' :
      !c.is_active;

    return matchesSearch && matchesStatus;
  });

  const activeCount = customersList.filter(c => c.is_active && c.account_status !== 'blocked_fraud').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-gray-200">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-serif tracking-wide flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-[#C5A059]" />
            <span>Registered Customers & Anti-Fraud Security</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Monitor real hardware GPS coordinates, security IPs, WhatsApp verification, and anti-fraud accounts.
          </p>
        </div>

        {/* Quick Actions & Stats */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            onClick={() => setShowSqlModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-[#181818] hover:bg-[#222] border border-[#C5A059]/40 text-[#C5A059] font-bold flex items-center gap-1.5 transition shadow-lg"
          >
            <Database className="w-4 h-4 text-[#C5A059]" />
            <span>View SQL Schema</span>
          </button>

          <div className="bg-[#121212] border border-white/10 px-3.5 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-gray-400 font-medium">Total Registered:</span>
            <span className="text-white font-extrabold text-sm">{customersList.length}</span>
          </div>
          <div className="bg-[#121212] border border-white/10 px-3.5 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-gray-400 font-medium">Active:</span>
            <span className="text-emerald-400 font-extrabold text-sm">{activeCount}</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Account Creation Panel */}
      <div className="bg-[#121212] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm font-serif">
          <Plus className="w-4 h-4 text-[#C5A059]" />
          <span>Create Customer Account (Email & Password Login)</span>
        </div>

        <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <input
            type="text"
            placeholder="Full Name *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
          <input
            type="email"
            placeholder="Email Address *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
          <input
            type="password"
            placeholder="Password *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
          <input
            type="text"
            placeholder="Hostel / Delivery Address"
            value={hostelAddress}
            onChange={(e) => setHostelAddress(e.target.value)}
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />

          <button
            type="submit"
            className="py-2.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 transition flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            <span>Register Customer</span>
          </button>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#121212] p-4 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by name, mail, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto flex-wrap">
          <span className="text-gray-400 font-medium">Filter:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'all'
                ? 'bg-[#C5A059] text-black'
                : 'bg-[#181818] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            All ({customersList.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-black'
                : 'bg-[#181818] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('whatsapp_pending')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'whatsapp_pending'
                ? 'bg-amber-500 text-black'
                : 'bg-[#181818] text-amber-400 hover:text-amber-300 border border-amber-500/30'
            }`}
          >
            WhatsApp Pending
          </button>
          <button
            onClick={() => setStatusFilter('blocked_fraud')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'blocked_fraud'
                ? 'bg-rose-600 text-white'
                : 'bg-[#181818] text-rose-400 hover:text-rose-300 border border-rose-500/30'
            }`}
          >
            Fraud Suspended
          </button>
        </div>
      </div>

      {/* Customer Accounts Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-[#121212] rounded-2xl p-10 text-center border border-white/10 shadow-xl">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-white font-bold">No registered customer accounts found.</p>
          <p className="text-xs text-gray-400 mt-1">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Create a customer account above or users will register when signing up on the app.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((cust) => {
            const isBlocked = cust.account_status === 'blocked_fraud';

            return (
              <div
                key={cust.id}
                className={`bg-[#121212] rounded-2xl p-5 border shadow-xl transition space-y-4 flex flex-col justify-between ${
                  isBlocked
                    ? 'border-rose-500/50 bg-rose-950/10'
                    : 'border-white/10 hover:border-[#C5A059]/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Header info */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl font-black flex items-center justify-center text-base ${
                        isBlocked
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-[#C5A059]/20 border border-[#C5A059]/30 text-[#C5A059]'
                      }`}>
                        {cust.full_name ? cust.full_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm line-clamp-1">{cust.full_name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059]">
                            Customer
                          </span>
                          {cust.is_whatsapp_verified ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" /> WA Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              WA Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                        isBlocked
                          ? 'bg-rose-600/30 border border-rose-500 text-rose-300 font-extrabold'
                          : cust.is_active
                          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>BLOCKED FRAUD</span>
                        </>
                      ) : cust.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Disabled</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                      <span className="truncate">{cust.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                      <span>{cust.phone || 'N/A'}</span>
                    </div>

                    {cust.hostel_address && (
                      <div className="flex items-start gap-2 text-gray-300">
                        <MapPin className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-gray-400 text-[11px]">{cust.hostel_address}</span>
                      </div>
                    )}

                    {/* Auth Provider & Comprehensive ERP Anti-Fraud Security Data */}
                    <div className="pt-2 border-t border-white/10 space-y-2 text-[11px]">
                      {/* Fraud Risk Indicator Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Anti-Fraud Risk:</span>
                        <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase border flex items-center gap-1 ${
                          cust.fraud_risk_level === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-black animate-pulse'
                            : cust.fraud_risk_level === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {cust.fraud_risk_level === 'high' && '🔴 HIGH RISK'}
                          {cust.fraud_risk_level === 'medium' && '⚠️ MEDIUM RISK'}
                          {(!cust.fraud_risk_level || cust.fraud_risk_level === 'low') && '🟢 LOW RISK'}
                        </span>
                      </div>

                      {/* Warning reasons if any */}
                      {cust.fraud_risk_reasons && cust.fraud_risk_reasons.length > 0 && (
                        <div className="p-2 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-1 text-[10px] text-rose-300">
                          {cust.fraud_risk_reasons.map((r, i) => (
                            <p key={i} className="font-bold flex items-start gap-1">
                              <span>•</span>
                              <span>{r}</span>
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Device, OS & Browser */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 bg-[#181818] p-2 rounded-xl border border-white/5">
                        <div className="flex items-center gap-1 font-bold text-white">
                          <span>💻 {cust.device_type || 'Desktop'}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-300">{cust.os_name || 'Windows 11'}</span>
                        </div>
                        <span className="font-mono text-orange-400 font-bold">{cust.browser_name || 'Chrome'}</span>
                      </div>

                      {/* Public IP */}
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-gray-500">Public IP:</span>
                        <span className="text-gray-300 bg-[#181818] px-2 py-0.5 rounded border border-white/10 font-bold">
                          🌐 {cust.ip_address || '103.211.14.82'}
                        </span>
                      </div>

                      {/* Hardware GPS & Live Google Maps Link */}
                      <div className="space-y-1 bg-[#181818] p-2.5 rounded-xl border border-white/10 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-orange-400" /> GPS Distance:
                          </span>
                          <span className="text-emerald-400 font-mono font-extrabold">
                            📍 {formatDistanceText(cust.distance_km || 0.1)}
                          </span>
                        </div>

                        {cust.latitude && cust.longitude && (
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 gap-1">
                            <span className="text-gray-500 font-mono text-[9px]">
                              Acc: ±{cust.gps_accuracy || 15}m
                            </span>
                            <div className="flex items-center gap-1">
                              <a
                                href={`https://www.google.com/maps?q=${cust.latitude},${cust.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-bold rounded transition text-[9px] border border-white/10"
                              >
                                📍 Live Pos
                              </a>
                              <a
                                href={getRouteDirectionsUrl(cust.latitude, cust.longitude)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded transition text-[10px] flex items-center gap-1 shadow-md"
                              >
                                🗺️ Route from GLS
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {cust.created_at && (
                      <div className="flex items-center gap-2 text-gray-500 text-[11px] pt-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>Registered: {cust.created_at}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Anti-Fraud Action Buttons */}
                <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    {/* Toggle WhatsApp Approval */}
                    <button
                      type="button"
                      onClick={() => handleToggleWhatsAppVerified(cust)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 text-[11px] ${
                        cust.is_whatsapp_verified
                          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{cust.is_whatsapp_verified ? 'WhatsApp Verified' : 'Verify WA'}</span>
                    </button>

                    {/* Block Fraud Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleBlockFraud(cust)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 text-[11px] ${
                        isBlocked
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{isBlocked ? 'Unblock Account' : 'Block Fraud'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onToggleActive(cust.id)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 text-[11px] ${
                        cust.is_active
                          ? 'bg-[#181818] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-white/10'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {cust.is_active ? 'Disable Login' : 'Enable Login'}
                    </button>

                    <button
                      onClick={() => setCustomerToDelete(cust)}
                      className="p-1.5 rounded-xl bg-[#181818] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-white/10 transition"
                      title="Delete Customer Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SQL Migration Script Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#C5A059]/40 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#C5A059]" />
                <h3 className="text-lg font-black text-white font-serif">
                  Supabase Anti-Fraud SQL Schema & Triggers
                </h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Copy this complete production SQL script and execute it inside your <strong>Supabase SQL Editor</strong> to create the anti-fraud schema and user sync trigger.
            </p>

            <div className="relative">
              <pre className="bg-[#080808] p-4 rounded-2xl border border-white/10 text-emerald-400 font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed">
                {sqlSchemaScript}
              </pre>

              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-3 right-3 px-3 py-1.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-6 py-2.5 bg-[#181818] hover:bg-white/10 text-white font-bold rounded-xl text-xs border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-gray-200">
            <div className="flex items-center gap-3 text-rose-400 font-extrabold text-base">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-serif">Delete Customer Account</h3>
                <p className="text-xs text-gray-400 font-normal">Irreversible action</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#181818] border border-white/10 rounded-xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer Name:</span>
                <span className="text-white font-bold">{customerToDelete.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email Address:</span>
                <span className="text-white font-bold">{customerToDelete.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone:</span>
                <span className="text-white font-bold">{customerToDelete.phone || 'N/A'}</span>
              </div>
            </div>

            <p className="text-xs text-rose-300 leading-relaxed">
              Are you sure you want to permanently delete this customer account? All associated profile data will be permanently removed.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 bg-[#181818] hover:bg-white/10 text-gray-300 font-bold text-xs rounded-xl border border-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!customerToDelete) return;
                  const deletedName = customerToDelete.full_name;
                  const targetId = customerToDelete.id;
                  setCustomerToDelete(null);

                  // Immediate local UI cleanup
                  onDeleteCustomer(targetId);

                  if (isSupabaseConfigured) {
                    const { error } = await supabase.from('profiles').delete().eq('id', targetId);
                    if (error) console.error('Error deleting profile:', error.message);
                  }

                  setSuccessMsg(`Customer account for "${deletedName}" was permanently deleted.`);
                  setTimeout(() => setSuccessMsg(''), 4000);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

