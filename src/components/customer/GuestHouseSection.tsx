import React from 'react';
import { useRestaurantSettings } from '../../context/RestaurantSettingsContext';
import { Hotel, MessageSquare, PhoneCall } from 'lucide-react';
import { HomepageSection } from '../../types';

interface GuestHouseSectionProps {
  section?: HomepageSection;
}

export const GuestHouseSection: React.FC<GuestHouseSectionProps> = ({ section }) => {
  const { restaurantSettings } = useRestaurantSettings();
  const phone = restaurantSettings.contact_phone || '8569955929';
  const whatsapp = restaurantSettings.whatsapp_numbers || '8569955929';

  if (section && section.is_visible === false) {
    return null;
  }

  const title = section?.title || 'Stay Comfortable at GLS Sohna';
  const subtitle = section?.subtitle || 'GUEST ACCOMMODATIONS';
  const description =
    section?.description ||
    'Whether visiting for campus events, late-night stays, or regional trips in Sohna, our guest house rooms offer clean, comfortable, and peaceful accommodations with direct food delivery from our kitchen.';
  const imageUrl =
    section?.image_url ||
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80';

  return (
    <section id="guesthouse-section" className="py-16 bg-[#121212] text-[#F7F2E8] border-b border-[#333333] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] text-xs font-black tracking-widest uppercase">
            <Hotel className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{subtitle}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            {title}
          </h2>

          <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
            {description}
          </p>
        </div>

        {/* Features Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#C5A059]/30 hover:border-[#C5A059] transition-all space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-2xl">
              🛏️
            </div>
            <h3 className="text-lg font-black font-serif text-white">Comfortable Rooms</h3>
            <p className="text-xs text-gray-400 leading-snug">Well-maintained rooms with fresh linen and peaceful surroundings.</p>
          </div>

          <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#C5A059]/30 hover:border-[#C5A059] transition-all space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-2xl">
              🌙
            </div>
            <h3 className="text-lg font-black font-serif text-white">Late-Night Stay</h3>
            <p className="text-xs text-gray-400 leading-snug">Flexibility for late arrivals, night-time stays, and event guests.</p>
          </div>

          <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#C5A059]/30 hover:border-[#C5A059] transition-all space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-2xl">
              🍲
            </div>
            <h3 className="text-lg font-black font-serif text-white">In-Room Food Service</h3>
            <p className="text-xs text-gray-400 leading-snug">Direct food delivery service from Trippy's Mehfill cloud kitchen.</p>
          </div>

          <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#C5A059]/30 hover:border-[#C5A059] transition-all space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-2xl">
              📍
            </div>
            <h3 className="text-lg font-black font-serif text-white">Convenient Location</h3>
            <p className="text-xs text-gray-400 leading-snug">Located at GLS Arawali Homes, Damdama Lake Road, Sohna Rural.</p>
          </div>
        </div>

        {/* Room Gallery & Booking Banner */}
        <div className="bg-[#1A1A1A] rounded-3xl p-6 sm:p-8 border border-[#C5A059]/40 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-[#C5A059]/30 aspect-video shadow-lg">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover object-center select-none"
            />
          </div>

          <div className="lg:col-span-6 space-y-4 text-center lg:text-left">
            <h3 className="text-2xl font-black font-serif text-white">
              Need Room Accommodations at GLS Sohna?
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              For room availability, check-in details, and stay reservations, connect directly with our hospitality desk.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <a
                href={`https://wa.me/91${whatsapp}?text=${encodeURIComponent("Hello! I want to enquire about Guest House rooms at GLS Sohna.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 bg-[#FF5722] hover:bg-[#E64A19] text-white font-extrabold text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>{section?.button_text || 'Enquire About Rooms'}</span>
              </a>

              <a
                href={`tel:${phone}`}
                className="px-6 py-3.5 bg-[#121212] hover:bg-[#222222] text-[#C5A059] border border-[#C5A059]/40 font-extrabold text-xs rounded-2xl transition flex items-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{section?.secondary_button_text || `Call Desk +91 ${phone}`}</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
