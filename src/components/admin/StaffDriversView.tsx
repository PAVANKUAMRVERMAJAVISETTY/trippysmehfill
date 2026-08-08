import React, { useState } from 'react';
import { UserProfile, UserRole } from '../../types';
import { UserPlus, Shield, ChefHat, Bike, Key, Edit, Trash2, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface StaffDriversViewProps {
  staffList: UserProfile[];
  onAddStaff: (user: UserProfile) => void;
  onToggleActive: (userId: string) => void;
  onDeleteStaff: (userId: string) => void;
}

export const StaffDriversView: React.FC<StaffDriversViewProps> = ({
  staffList,
  onAddStaff,
  onToggleActive,
  onDeleteStaff
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    // Phone required rather than defaulted -- it fell back to '9876543210',
    // giving a staff record a contact number that belongs to nobody.
    if (!fullName || !phone.trim()) return;

    const newStaff: UserProfile = {
      id: 'staff-' + Date.now(),
      email: `${fullName.toLowerCase().replace(/\s+/g, '')}@trippys.com`,
      full_name: fullName,
      phone: phone.trim(),
      role,
      is_approved: true,
      is_active: true
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').insert([newStaff]);
      } catch (err) {
        console.error('Failed to create staff in Supabase', err);
      }
    }

    onAddStaff(newStaff);

    setFullName('');
    setPhone('');
    setPassword('');
  };

  const admins = staffList.filter(u => u.role === 'admin');
  const kitchenStaff = staffList.filter(u => u.role === 'staff');
  const drivers = staffList.filter(u => u.role === 'driver');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-serif">Team</h1>
        <p className="text-xs text-gray-500">Create staff and delivery partner logins.</p>
      </div>

      {/* Creation Form Box matching video frame 2:26 */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-bold text-gray-900 text-sm">Create Account</h3>
        <form onSubmit={handleCreateAccount} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          <input
            type="text"
            placeholder="FullName / User ID"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500"
          />
          <input
            type="text"
            placeholder="Phone [optional]"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 font-bold"
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff (Kitchen)</option>
            <option value="driver">Driver (Delivery)</option>
          </select>

          <button
            type="submit"
            className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition"
          >
            Create account
          </button>
        </form>
      </div>

      {/* Admins List matching video frame 2:26 */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-orange-600" />
          <span>Admins ({admins.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((u) => (
            <UserCard key={u.id} user={u} onToggleActive={onToggleActive} onDeleteStaff={onDeleteStaff} />
          ))}
        </div>
      </div>

      {/* Staffs List matching video frame 2:26 */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-amber-600" />
          <span>Staffs ({kitchenStaff.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kitchenStaff.map((u) => (
            <UserCard key={u.id} user={u} onToggleActive={onToggleActive} onDeleteStaff={onDeleteStaff} />
          ))}
        </div>
      </div>

      {/* Delivery Partners List matching video frame 2:28 */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-2">
          <Bike className="w-4 h-4 text-blue-600" />
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
  return (
    <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex flex-col justify-between space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-extrabold text-gray-900 text-sm">{user.full_name}</h3>
          <p className="text-xs text-orange-600 font-mono">@{user.phone || user.email.split('@')[0]}</p>
          <p className="text-[11px] text-gray-500 font-mono mt-0.5">{user.phone}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
          user.role === 'admin' ? 'bg-orange-100 text-orange-800' :
          user.role === 'driver' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {user.role}
        </span>
      </div>

      {/* Action Controls matching video frame 2:26 */}
      <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-700">Active</span>
          <button
            onClick={() => onToggleActive(user.id)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              user.is_active ? 'bg-orange-600 justify-end' : 'bg-gray-300 justify-start'
            }`}
          >
            <span className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button className="py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1">
            <Edit className="w-3 h-3" /> Edit
          </button>
          <button className="py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1">
            <Key className="w-3 h-3" /> Reset
          </button>
          <button
            onClick={() => onDeleteStaff(user.id)}
            className="py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};
