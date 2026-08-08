import React from 'react';
import { X, Clock, Utensils, Lock } from 'lucide-react';
import { KitchenSettings } from '../../types';

interface ClosedRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: KitchenSettings;
}

export const ClosedRestaurantModal: React.FC<ClosedRestaurantModalProps> = ({
  isOpen,
  onClose,
  settings
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white border border-[#DDD6C8] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-center relative text-[#1F2933]">
        
        {/* Close Icon Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#F7F4EC] hover:bg-[#F0E8D8] text-[#5F6368] transition border border-[#DDD6C8] cursor-pointer"
          title="Browse Menu Only"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Closed Icon Header */}
        <div className="w-16 h-16 rounded-full bg-[#E8F1FA] text-[#2563A6] border border-[#8FB6D9] flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8 text-[#2563A6]" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8F1FA] border border-[#8FB6D9] text-[#1E4F7A] text-xs font-black uppercase tracking-wider font-mono">
            <span>RESTAURANT IS CURRENTLY CLOSED</span>
          </div>
          <h2 className="text-2xl font-black font-serif text-[#1F2933]">We are currently not accepting orders.</h2>
          <p className="text-xs text-[#5F6368] leading-relaxed max-w-md mx-auto">
            {settings.closed_banner_message || 'Please visit us again during business hours.'}
          </p>
        </div>

        {/* Operating Hours Box */}
        <div className="bg-[#F7F4EC] p-4 rounded-2xl border border-[#DDD6C8] space-y-2">
          <div className="flex items-center justify-center gap-2 text-[#B8862D] font-extrabold text-xs">
            <Clock className="w-4 h-4" />
            <span>Kitchen Operating Hours</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
            <div className="bg-white p-3 rounded-xl border border-[#DDD6C8] space-y-0.5 shadow-sm">
              <span className="text-[10px] text-[#5F6368] uppercase font-bold block">Opening Time</span>
              <span className="text-[#198754] font-black text-sm">{settings.opening_time || '09:00 AM'}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#DDD6C8] space-y-0.5 shadow-sm">
              <span className="text-[10px] text-[#5F6368] uppercase font-bold block">Closing Time</span>
              <span className="text-[#C0392B] font-black text-sm">{settings.closing_time || '10:00 PM'}</span>
            </div>
          </div>
        </div>

        {/* Browse Menu Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold text-xs rounded-2xl shadow-md border border-[#B94D00] transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Utensils className="w-4 h-4" />
          <span>Browse Menu Only</span>
        </button>

      </div>
    </div>
  );
};
