import React, { useState, useEffect } from 'react';
import { Search, MapPin, Sparkles, Utensils, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRestaurantSettings } from '../../context/RestaurantSettingsContext';

interface CustomerWelcomeHeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
}

export const CustomerWelcomeHero: React.FC<CustomerWelcomeHeroProps> = ({
  searchQuery,
  setSearchQuery,
  selectedLocation,
  setSelectedLocation,
}) => {
  const { user } = useAuth();
  const { restaurantSettings } = useRestaurantSettings();
  const [greeting, setGreeting] = useState('Good Evening');
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const customerName = user?.full_name || user?.email?.split('@')[0] || 'Foodie';

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSelectedLocation(
            `GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}) - GLS Sohna, Haryana`
          );
          setIsLocating(false);
        },
        () => {
          setSelectedLocation('GLS Arawali Homes, Damdama Lake Rd, Sohna');
          setIsLocating(false);
        }
      );
    } else {
      setSelectedLocation('GLS Arawali Homes, Damdama Lake Rd, Sohna');
      setIsLocating(false);
    }
  };

  return (
    <section className="bg-gradient-to-b from-[#1A1A1A] via-[#161616] to-[#121212] border-b border-[#C5A059]/30 py-8 px-4 sm:px-6 lg:px-8 text-[#F7F2E8] select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Welcome Greeting & Location Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{greeting}, {customerName}! 👋</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-serif tracking-tight text-white">
              What would you like to eat today?
            </h1>
            <p className="text-xs text-gray-300 font-medium">
              Freshly prepared multi-cuisine delicacies by our chefs at Trippy's Mehfill.
            </p>
          </div>

          {/* Compact Delivery Location Selector */}
          <div className="bg-[#121212] border border-[#C5A059]/30 rounded-2xl p-3 flex items-center gap-3 shrink-0 shadow-lg">
            <div className="w-9 h-9 rounded-xl bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-0.5">
              <span className="block text-[10px] text-[#C5A059] font-black uppercase tracking-wider">Delivery Location</span>
              <span className="font-bold text-white max-w-[220px] truncate block" title={selectedLocation}>
                {selectedLocation || 'GLS Arawali Homes, Sohna'}
              </span>
            </div>
            <button
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="px-2.5 py-1.5 bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-[#C5A059] text-[10px] font-extrabold rounded-lg transition border border-[#C5A059]/40 shrink-0"
            >
              {isLocating ? 'Locating...' : 'GPS'}
            </button>
          </div>
        </div>

        {/* Live Food Search Bar */}
        <div className="relative max-w-3xl">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-4 text-[#C5A059] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes (e.g. Biryani, Pizza, Burger, Frankie, Pasta)..."
              className="w-full bg-[#1A1A1A] border-2 border-[#C5A059]/40 hover:border-[#C5A059] focus:border-[#C5A059] text-white placeholder-gray-400 font-bold text-xs sm:text-sm rounded-2xl pl-12 pr-10 py-3.5 shadow-2xl transition outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 p-1 text-gray-400 hover:text-white bg-white/10 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
            <span className="text-[#C5A059] font-bold">Popular:</span>
            <button onClick={() => setSearchQuery('Biryani')} className="hover:text-white underline">Biryani</button>
            <span>•</span>
            <button onClick={() => setSearchQuery('Pizza')} className="hover:text-white underline">Pizza</button>
            <span>•</span>
            <button onClick={() => setSearchQuery('Burger')} className="hover:text-white underline">Burger</button>
            <span>•</span>
            <button onClick={() => setSearchQuery('Frankie')} className="hover:text-white underline">Frankie</button>
          </div>
        </div>

      </div>
    </section>
  );
};
