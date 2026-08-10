import React from 'react';
import { useRestaurantSettings } from '../../context/RestaurantSettingsContext';
import { MapPin, Phone, MessageSquare, Mail, Compass } from 'lucide-react';
import { HomepageSection } from '../../types';

interface ContactSectionProps {
  section?: HomepageSection;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ section }) => {
  const { restaurantSettings } = useRestaurantSettings();

  if (section && section.is_visible === false) {
    return null;
  }

  const phone = restaurantSettings.contact_phone || '8569955929';
  const whatsapp = restaurantSettings.whatsapp_numbers || '8569955929';
  const email = restaurantSettings.email || 'trippysmehfill.kitchen@gmail.com';
  const address = restaurantSettings.address || 'GLS Arawali Homes, Damdama Lake Road, Sohna Rural, Haryana 122103';
  const restaurantName = restaurantSettings.restaurant_name || "Trippy's Mehfill";

  const title = section?.title || 'We Are Here For You';
  const subtitle = section?.subtitle || 'FIND & CONTACT US';
  const description =
    section?.description ||
    'Have questions about food delivery, birthday party venue bookings, catering menus, or guest house room stays? Reach out to us directly.';

  return (
    <section id="contact-section" className="py-16 bg-[#161616] text-[#F7F2E8] border-b border-[#333333] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] text-xs font-black tracking-widest uppercase">
            <Compass className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{subtitle}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            {title}
          </h2>

          <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Contact Details Card */}
          <div className="lg:col-span-6 bg-[#1A1A1A] p-8 rounded-3xl border border-[#C5A059]/40 shadow-2xl space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-xl font-black font-serif text-white tracking-tight border-b border-[#333333] pb-3">
                {restaurantName} Details
              </h3>

              <ul className="space-y-5 text-xs text-gray-300">
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">Customer Support & Orders</span>
                    <a href={`tel:${phone}`} className="text-sm font-extrabold text-white hover:text-[#C5A059] transition-colors">
                      +91 {phone}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#25D366]/40 flex items-center justify-center text-[#25D366] shrink-0">
                    <MessageSquare className="w-5 h-5 fill-[#25D366]" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">WhatsApp Direct Inquiry</span>
                    <a
                      href={`https://wa.me/91${whatsapp}?text=${encodeURIComponent("Hello! I want to inquire with Trippy's Mehfill.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-extrabold text-white hover:text-[#25D366] transition-colors"
                    >
                      +91 {whatsapp}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">Email Us</span>
                    <a href={`mailto:${email}`} className="text-xs sm:text-sm font-semibold text-white hover:text-[#C5A059] transition-colors">
                      {email}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">Location Address</span>
                    <p className="text-xs sm:text-sm font-medium text-white leading-relaxed">
                      {address}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Direct Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#333333]">
              <a
                href={`https://wa.me/91${whatsapp}?text=${encodeURIComponent("Hello! I want to chat on WhatsApp with Trippy's Mehfill.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-black" />
                <span>Chat on WhatsApp</span>
              </a>

              <a
                href={`tel:${phone}`}
                className="px-5 py-3 bg-[#C5A059] hover:bg-[#b58f48] text-black font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Call Us Now</span>
              </a>
            </div>
          </div>

          {/* Embedded Map Visual Card */}
          <div className="lg:col-span-6 bg-[#1A1A1A] rounded-3xl border border-[#C5A059]/40 shadow-2xl overflow-hidden relative flex flex-col">
            <div className="p-4 bg-[#222222] border-b border-[#333333] flex items-center justify-between">
              <span className="text-xs font-black font-serif text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C5A059]" />
                GLS Sohna Location Map
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[#C5A059] hover:underline"
              >
                Open in Google Maps ↗
              </a>
            </div>

            <div className="flex-1 min-h-[300px] w-full bg-[#121212] relative">
              <iframe
                title="GLS Sohna Location Map"
                src="https://maps.google.com/maps?q=GLS%20Arawali%20Homes%20Sohna&t=&z=15&ie=UTF-8&iwloc=&output=embed"
                className="w-full h-full border-0 absolute inset-0 filter grayscale invert contrast-125 opacity-80 hover:opacity-100 transition-opacity"
                loading="lazy"
              />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
