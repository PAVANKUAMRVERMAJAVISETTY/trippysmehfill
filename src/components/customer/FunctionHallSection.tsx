import React from 'react';
import { useRestaurantSettings } from '../../context/RestaurantSettingsContext';
import { Landmark, CheckCircle, MessageSquare, PhoneCall } from 'lucide-react';
import { HomepageSection } from '../../types';

interface FunctionHallSectionProps {
  section?: HomepageSection;
}

export const FunctionHallSection: React.FC<FunctionHallSectionProps> = ({ section }) => {
  const { restaurantSettings } = useRestaurantSettings();
  const phone = restaurantSettings.contact_phone || '8569955929';
  const whatsapp = restaurantSettings.whatsapp_numbers || '8569955929';

  if (section && section.is_visible === false) {
    return null;
  }

  const title = section?.title || 'Spacious Function Hall at GLS Sohna';
  const subtitle = section?.subtitle || 'EVENT VENUE SHOWCASE';
  const description =
    section?.description ||
    'Host your next birthday party, private dinner, family gathering, or corporate function in our ambient event hall. Supported by our on-site cloud kitchen, we provide seamless catering, custom seating, and attentive service.';
  const imageUrl =
    section?.image_url ||
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80';

  return (
    <section id="hall-section" className="py-16 bg-[#161616] text-[#F7F2E8] border-b border-[#333333] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Narrative & Features */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] text-xs font-black tracking-widest uppercase">
              <Landmark className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{subtitle}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white leading-tight">
              {title}
            </h2>

            <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
              {description}
            </p>

            <ul className="space-y-3 text-xs text-gray-200 font-bold">
              <li className="flex items-center gap-3 bg-[#1A1A1A] p-3 rounded-xl border border-[#333333]">
                <CheckCircle className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>Flexible seating & birthday party decorations</span>
              </li>
              <li className="flex items-center gap-3 bg-[#1A1A1A] p-3 rounded-xl border border-[#333333]">
                <CheckCircle className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>In-house continental & multi-cuisine live catering</span>
              </li>
              <li className="flex items-center gap-3 bg-[#1A1A1A] p-3 rounded-xl border border-[#333333]">
                <CheckCircle className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>Audio-visual support & late-night event availability</span>
              </li>
            </ul>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={`https://wa.me/91${whatsapp}?text=${encodeURIComponent("Hello! I want to check availability & details for the Function Hall at GLS Sohna.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-[#C5A059] hover:bg-[#b58f48] text-black font-extrabold text-xs rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-black" />
                <span>{section?.button_text || 'Enquire Hall Availability'}</span>
              </a>

              <a
                href={`tel:${phone}`}
                className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#252525] text-white font-extrabold text-xs rounded-2xl border border-[#333333] transition flex items-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 text-[#C5A059]" />
                <span>{section?.secondary_button_text || 'Call Venue Manager'}</span>
              </a>
            </div>
          </div>

          {/* Right Column: Venue Image Grid */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="rounded-3xl overflow-hidden border-2 border-[#C5A059]/40 bg-[#1A1A1A] aspect-square shadow-xl">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover object-center select-none"
              />
            </div>
            <div className="rounded-3xl overflow-hidden border-2 border-[#C5A059]/40 bg-[#1A1A1A] aspect-square shadow-xl mt-6">
              <img
                src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80"
                alt="Function Hall Dining & Ambience"
                className="w-full h-full object-cover object-center select-none"
              />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
