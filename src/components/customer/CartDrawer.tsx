import React from 'react';
import { X } from 'lucide-react';
import { RightOrderPanel } from './RightOrderPanel';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth?: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onRequireAuth = () => {},
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#121212] text-gray-200 w-full max-w-lg h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-white/10 relative">

        {/* Drawer Header Close Bar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0d0d0d]">
          <span className="text-xs font-black uppercase text-[#C5A059] tracking-widest font-serif">
            Your Cart
          </span>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <RightOrderPanel
            isDrawer={true}
            onCloseDrawer={onClose}
            onRequireAuth={onRequireAuth}
            onProceedToCheckout={onProceedToCheckout}
          />
        </div>

      </div>
    </div>
  );
};
