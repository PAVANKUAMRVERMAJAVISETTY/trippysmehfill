import React from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { useToast, ToastTone } from '../../context/ToastContext';

const toneStyles: Record<ToastTone, { ring: string; icon: React.ReactNode }> = {
  success: {
    ring: 'border-emerald-500/40 shadow-emerald-500/10',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
  },
  info: {
    ring: 'border-[#C5A059]/40 shadow-[#C5A059]/10',
    icon: <Info className="w-5 h-5 text-[#C5A059]" />
  },
  error: {
    ring: 'border-rose-500/40 shadow-rose-500/10',
    icon: <AlertCircle className="w-5 h-5 text-rose-400" />
  }
};

/**
 * Renders the toast stack.
 *
 * Sits bottom-centre on phones (above the sticky checkout bar) and top-right on
 * larger screens, so it never covers the primary action on the narrow layout.
 */
export const ToastHost: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed z-[60] pointer-events-none
                 inset-x-3 bottom-24 flex flex-col-reverse gap-2
                 sm:inset-x-auto sm:bottom-auto sm:top-4 sm:right-4 sm:w-80 sm:flex-col"
    >
      {toasts.map((toast) => {
        const tone = toneStyles[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto bg-[#121212] border ${tone.ring} rounded-2xl p-3.5
                        shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2
                        sm:slide-in-from-top-2`}
          >
            <span className="shrink-0 mt-0.5">{tone.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-white leading-snug">{toast.title}</p>
              {toast.description && (
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed break-words">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-1.5 -m-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
