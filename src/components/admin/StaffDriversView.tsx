import React, { useState } from 'react';
import { UserProfile, UserRole } from '../../types';
import { Shield, ChefHat, Bike, Key, Edit, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface StaffDriversViewProps {
  staffList?: UserProfile[];
  onAddStaff: (user: UserProfile) => void;
  onToggleActive: (userId: string) => void;
  onDeleteStaff: (userId: string) => void;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const StaffDriversView: React.FC<StaffDriversViewProps> = ({
  staffList = [],
  onAddStaff,
  onToggleActive,
  onDeleteStaff
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const safeStaffList = Array.isArray(staffList) ? staffList : [];

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg('Full Name, Phone number, and Password are required.');
      return;
    }

    if (password.trim().length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    const sanitizedPhone = phone.trim().replace(/\s+/g, '');
    const cleanEmail = `${sanitizedPhone}@trippys.com`;

    let newStaff: UserProfile;

    if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
      try {
        const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

        const { data: signUpData, error: signUpErr } = await tempSupabase.auth.signUp({
          email: cleanEmail,
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              phone: sanitizedPhone
            }
          }
        });

        if (signUpErr) {
          setErrorMsg(`Account creation failed: ${signUpErr.message}`);
          setIsSubmitting(false);
          return;
        }

        if (!signUpData?.user?.id) {
          setErrorMsg('Account creation failed: No user ID returned from Supabase Auth.');
          setIsSubmitting(false);
          return;
        }

        const newUserId = signUpData.user.id;

        const { data: updatedProf, error: updateErr } = await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            phone: sanitizedPhone,
            role: role,
            is_approved: true,
            is_active: true,
            account_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', newUserId)
          .select()
          .maybeSingle();

        if (updateErr) {
          console.warn('[StaffDriversView] Profile update warning:', updateErr.message);
        }

        newStaff = (updatedProf as UserProfile) || {
          id: newUserId,
          email: cleanEmail,
          full_name: fullName.trim(),
          phone: sanitizedPhone,
          role,
          is_approved: true,
          is_active: true,
          account_status: 'active',
          created_at: new Date().toISOString()
        };
      } catch (err: any) {
        console.error('Failed to create account in Supabase:', err);
        setErrorMsg(err.message || 'Failed to create account in Supabase.');
        setIsSubmitting(false);
        return;
      }
    } else {
      newStaff = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        full_name: fullName.trim(),
        phone: sanitizedPhone,
        role,
        is_approved: true,
        is_active: true,
        account_status: 'active',
        created_at: new Date().toISOString()
      };
    }

    onAddStaff(newStaff);
    setSuccessMsg(`Account created successfully for ${fullName.trim()} (${role.toUpperCase()})!`);
    setFullName('');
    setPhone('');
    setPassword('');
    setIsSubmitting(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const admins = safeStaffList.filter(u => u && u.role === 'admin');
  const kitchenStaff = safeStaffList.filter(u => u && u.role === 'staff');
  const drivers = safeStaffList.filter(u => u && u.role === 'driver');

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-[#1F2933]" style={{ backgroundColor: '#F2F3F0' }}>
      <div>
        <h1 className="text-2xl font-black text-[#252525] font-serif">Team</h1>
        <p className="text-xs text-[#5F6368]">Create staff and delivery partner logins.</p>
      </div>

      {/* Creation Form Box */}
      <div className="bg-white p-5 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
        <h3 className="font-bold text-[#1F2933] text-sm">Create Account</h3>

        {errorMsg && (
          <div className="p-3 bg-[#FDE2E1] border border-[#F5A6A1] text-[#922B21] text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#922B21]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#D1FAE5] border border-[#86EFAC] text-[#146C43] text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#146C43]" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreateAccount} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[#1F2933] mb-1">Full Name / User ID *</label>
            <input
              type="text"
              placeholder="e.g. Rajesh Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full p-2.5 bg-[#F8F6F0] text-[#1F2933] placeholder-[#6B6B63] border border-[#9F988A] rounded-xl outline-none focus:border-[#D95F0A] font-medium transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#1F2933] mb-1">Phone Number *</label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full p-2.5 bg-[#F8F6F0] text-[#1F2933] placeholder-[#6B6B63] border border-[#9F988A] rounded-xl outline-none focus:border-[#D95F0A] font-medium transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#1F2933] mb-1">Password *</label>
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full p-2.5 bg-[#F8F6F0] text-[#1F2933] placeholder-[#6B6B63] border border-[#9F988A] rounded-xl outline-none focus:border-[#D95F0A] font-medium transition disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#1F2933] mb-1">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={isSubmitting}
              className="w-full p-2.5 bg-[#F8F6F0] text-[#1F2933] border border-[#9F988A] rounded-xl outline-none focus:border-[#D95F0A] font-bold transition cursor-pointer disabled:opacity-50"
            >
              <option value="staff">Staff (Kitchen)</option>
              <option value="driver">Driver (Delivery)</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] disabled:opacity-50 text-white font-bold rounded-xl shadow-sm border border-[#B94D00] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Admins List */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase text-[#5F6368] tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#B8862D]" />
          <span>Admins ({admins.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((u) => (
            <UserCard key={u.id} user={u} onToggleActive={onToggleActive} onDeleteStaff={onDeleteStaff} />
          ))}
        </div>
      </div>

      {/* Staffs List */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase text-[#5F6368] tracking-wider flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-[#D95F0A]" />
          <span>Staffs ({kitchenStaff.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kitchenStaff.map((u) => (
            <UserCard key={u.id} user={u} onToggleActive={onToggleActive} onDeleteStaff={onDeleteStaff} />
          ))}
        </div>
      </div>

      {/* Delivery Partners List */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase text-[#5F6368] tracking-wider flex items-center gap-2">
          <Bike className="w-4 h-4 text-[#2563A6]" />
          <span>Delivery Partners ({drivers.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((u) => (
            <UserCard key={u.id} user={u} onToggleActive={onToggleActive} onDeleteStaff={onDeleteStaff} />
          ))}
        </div>
      </div>
    </div>
  );
};

const UserCard: React.FC<{
  user: UserProfile;
  onToggleActive: (id: string) => void;
  onDeleteStaff: (id: string) => void;
}> = ({ user, onToggleActive, onDeleteStaff }) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggleActive(user.id);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${user.full_name || 'this user'}?`)) {
      onDeleteStaff(user.id);
    }
  };

  const displayHandle = user?.phone ? `@${user.phone}` : (user?.email ? `@${user.email.split('@')[0]}` : '@user');
  const roleName = user?.role || 'staff';
  const isActive = user?.is_active ?? true;

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#DDD6C8] shadow-sm flex flex-col justify-between space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-extrabold text-[#1F2933] text-sm">{user?.full_name || 'Team Member'}</h3>
          <p className="text-xs text-[#D95F0A] font-mono">{displayHandle}</p>
          <p className="text-[11px] text-[#5F6368] font-mono mt-0.5">{user?.phone || 'No phone set'}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
          roleName === 'admin' ? 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]' :
          roleName === 'driver' ? 'bg-[#E8F1FA] text-[#2563A6] border-[#8FB6D9]' : 'bg-[#F7F4EC] text-[#1F2933] border-[#DDD6C8]'
        }`}>
          {roleName}
        </span>
      </div>

      <div className="space-y-2 pt-2 border-t border-[#DDD6C8] text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#1F2933]">Status</span>
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              isActive ? 'bg-[#D95F0A] justify-end' : 'bg-[#DDD6C8] justify-start'
            } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
            title={`Click to set ${isActive ? 'Inactive' : 'Active'}`}
          >
            <span className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button className="py-1.5 bg-white hover:bg-[#F0E8D8] text-[#1F2933] border border-[#9F988A] font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer">
            <Edit className="w-3 h-3 text-[#D95F0A]" /> Edit
          </button>
          <button className="py-1.5 bg-white hover:bg-[#F0E8D8] text-[#1F2933] border border-[#9F988A] font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer">
            <Key className="w-3 h-3 text-[#B8862D]" /> Reset
          </button>
          <button
            onClick={handleDelete}
            className="py-1.5 bg-[#FDE2E1] hover:bg-[#F5A6A1] text-[#922B21] border border-[#F5A6A1] font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

