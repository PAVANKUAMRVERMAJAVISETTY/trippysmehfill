import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type ToastTone = 'success' | 'info' | 'error';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  /** ms before auto-dismiss; 0 keeps it until dismissed. */
  duration: number;
}

interface ToastContextValue {
  toasts: Toast[];
  /**
   * `key` makes a toast idempotent: pushing the same key twice shows it once.
   * Order-status toasts are derived from a list that re-renders often, so
   * without it the same "Kitchen accepted" would fire on every refetch.
   */
  showToast: (input: {
    title: string;
    description?: string;
    tone?: ToastTone;
    duration?: number;
    key?: string;
  }) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const MAX_VISIBLE = 3;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenKeys = useRef<Set<string>>(new Set());
  const counter = useRef(0);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback<ToastContextValue['showToast']>(
    ({ title, description, tone = 'info' as ToastTone, duration = 5000, key }) => {
      if (key) {
        if (seenKeys.current.has(key)) return;
        seenKeys.current.add(key);
      }

      const id = `toast-${++counter.current}`;
      const toast: Toast = { id, title, description, tone, duration };

      // Newest first, capped -- a burst of status changes should not bury the page.
      setToasts((prev) => [toast, ...prev].slice(0, MAX_VISIBLE));

      if (duration > 0) {
        timers.current.set(id, setTimeout(() => dismissToast(id), duration));
      }
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
