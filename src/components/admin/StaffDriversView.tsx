import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../../types';
import { Shield, ChefHat, Bike, Key, Edit, Trash2, Loader2, AlertCircle, CheckCircle2, Search, UserX, AlertTriangle, X } from 'lucide-react';
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

interface AuthMetadata {
  id?: string;
  email?: string;
  is_email_verified?: boolean;
  created_at?: string;
  last_sign_in_at?: string;
}

export const StaffDriversView: React.FC<StaffDriversViewProps> = ({
  staffList = [],
  onAddStaff,
  onToggleActive,
  onDeleteStaff
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Admin Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const safeStaffList = Array.isArray(staffList) ? staffList : [];

  // Filter staff list by search query (Email, Phone, Full Name)
  const filteredStaffList = safeStaffList.filter((u) => {
    if (!u) return false;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const matchName = u.full_name?.toLowerCase().includes(query);
    const matchEmail = u.email?.toLowerCase().includes(query);
    const matchPhone = u.phone?.toLowerCase().includes(query);
    return matchName || matchEmail || matchPhone;
  });

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Full Name, Phone number, Email address, and Password are required.');
      return;
    }

    if (password.trim().length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    const sanitizedPhone = phone.trim().replace(/\s+/g, '');
    const cleanEmail = email.trim().toLowerCase();

    // Pre-check if an account with this email already exists in public.profiles
    const { data: existingProf } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProf) {
      setErrorMsg('An account with this email already exists.');
      setIsSubmitting(false);
      return;
    }

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
          const isDuplicate = signUpErr.message?.toLowerCase().includes('already registered') ||
                              signUpErr.message?.toLowerCase().includes('already exists');
          setErrorMsg(isDuplicate ? 'An account with this email already exists.' : `Account creation failed: ${signUpErr.message}`);
          setIsSubmitting(false);
          return;
        }

        if (!signUpData?.user?.id) {
          setErrorMsg('Account creation failed: No user ID returned from Supabase Auth.');
          setIsSubmitting(false);
          return;
        }

        const newUserId = signUpData.user.id;

        let { data: updatedProf, error: updateErr } = await supabase
          .from('profiles')
          .update({
            email: cleanEmail,
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

        if (updateErr || !updatedProf) {
          const { data: upsertedProf, error: upsertErr } = await supabase
            .from('profiles')
            .upsert([{
              id: newUserId,
              email: cleanEmail,
              full_name: fullName.trim(),
              phone: sanitizedPhone,
              role: role,
              is_approved: true,
              is_active: true,
              account_status: 'active',
              auth_provider: 'Email',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }], { onConflict: 'id' })
            .select()
            .single();

          if (upsertErr) {
            console.error('[StaffDriversView] Profile role promotion failed:', upsertErr.message);
            setErrorMsg(`Role assignment failed: ${upsertErr.message}`);
            setIsSubmitting(false);
            return;
          }
          updatedProf = upsertedProf;
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
    setEmail('');
    setPassword('');
    setIsSubmitting(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    if (confirmInput.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm permanent deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      // 1. Attempt to invoke Edge Function `admin-staff-management` for secure Auth deletion
      const session = (await supabase.auth.getSession()).data.session;
      if (session) {
        const { error: fnErr } = await supabase.functions.invoke('admin-staff-management', {
          body: {
            action: 'delete-staff-account',
            payload: { targetUserId: deleteTarget.id }
          }
        });
        if (fnErr) {
          console.warn('[StaffDriversView] Edge function delete notice:', fnErr.message);
        }
      }

      // 2. Perform profile cleanup safely (CASCADE removes profile automatically if Auth user is deleted)
      await supabase.from('profiles').delete().eq('id', deleteTarget.id);

      onDeleteStaff(deleteTarget.id);
      setDeleteTarget(null);
      setConfirmInput('');
      setSuccessMsg(`Account for ${deleteTarget.full_name || 'Staff member'} deleted permanently.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('[StaffDriversView] Exception during staff deletion:', err);
      setDeleteError(err.message || 'Failed to delete staff account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const admins = filteredStaffList.filter(u => u && u.role === 'admin');
  const kitchenStaff = filteredStaffList.filter(u => u && u.role === 'staff');
  const drivers = filteredStaffList.filter(u => u && u.role === 'driver');

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-[#1F2933]" style={{ backgroundColor: '#F2F3F0' }}>
      <div>
        <h1 className="text-2xl font-black text-[#252525] font-serif">Team Management</h1>
        <p className="text-xs text-[#5F6368]">Create, search, inspect, deactivate, or delete staff and delivery partner logins.</p>
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

        <form onSubmit={handleCreateAccount} className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
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
            <label className="block text-[11px] font-bold text-[#1F2933] mb-1">Email Address *</label>
            <input
              type="email"
              placeholder="e.g. rajesh@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

      {/* Admin Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DDD6C8] shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-[#5F6368] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search staff by Email, Phone, or Full Name..."
          className="w-full text-xs text-[#1F2933] placeholder-[#5F6368] bg-transparent outline-none font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-[#5F6368] hover:text-[#1F2933] font-bold cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Admins List */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase text-[#5F6368] tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#B8862D]" />
          <span>Admins ({admins.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onToggleActive={onToggleActive}
              onRequestDelete={(usr) => {
                setDeleteTarget(usr);
                setConfirmInput('');
                setDeleteError('');
              }}
            />
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
            <UserCard
              key={u.id}
              user={u}
              onToggleActive={onToggleActive}
              onRequestDelete={(usr) => {
                setDeleteTarget(usr);
                setConfirmInput('');
                setDeleteError('');
              }}
            />
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
            <UserCard
              key={u.id}
              user={u}
              onToggleActive={onToggleActive}
              onRequestDelete={(usr) => {
                setDeleteTarget(usr);
                setConfirmInput('');
                setDeleteError('');
              }}
            />
          ))}
        </div>
      </div>

      {/* Permanent Account Deletion Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-[#DDD6C8] text-[#1F2933] space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-extrabold">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-serif">Permanently Delete Account</h3>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-[#5F6368] hover:text-[#1F2933] p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#5F6368] leading-relaxed">
              <p className="font-bold text-[#1F2933]">
                Are you sure you want to delete <span className="text-rose-600 font-extrabold">{deleteTarget.full_name || deleteTarget.email}</span>?
              </p>
              <div className="p-3 bg-[#FDE2E1] border border-[#F5A6A1] text-[#922B21] rounded-2xl text-[11px] space-y-1">
                <p className="font-bold">⚠️ IRREVERSIBLE ACTION:</p>
                <p>• Removes Supabase Auth login record permanently.</p>
                <p>• Preserves historical business orders and delivery records safely.</p>
              </div>
              <p className="pt-2">Type <strong className="text-[#1F2933] font-mono font-bold">DELETE</strong> below to confirm:</p>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DELETE"
                className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl font-mono text-xs font-bold text-[#1F2933] outline-none focus:border-rose-600"
              />
              {deleteError && (
                <p className="text-rose-600 font-bold text-[11px] pt-1">{deleteError}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-[#9F988A] hover:bg-[#F0E8D8] text-[#1F2933] font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting || confirmInput.trim().toUpperCase() !== 'DELETE'}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserCard: React.FC<{
  user: UserProfile;
  onToggleActive: (id: string) => void;
  onRequestDelete: (user: UserProfile) => void;
}> = ({ user, onToggleActive, onRequestDelete }) => {
  const [isToggling, setIsToggling] = useState(false);
  const [authMeta, setAuthMeta] = useState<AuthMetadata | null>(null);

  useEffect(() => {
    let active = true;
    const fetchMeta = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-staff-management', {
          body: {
            action: 'get-auth-metadata',
            payload: { userId: user.id }
          }
        });
        if (!error && data && active) {
          setAuthMeta(data);
        }
      } catch {
        // Edge function optional fallback
      }
    };
    void fetchMeta();
    return () => { active = false; };
  }, [user.id]);

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggleActive(user.id);
    } finally {
      setIsToggling(false);
    }
  };

  const roleName = user?.role || 'staff';
  const isActive = user?.is_active ?? true;
  const isEmailVerified = authMeta?.is_email_verified ?? user?.is_whatsapp_verified ?? true;

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#DDD6C8] shadow-sm flex flex-col justify-between space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-extrabold text-[#1F2933] text-sm">{user?.full_name || 'Team Member'}</h3>
          <p className="text-xs text-[#D95F0A] font-mono truncate max-w-[180px]">{user?.email || `@${user.phone}`}</p>
          <p className="text-[11px] text-[#5F6368] font-mono mt-0.5">{user?.phone || 'No phone set'}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
          roleName === 'admin' ? 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]' :
          roleName === 'driver' ? 'bg-[#E8F1FA] text-[#2563A6] border-[#8FB6D9]' : 'bg-[#F7F4EC] text-[#1F2933] border-[#DDD6C8]'
        }`}>
          {roleName}
        </span>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-[#DDD6C8] text-[11px] text-[#5F6368] font-mono">
        <div className="flex justify-between items-center">
          <span>Auth User ID:</span>
          <span className="font-bold text-[#1F2933] truncate max-w-[120px]" title={user.id}>{user.id.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Email Verified:</span>
          <span className={`font-bold ${isEmailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isEmailVerified ? '✓ Verified' : '⚠ Unverified'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Account Status:</span>
          <span className={`font-bold ${isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {user.created_at && (
          <div className="flex justify-between items-center">
            <span>Created:</span>
            <span>{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        )}
        {authMeta?.last_sign_in_at && (
          <div className="flex justify-between items-center">
            <span>Last Sign In:</span>
            <span>{new Date(authMeta.last_sign_in_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-[#DDD6C8] text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#1F2933]">Deactivate / Activate</span>
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              isActive ? 'bg-[#D95F0A] justify-end' : 'bg-[#DDD6C8] justify-start'
            } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
            title={`Click to ${isActive ? 'Deactivate' : 'Activate'}`}
          >
            <span className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className="py-1.5 bg-white hover:bg-[#F0E8D8] text-[#1F2933] border border-[#9F988A] font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <UserX className="w-3 h-3 text-[#D95F0A]" /> {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onRequestDelete(user)}
            className="py-1.5 bg-[#FDE2E1] hover:bg-[#F5A6A1] text-[#922B21] border border-[#F5A6A1] font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};


