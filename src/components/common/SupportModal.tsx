import React from 'react';
import { X, Phone, Mail, MapPin, Clock, MessageSquare, ShieldCheck, HelpCircle } from 'lucide-react';
import { openWhatsAppSupport } from '../../lib/whatsapp';
import { useRestaurantSettings } from '../../context/RestaurantSettingsContext';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { restaurantSettings } = useRestaurantSettings();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#121212] border border-white/15 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative text-gray-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-3 bg-gradient-to-br from-[#C5A059] to-orange-600 rounded-2xl text-black font-extrabold shadow-lg">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-serif text-white">{restaurantSettings.restaurant_name} Support</h2>
            <p className="text-xs text-gray-400">24/7 Cloud Kitchen Hotline & Hostel Delivery Assistance</p>
          </div>
        </div>

        {/* Direct Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openWhatsAppSupport()}
            className="p-4 bg-[#181818] hover:bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 transition group text-left w-full cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Kitchen Hotline / WhatsApp</p>
              <p className="text-sm font-extrabold text-white font-mono">{restaurantSettings.whatsapp_numbers || restaurantSettings.primary_contact}</p>
            </div>
          </button>

          <a
            href="mailto:trippysmehfill.kitchen@gmail.com"
            className="p-4 bg-[#181818] hover:bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 transition group"
          >
            <div className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Email Support</p>
              <p className="text-xs font-extrabold text-white truncate max-w-[160px]">trippysmehfill.kitchen@gmail.com</p>
            </div>
          </a>
        </div>

        {/* Operating Hours & Location */}
        <div className="p-4 bg-[#181818] border border-white/10 rounded-2xl space-y-3 text-xs">
          <div className="flex items-center gap-2 text-[#C5A059] font-bold">
            <Clock className="w-4 h-4" />
            <span>Kitchen Hours: 10:00 AM – 02:00 AM (Late Night Delivery Available)</span>
          </div>

          <div className="flex items-start gap-2 text-gray-300">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <span>{restaurantSettings.address}</span>
          </div>
        </div>

        {/* FAQ Quick Accordions */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Frequently Asked Questions</h3>
          
          <div className="p-3 bg-[#181818] rounded-xl border border-white/10 space-y-1 text-xs">
            <p className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              How do hostel room deliveries work?
            </p>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Our assigned delivery partners will deliver hot food directly to your hostel gate or room entrance. Provide your exact room number during checkout.
            </p>
          </div>

          <div className="p-3 bg-[#181818] rounded-xl border border-white/10 space-y-1 text-xs">
            <p className="font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              How do I track my live order status?
            </p>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Click on "Order History" or "Track Orders" in your user account menu to view real-time cooking and delivery updates.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-2xl shadow-lg transition text-xs"
          >
            Close Support Panel
          </button>
        </div>

      </div>
    </div>
  );
};
