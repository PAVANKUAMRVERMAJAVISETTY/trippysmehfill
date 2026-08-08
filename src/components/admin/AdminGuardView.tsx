import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminGuardViewProps {
  onRequireAuth: () => void;
  onGoToMenu: () => void;
}

export const AdminGuardView: React.FC<AdminGuardViewProps> = ({
  onRequireAuth,
  onGoToMenu
}) => {
  const { user, switchDemoRole } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 text-[#1F2933]" style={{ backgroundColor: '#F5F1E8' }}>
      <div className="max-w-md w-full bg-white border border-[#D8D2C5] rounded-3xl p-8 text-center shadow-xl space-y-6 relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#FFF0CC] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#FFF0CC] rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon Badge */}
        <div className="w-16 h-16 bg-[#FFF0CC] border border-[#E8C66A] rounded-2xl flex items-center justify-center mx-auto text-[#8A5A00] shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-[#FFF0CC] border border-[#E8C66A] text-[#8A5A00] text-[10px] font-black uppercase tracking-widest rounded-full">
            Restricted Portal
          </span>
          <h2 className="text-2xl font-black text-[#1F2933] font-serif tracking-tight">
            Admin Access Only
          </h2>
          <p className="text-xs text-[#5F6368] leading-relaxed max-w-sm mx-auto">
            {user ? (
              <>
                You are currently signed in as <span className="font-bold text-[#1F2933]">{user.full_name}</span> ({user.role}). This section is strictly restricted to Administrator accounts.
              </>
            ) : (
              'The Trippy\'s Mehfill Cloud Kitchen ERP is strictly restricted to authorized Administrator accounts.'
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onRequireAuth}
            className="w-full py-3 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold text-xs rounded-2xl border border-[#B94D00] shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Admin Account</span>
          </button>

          <button
            onClick={onGoToMenu}
            className="w-full py-3 bg-white hover:bg-[#F0E8D8] text-[#1F2933] font-bold text-xs rounded-2xl border border-[#9F988A] flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Food Menu</span>
          </button>
        </div>

        {/* Development-only role switcher. */}
        {import.meta.env.DEV && (
          <div className="pt-4 border-t border-[#DDD6C8] space-y-2">
            <p className="text-[10px] text-[#5F6368] uppercase tracking-wider font-bold">
              Demo Environment Quick Switch
            </p>
            <button
              onClick={() => switchDemoRole('admin')}
              className="px-4 py-1.5 bg-[#FFF0CC] hover:bg-[#FFE5A3] text-[#8A5A00] font-extrabold text-xs rounded-xl border border-[#E8C66A] transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Switch Role to Admin</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
