import React from 'react';
import { useRestaurantSettings } from '../../context/RestaurantSettingsContext';
import { MapPin, Phone, MessageSquare, Mail, Utensils } from 'lucide-react';

interface FooterProps {
  onNavigateToSection?: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateToSection }) => {
  const { restaurantSettings } = useRestaurantSettings();

  const handleNavClick = (sectionId: string) => {
    if (onNavigateToSection) {
      onNavigateToSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const phone = restaurantSettings.contact_phone || '8569955929';
  const whatsapp = restaurantSettings.whatsapp_numbers || '8569955929';
  const address = restaurantSettings.address || 'GLS Arawali Homes, Damdama Lake Road, Sohna Rural, Haryana 122103';
  const restaurantName = restaurantSettings.restaurant_name || "Trippy's Mehfill";
  const brandTitle = restaurantSettings.brand_title || "CLOUD KITCHEN ERP";

  return (
    <footer className="bg-[#0B0B0B] text-[#F7F2E8] border-t border-[#C5A059]/30 pt-14 pb-8 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 3-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12 border-b border-[#333333]">
          
          {/* Column 1: Restaurant Branding & Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/40 flex items-center justify-center p-1.5 overflow-hidden shadow-md">
                {restaurantSettings.logo_url ? (
                  <img
                    src={restaurantSettings.logo_url}
                    alt={restaurantName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Utensils className="w-6 h-6 text-[#C5A059]" />
                )}
              </div>
              <div>
                <span className="block text-[10px] font-black text-[#C5A059] tracking-widest uppercase">
                  {brandTitle}
                </span>
                <span className="text-xl font-black font-serif text-white tracking-tight">
                  {restaurantName}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Authentic multi-cuisine food, continental chef's specials, memorable birthday celebrations, function hall events, and comfortable guest-house stays at GLS Sohna.
            </p>

            <div className="flex items-center gap-2 text-xs text-[#C5A059] font-semibold pt-1">
              <MapPin className="w-4 h-4 shrink-0 text-[#C5A059]" />
              <span>GLS Sohna, Haryana</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-black font-serif uppercase tracking-widest text-[#C5A059] border-b border-[#C5A059]/20 pb-2 inline-block">
              Quick Links
            </h3>
            <ul className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-300">
              <li>
                <button
                  onClick={() => handleNavClick('menu-section')}
                  className="hover:text-[#C5A059] transition-colors py-1 cursor-pointer flex items-center gap-1.5 text-left"
                >
                  <span>🍽️</span>
                  <span>Menu</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('gallery-section')}
                  className="hover:text-[#C5A059] transition-colors py-1 cursor-pointer flex items-center gap-1.5 text-left"
                >
                  <span>✨</span>
                  <span>Gallery</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('events-section')}
                  className="hover:text-[#C5A059] transition-colors py-1 cursor-pointer flex items-center gap-1.5 text-left"
                >
                  <span>🎉</span>
                  <span>Events & Parties</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('hall-section')}
                  className="hover:text-[#C5A059] transition-colors py-1 cursor-pointer flex items-center gap-1.5 text-left"
                >
                  <span>🏛️</span>
                  <span>Function Hall</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('guesthouse-section')}
                  className="hover:text-[#C5A059] transition-colors py-1 cursor-pointer flex items-center gap-1.5 text-left"
                >
                  <span>🏨</span>
                  <span>Guest House</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('offers-section')}
                  className="hover:text-[#C5A059] transition-colors py-1 cursor-pointer flex items-center gap-1.5 text-left"
                >
                  <span>🔥</span>
                  <span>Offers</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick('contact-section')}
                  className="hover:text-[#C5A059] transition-colors py-1 cursor-pointer flex items-center gap-1.5 text-left"
                >
                  <span>📍</span>
                  <span>Contact</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-black font-serif uppercase tracking-widest text-[#C5A059] border-b border-[#C5A059]/20 pb-2 inline-block">
              Contact Information
            </h3>
            <ul className="space-y-3 text-xs text-gray-300">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase font-bold">Phone</span>
                  <a href={`tel:${phone}`} className="font-extrabold text-white hover:text-[#C5A059]">
                    +91 {phone}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase font-bold">WhatsApp</span>
                  <a
                    href={`https://wa.me/91${whatsapp}?text=${encodeURIComponent("Hello Trippy's Mehfill, I have an inquiry.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-extrabold text-white hover:text-[#25D366]"
                  >
                    +91 {whatsapp}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase font-bold">Email</span>
                  <a href="mailto:trippysmehfill.kitchen@gmail.com" className="font-semibold text-white hover:text-[#C5A059]">
                    trippysmehfill.kitchen@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase font-bold">Address</span>
                  <p className="text-gray-300 font-medium leading-tight">
                    {address}
                  </p>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>© 2026 Trippy's Mehfill. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-center sm:text-right">
            <span className="text-gray-400">
              Designed & Developed by <strong className="text-white font-extrabold">Naga Pavan Kumar</strong>
            </span>
            <span className="hidden sm:inline text-gray-600">|</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-[#C5A059] font-bold">Support:</span>
              <a
                href="https://wa.me/916301196547"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-[#25D366] font-mono text-[11px]"
              >
                WA: 6301196547
              </a>
              <span className="text-gray-600">•</span>
              <a
                href="https://wa.me/919030196547"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-[#25D366] font-mono text-[11px]"
              >
                9030196547
              </a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
