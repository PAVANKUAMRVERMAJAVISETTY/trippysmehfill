import React, { useState, useEffect } from 'react';
import { MapPin, Search, ChevronRight, ChevronLeft, Utensils, PartyPopper, Hotel, Sparkles } from 'lucide-react';
import { HomePromotion, HomepageSection } from '../../types';

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  onLogoClick?: () => void;
  onOpenAuth?: () => void;
  promotions?: HomePromotion[];
  heroSection?: HomepageSection;
}

const DEFAULT_HERO_SLIDES = [
  {
    title: "Great Food. Memorable Celebrations. Comfortable Stays.",
    subtitle: "Authentic multi-cuisine dining, event celebrations, catering and comfortable guest-house stays at GLS Sohna.",
    badge: "RESTAURANT • CLOUD KITCHEN • VENUE • GUEST HOUSE",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Birthday Parties & Special Moments",
    subtitle: "Host ambient birthday parties, private gatherings, and family functions with custom menu setups.",
    badge: "BIRTHDAY & PARTY VENUE",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Spacious Function Hall at GLS Sohna",
    subtitle: "Ideal venue space for corporate meetups, small functions, and multi-cuisine event catering.",
    badge: "FUNCTION HALL & EVENT VENUE",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Comfortable Guest House Stays",
    subtitle: "Clean, comfortable accommodations with late-night stay options & in-room food delivery.",
    badge: "GUEST HOUSE & LATE-NIGHT STAY",
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Crafted by an Experienced Continental Chef",
    subtitle: "Enjoy expert continental recipes, authentic dum biryanis, and chef signature specials.",
    badge: "CONTINENTAL CHEF & MULTI-CUISINE",
    image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Multi-Cuisine Event Catering",
    subtitle: "Professional event catering services for all scale celebrations, parties, and corporate lunches.",
    badge: "EVENT CATERING & DELIVERY",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1600&q=80"
  }
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  selectedLocation,
  setSelectedLocation,
  onLogoClick,
  promotions = [],
  heroSection,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLocating, setIsLocating] = useState(false);

  const activePromos = promotions.filter(p => p.is_active);

  const baseSlides = [...DEFAULT_HERO_SLIDES];

  if (heroSection && heroSection.is_visible !== false) {
    baseSlides[0] = {
      title: heroSection.title || baseSlides[0].title,
      subtitle: heroSection.description || heroSection.subtitle || baseSlides[0].subtitle,
      badge: heroSection.subtitle || baseSlides[0].badge,
      image: heroSection.image_url || baseSlides[0].image,
    };
  }

  const heroSlides = activePromos.length > 0
    ? activePromos.map(p => ({
        title: p.title,
        subtitle: p.subtitle || '',
        badge: p.badge || 'SPECIAL PROMOTION',
        image: p.image_url
      }))
    : baseSlides;

  // Auto-rotate every 6.5 seconds with 800ms cross-fade
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSelectedLocation(`GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}) - GLS Sohna, Haryana`);
          setIsLocating(false);
        },
        () => {
          setSelectedLocation('GLS Arawali Homes, Sohna');
          setIsLocating(false);
        }
      );
    } else {
      setSelectedLocation('GLS Arawali Homes, Sohna');
      setIsLocating(false);
    }
  };

  const activeSlideData = heroSlides[currentSlide] || heroSlides[0];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-[580px] sm:min-h-[660px] bg-[#121212] text-white overflow-hidden border-b border-[#333333] select-none flex flex-col justify-end pb-8 sm:pb-12 pt-24 sm:pt-32">
      
      {/* SHARP & NATURAL BACKGROUND IMAGE CAROUSEL WITH BOTTOM GRADIENT OVERLAY ONLY */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {heroSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-800 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* High-Contrast Sharp Image - Unblurred Upper Focal Area */}
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center select-none"
            />
            {/* Subtle Text Protection Gradient at Bottom Only */}
            <div className="absolute inset-x-0 bottom-0 h-4/5 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Manual Arrow Controls */}
      {heroSlides.length > 1 && (
        <>
          <button
            onClick={handlePrevSlide}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-[#C5A059] text-white hover:text-black border border-[#C5A059]/40 backdrop-blur-md items-center justify-center transition cursor-pointer shadow-xl active:scale-95"
            title="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNextSlide}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-[#C5A059] text-white hover:text-black border border-[#C5A059]/40 backdrop-blur-md items-center justify-center transition cursor-pointer shadow-xl active:scale-95"
            title="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* HERO CONTENT - LOWER SAFE CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 relative z-10 space-y-6 text-center w-full">
        
        {/* Badge Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1A1A]/90 backdrop-blur-md border border-[#C5A059]/60 text-[#C5A059] text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-xl transition-all">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>{activeSlideData.badge}</span>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-3 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight text-white drop-shadow-md leading-tight">
            {activeSlideData.title}
          </h1>
          <p className="text-xs sm:text-base text-gray-200 font-medium max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            {activeSlideData.subtitle}
          </p>
        </div>

        {/* 3 Primary Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
          <button
            onClick={() => scrollToSection('menu-section')}
            className="px-7 py-3.5 bg-[#FF5722] hover:bg-[#E64A19] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl border border-[#FF5722] transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Utensils className="w-4 h-4 text-white" />
            <span>🍽️ Explore Menu</span>
          </button>

          <button
            onClick={() => scrollToSection('events-section')}
            className="px-7 py-3.5 bg-[#C5A059] hover:bg-[#b58f48] text-black font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl border border-[#C5A059] transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <PartyPopper className="w-4 h-4 text-black" />
            <span>🎉 Plan Your Celebration</span>
          </button>

          <button
            onClick={() => scrollToSection('guesthouse-section')}
            className="px-7 py-3.5 bg-[#1A1A1A] hover:bg-[#252525] text-white font-extrabold text-xs sm:text-sm rounded-2xl border border-[#C5A059]/40 shadow-xl backdrop-blur-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Hotel className="w-4 h-4 text-[#C5A059]" />
            <span>🏨 Check Guest House</span>
          </button>
        </div>

        {/* Slide Indicator Dots */}
        {heroSlides.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlide
                    ? 'w-8 bg-[#C5A059] shadow-md'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Location & Dish Search Floating Input Box */}
        <div className="mt-6 bg-[#1A1A1A]/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl shadow-2xl border border-[#C5A059]/40 max-w-3xl mx-auto text-left text-white">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Location Selector */}
            <div className="sm:col-span-6 space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Delivery Location / Address</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#121212] rounded-xl border border-[#333333] focus-within:border-[#C5A059] transition">
                <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" />
                <input
                  type="text"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  placeholder="Enter address or location at GLS Sohna..."
                  className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-gray-500"
                />
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="text-[10px] text-[#C5A059] hover:underline font-bold flex items-center cursor-pointer"
              >
                {isLocating ? 'Fetching GPS...' : 'GPS Auto-detect Location'}
              </button>
            </div>

            {/* Dish Search */}
            <div className="sm:col-span-6 space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Search Multi-Cuisine Dishes</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#121212] rounded-xl border border-[#333333] focus-within:border-[#FF5722] transition">
                <Search className="w-4 h-4 text-[#FF5722] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Biryani, Pizza, Burger, Pasta..."
                  className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-gray-500"
                />
              </div>
              <span className="text-[10px] text-gray-400 block font-medium">Quick search across all multi-cuisine categories</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
