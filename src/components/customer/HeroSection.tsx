import React, { useState, useEffect } from 'react';
import { MapPin, Search, ChevronRight, Image as ImageIcon, Utensils } from 'lucide-react';

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  onLogoClick?: () => void;
  onOpenAuth?: () => void;
}

const HERO_SLIDES = [
  {
    title: "TRIPPY'S MEHFIL",
    subtitle: "Where every flavor tells a story. Order authentic Indian cuisine delivered fresh to your door.",
    badge: "CLOUD KITCHEN & FOOD DELIVERY",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "AUTHENTIC DUM BIRYANI",
    subtitle: "Aromatic basmati rice cooked with marinated chicken, saffron, and secret spices.",
    badge: "HYDERABAD SPECIAL",
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "KITCHEN & AMBIANCE",
    subtitle: "Our chefs preparing your favourite dishes with love, hygiene and perfection.",
    badge: "IN THE KITCHEN",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "DELICIOUS TANDOORI & DESSERTS",
    subtitle: "Hot kebabs, crispy samosas, and warm gulab jamuns prepared fresh every day.",
    badge: "FRESHLY PREPARED",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1600&q=80"
  }
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  selectedLocation,
  setSelectedLocation,
  onLogoClick
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLocating, setIsLocating] = useState(false);

  // Auto rotate slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSelectedLocation(`GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}) - Sohna GLS Homes, GDGU Haryana`);
          setIsLocating(false);
        },
        () => {
          setSelectedLocation('Goenka University Campus - Hostel Gate 5');
          setIsLocating(false);
        }
      );
    } else {
      setSelectedLocation('Main University Hostel');
      setIsLocating(false);
    }
  };

  const activeSlideData = HERO_SLIDES[currentSlide];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative bg-[#F4F1E8] text-[#1F2933] overflow-hidden border-b border-[#DDD6C8]">
      {/* Background Image Carousel with Light Warm Overlay */}
      <div className="absolute inset-0 transition-all duration-1000 ease-in-out">
        <img
          src={activeSlideData.image}
          alt={activeSlideData.title}
          className="w-full h-full object-cover opacity-20 scale-105 transition-all duration-1000 filter contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F4F1E8] via-[#F4F1E8]/85 to-[#F4F1E8]/70"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 relative z-10 space-y-6 text-center">
        
        {/* Badge Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F7F4EC] border border-[#B8862D] text-[#B8862D] text-xs font-black tracking-widest uppercase shadow-sm">
          <Utensils className="w-3.5 h-3.5 text-[#B8862D]" />
          <span>{activeSlideData.badge}</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-3 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-serif tracking-tight text-[#1F2933] drop-shadow-sm leading-none">
            {activeSlideData.title}
          </h1>
          <p className="text-sm sm:text-base text-[#5F6368] font-medium max-w-2xl mx-auto leading-relaxed">
            {activeSlideData.subtitle}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => scrollToSection('menu-section')}
            className="px-8 py-3.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold text-sm rounded-2xl shadow-md border border-[#B94D00] transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>Order Now</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={() => scrollToSection('gallery-section')}
            className="px-8 py-3.5 bg-white hover:bg-[#F0E8D8] text-[#1F2933] font-extrabold text-sm rounded-2xl border border-[#9F988A] shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-[#B8862D]" />
            <span>View Gallery</span>
          </button>
        </div>

        {/* Slide Indicator Dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                idx === currentSlide
                  ? 'w-8 bg-[#B8862D]'
                  : 'w-2.5 bg-[#DDD6C8] hover:bg-[#B8B09F]'
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Location & Food Search Bar Box */}
        <div className="mt-6 bg-white p-4 sm:p-5 rounded-3xl shadow-md border border-[#DDD6C8] max-w-3xl mx-auto text-left">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Address / Location Input */}
            <div className="sm:col-span-6 space-y-1">
              <label className="text-[10px] uppercase font-bold text-[#5F6368] tracking-wider">Delivery Hostel / Location</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F8F6F0] rounded-xl border border-[#9F988A] focus-within:border-[#D95F0A] focus-within:ring-2 focus-within:ring-[#D95F0A]/20 transition">
                <MapPin className="w-4 h-4 text-[#D95F0A] shrink-0" />
                <input
                  type="text"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  placeholder="Enter hostel or campus address..."
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#1F2933] outline-none placeholder:text-[#6B6B63]"
                />
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="text-[10px] text-[#B8862D] hover:underline font-bold flex items-center min-h-[30px] cursor-pointer"
              >
                {isLocating ? 'Fetching GPS...' : 'GPS Auto-detect'}
              </button>
            </div>

            {/* Food Search Input */}
            <div className="sm:col-span-6 space-y-1">
              <label className="text-[10px] uppercase font-bold text-[#5F6368] tracking-wider">Search Dish / Cuisines</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F8F6F0] rounded-xl border border-[#9F988A] focus-within:border-[#D95F0A] focus-within:ring-2 focus-within:ring-[#D95F0A]/20 transition">
                <Search className="w-4 h-4 text-[#5F6368] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search biryani, starters, gulab jamun..."
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#1F2933] outline-none placeholder:text-[#6B6B63]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#5F6368] hover:text-[#1F2933] font-bold px-1 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
