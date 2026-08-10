import React from 'react';
import { useRestaurantSettings } from '../../context/RestaurantSettingsContext';
import { MessageSquare, PhoneCall, PartyPopper } from 'lucide-react';
import { HomepageSection } from '../../types';

interface EventsSectionProps {
  section?: HomepageSection;
}

export const EventsSection: React.FC<EventsSectionProps> = ({ section }) => {
  const { restaurantSettings } = useRestaurantSettings();
  const phone = restaurantSettings.contact_phone || '8569955929';
  const whatsapp = restaurantSettings.whatsapp_numbers || '8569955929';

  if (section && section.is_visible === false) {
    return null;
  }

  const title = section?.title || 'Celebrate Your Special Moments';
  const subtitle = section?.subtitle || 'CELEBRATIONS & VENUE';
  const description =
    section?.description ||
    "From intimate birthday gatherings to grand family functions and corporate meetups, Trippy's Mehfill offers full event planning, venue setups, and exquisite multi-cuisine catering at GLS Sohna.";

  return (
    <section id="events-section" className="py-16 bg-[#121212] text-[#F7F2E8] border-b border-[#333333] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] text-xs font-black tracking-widest uppercase">
            <PartyPopper className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{subtitle}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            {title}
          </h2>

          <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
            {description}
          </p>
        </div>

        {/* Event Types Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#C5A059]/20 hover:border-[#C5A059] transition-all text-center space-y-3 shadow-lg group hover:-translate-y-1">
            <div className="text-4xl group-hover:scale-110 transition-transform">🎂</div>
            <h3 className="text-base font-black font-serif text-white">Birthday Parties</h3>
            <p className="text-[11px] text-gray-400 leading-snug">Themed decoration, custom menus & cake arrangements.</p>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#C5A059]/20 hover:border-[#C5A059] transition-all text-center space-y-3 shadow-lg group hover:-translate-y-1">
            <div className="text-4xl group-hover:scale-110 transition-transform">🎉</div>
            <h3 className="text-base font-black font-serif text-white">Private Celebrations</h3>
            <p className="text-[11px] text-gray-400 leading-snug">Exclusive spaces, music setup & custom catering.</p>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#C5A059]/20 hover:border-[#C5A059] transition-all text-center space-y-3 shadow-lg group hover:-translate-y-1">
            <div className="text-4xl group-hover:scale-110 transition-transform">🏢</div>
            <h3 className="text-base font-black font-serif text-white">Corporate Events</h3>
            <p className="text-[11px] text-gray-400 leading-snug">Team dinners, milestone achievements & buffet catering.</p>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#C5A059]/20 hover:border-[#C5A059] transition-all text-center space-y-3 shadow-lg group hover:-translate-y-1">
            <div className="text-4xl group-hover:scale-110 transition-transform">👨‍👩‍👧</div>
            <h3 className="text-base font-black font-serif text-white">Family Functions</h3>
            <p className="text-[11px] text-gray-400 leading-snug">Warm hospitality, multi-cuisine spreads & seating.</p>
          </div>

          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-[#C5A059]/20 hover:border-[#C5A059] transition-all text-center space-y-3 shadow-lg group hover:-translate-y-1">
            <div className="text-4xl group-hover:scale-110 transition-transform">🌙</div>
            <h3 className="text-base font-black font-serif text-white">Late-Night Parties</h3>
            <p className="text-[11px] text-gray-400 leading-snug">Extended night stays & continuous food availability.</p>
          </div>
        </div>

        {/* Booking Banner CTA */}
        <div className="bg-gradient-to-r from-[#1A1A1A] via-[#222222] to-[#1A1A1A] rounded-3xl p-8 border border-[#C5A059]/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl font-black font-serif text-white">
              Planning an Event or Birthday Function?
            </h3>
            <p className="text-xs text-gray-300">
              Speak with our event coordinator to customize your food menu, seating preferences, and event timings.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://wa.me/91${whatsapp}?text=${encodeURIComponent("Hello! I would like to plan an event/birthday celebration at Trippy's Mehfill.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-black font-extrabold text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-black" />
              <span>{section?.button_text || 'WhatsApp Us'}</span>
            </a>

            <a
              href={`tel:${phone}`}
              className="px-6 py-3.5 bg-[#C5A059] hover:bg-[#b58f48] text-black font-extrabold text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{section?.secondary_button_text || `Call +91 ${phone}`}</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};
