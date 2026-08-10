import React from 'react';
import { Utensils, PartyPopper, Landmark, Hotel, ChevronRight } from 'lucide-react';

export const CoreServicesSection: React.FC = () => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 bg-[#121212] text-[#F7F2E8] border-b border-[#333333] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-black text-[#C5A059] tracking-widest uppercase px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30">
            ALL-IN-ONE HOSPITALITY HUB
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white leading-tight">
            Everything You Need Under One Roof
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
            Experience premium multi-cuisine dining, memorable party celebrations, function hall venue hosting, and comfortable guest house stays at GLS Sohna.
          </p>
        </div>

        {/* 4 Premium Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Food & Dining */}
          <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#C5A059]/30 hover:border-[#C5A059] transition-all duration-300 shadow-xl flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                🍽️
              </div>
              <h3 className="text-xl font-black font-serif text-white tracking-tight group-hover:text-[#C5A059] transition-colors">
                FOOD & DINING
              </h3>
              <ul className="space-y-2 text-xs text-gray-300 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Continental cuisine
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Multi-cuisine dishes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Chef's specials
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Dine-in / takeaway
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Fast food delivery
                </li>
              </ul>
            </div>

            <button
              onClick={() => scrollToSection('menu-section')}
              className="mt-6 w-full py-3 bg-[#FF5722] hover:bg-[#E64A19] text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Menu</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Parties & Celebrations */}
          <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#C5A059]/30 hover:border-[#C5A059] transition-all duration-300 shadow-xl flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                🎉
              </div>
              <h3 className="text-xl font-black font-serif text-white tracking-tight group-hover:text-[#C5A059] transition-colors">
                PARTIES & CELEBRATIONS
              </h3>
              <ul className="space-y-2 text-xs text-gray-300 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Birthday parties
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Private celebrations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Family functions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Late-night celebrations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Custom event arrangements
                </li>
              </ul>
            </div>

            <button
              onClick={() => scrollToSection('events-section')}
              className="mt-6 w-full py-3 bg-[#C5A059] hover:bg-[#b58f48] text-black font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Plan a Party</span>
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
          </div>

          {/* Card 3: Function Hall */}
          <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#C5A059]/30 hover:border-[#C5A059] transition-all duration-300 shadow-xl flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                🏛️
              </div>
              <h3 className="text-xl font-black font-serif text-white tracking-tight group-hover:text-[#C5A059] transition-colors">
                FUNCTION HALL
              </h3>
              <ul className="space-y-2 text-xs text-gray-300 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Event space
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Birthday functions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Small gatherings
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Corporate events
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Catering support
                </li>
              </ul>
            </div>

            <button
              onClick={() => scrollToSection('hall-section')}
              className="mt-6 w-full py-3 bg-[#252525] hover:bg-[#333333] text-[#C5A059] border border-[#C5A059]/40 font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View Venue</span>
              <ChevronRight className="w-4 h-4 text-[#C5A059]" />
            </button>
          </div>

          {/* Card 4: Guest House */}
          <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#C5A059]/30 hover:border-[#C5A059] transition-all duration-300 shadow-xl flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#222222] border border-[#C5A059]/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                🏨
              </div>
              <h3 className="text-xl font-black font-serif text-white tracking-tight group-hover:text-[#C5A059] transition-colors">
                GUEST HOUSE
              </h3>
              <ul className="space-y-2 text-xs text-gray-300 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Comfortable rooms
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Late-night stay
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Family-friendly accommodation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Convenient location
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#C5A059]">✦</span> Food available
                </li>
              </ul>
            </div>

            <button
              onClick={() => scrollToSection('guesthouse-section')}
              className="mt-6 w-full py-3 bg-[#FF5722] hover:bg-[#E64A19] text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Rooms</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
