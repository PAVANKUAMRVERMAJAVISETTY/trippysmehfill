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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#121212] border border-white/10 rounded-3xl p-8 text-center shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon Badge */}
        <div className="w-16 h-16 bg-[#181818] border border-[#C5A059]/40 rounded-2xl flex items-center justify-center mx-auto text-[#C5A059] shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full">
            Restricted Portal
          </span>
          <h2 className="text-2xl font-black text-white font-serif tracking-tight">
            Admin Access Only
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
            {user ? (
              <>
                You are currently signed in as <span className="font-bold text-gray-200">{user.full_name}</span> ({user.role}). This section is strictly restricted to Administrator accounts.
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
            className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-xs rounded-2xl shadow-lg shadow-[#C5A059]/20 flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Admin Account</span>
          </button>

          <button
            onClick={onGoToMenu}
            className="w-full py-3 bg-[#181818] hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Food Menu</span>
          </button>
        </div>

        {/* Development-only role switcher.
            switchDemoRole() already refuses to act outside development, so in
            production this rendered a button that did nothing while
            advertising, on a security screen, that role switching exists.
            Gated on the same flag so it is not rendered at all. */}
        {/* `import.meta.env.DEV` inline rather than the imported constant:
            Vite substitutes it literally at build time, so Rollup removes this
            whole branch from the bundle instead of merely never running it. */}
        {import.meta.env.DEV && (
          <div className="pt-4 border-t border-white/10 space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              Demo Environment Quick Switch
            </p>
            <button
              onClick={() => switchDemoRole('admin')}
              className="px-4 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-extrabold text-xs rounded-xl border border-amber-500/30 transition flex items-center justify-center gap-1.5 mx-auto"
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
