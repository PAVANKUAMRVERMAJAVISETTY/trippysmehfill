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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white text-[#1F2933] w-full max-w-lg h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-[#DDD6C8] relative">

        {/* Drawer Header Close Bar */}
        <div className="p-4 border-b border-[#DDD6C8] flex items-center justify-between bg-[#F7F4EC]">
          <span className="text-xs font-black uppercase text-[#B8862D] tracking-widest font-serif">
            Your Cart
          </span>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="p-1.5 rounded-full text-[#5F6368] hover:text-[#1F2933] hover:bg-[#F0E8D8] transition border border-[#DDD6C8] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
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
