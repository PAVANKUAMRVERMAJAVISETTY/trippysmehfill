import React, { useState, useEffect } from 'react';
import { MapPin, Search, ChevronRight, ChevronLeft, Image as ImageIcon, Utensils, Sparkles } from 'lucide-react';

import { HomePromotion } from '../../types';

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  onLogoClick?: () => void;
  onOpenAuth?: () => void;
  promotions?: HomePromotion[];
}

const DEFAULT_HERO_SLIDES = [
  {
    title: "TRIPPY'S MEHFIL",
    subtitle: "Where every flavor tells a story. Order authentic Indian cuisine delivered fresh to your door.",
    badge: "CLOUD KITCHEN & FOOD DELIVERY",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1600&q=80",
    buttonText: "Order Now",
    buttonLink: "menu-section"
  },
  {
    title: "AUTHENTIC DUM BIRYANI",
    subtitle: "Aromatic basmati rice cooked with marinated chicken, saffron, and secret spices.",
    badge: "HYDERABAD SPECIAL",
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1600&q=80",
    buttonText: "Order Now",
    buttonLink: "menu-section"
  },
  {
    title: "KITCHEN & AMBIANCE",
    subtitle: "Our chefs preparing your favourite dishes with love, hygiene and perfection.",
    badge: "IN THE KITCHEN",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80",
    buttonText: "View Gallery",
    buttonLink: "gallery-section"
  },
  {
    title: "DELICIOUS TANDOORI & DESSERTS",
    subtitle: "Hot kebabs, crispy samosas, and warm gulab jamuns prepared fresh every day.",
    badge: "FRESHLY PREPARED",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1600&q=80",
    buttonText: "Order Now",
    buttonLink: "menu-section"
  }
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  selectedLocation,
  setSelectedLocation,
  onLogoClick,
  promotions = []
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLocating, setIsLocating] = useState(false);

  const activePromos = promotions.filter(p => p.is_active);

  const heroSlides = activePromos.length > 0
    ? activePromos.map(p => ({
        title: p.title,
        subtitle: p.subtitle || '',
        badge: p.badge || 'TODAY\'S PROMOTION',
        image: p.image_url,
        buttonText: p.button_text || 'Order Now',
        buttonLink: p.button_link || 'menu-section'
      }))
    : DEFAULT_HERO_SLIDES;

  // Auto rotate hero slide every 6.5 seconds with smooth 800ms cross-fade
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

  const activeSlideData = heroSlides[currentSlide] || heroSlides[0];

  const scrollToSection = (id: string) => {
    const targetId = id.startsWith('#') ? id.slice(1) : id;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      const menuEl = document.getElementById('menu-section');
      menuEl?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-[560px] sm:min-h-[640px] bg-[#111827] text-white overflow-hidden border-b border-[#DDD6C8] select-none flex flex-col justify-end pb-8 sm:pb-12 pt-28 sm:pt-36">
      
      {/* SHARP & NATURAL BACKGROUND IMAGE CAROUSEL WITH BOTTOM-ONLY SUBTLE GRADIENT */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {heroSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-800 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Crisp Food Image - Natural Colors, Unshadowed Upper Focal Region */}
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center select-none"
            />
            {/* Subtle Gradient Overlay ONLY Behind Bottom Text Area */}
            <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Manual Slide Navigation Arrows (Desktop & Tablet) */}
      {heroSlides.length > 1 && (
        <>
          <button
            onClick={handlePrevSlide}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-[#D95F0A] text-white/80 hover:text-white border border-white/20 backdrop-blur-md items-center justify-center transition cursor-pointer shadow-lg active:scale-95"
            title="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNextSlide}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-[#D95F0A] text-white/80 hover:text-white border border-white/20 backdrop-blur-md items-center justify-center transition cursor-pointer shadow-lg active:scale-95"
            title="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* MAIN HERO CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10 space-y-6 text-center w-full">
        
        {/* Badge Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/50 text-amber-300 text-xs font-black tracking-widest uppercase shadow-md transition-all">
          <Utensils className="w-3.5 h-3.5 text-amber-400" />
          <span>{activeSlideData.badge}</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-3 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)] leading-tight">
            {activeSlideData.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-100 font-semibold max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            {activeSlideData.subtitle}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => scrollToSection(activeSlideData.buttonLink)}
            className="px-8 py-3.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold text-sm rounded-2xl shadow-xl border border-[#B94D00] transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>{activeSlideData.buttonText}</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={() => scrollToSection('gallery-section')}
            className="px-8 py-3.5 bg-white/90 hover:bg-white text-[#1F2933] font-extrabold text-sm rounded-2xl border border-white/50 shadow-md backdrop-blur-sm transition flex items-center gap-2 cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-[#B8862D]" />
            <span>View Gallery</span>
          </button>
        </div>

        {/* Carousel Indicator Dots */}
        {heroSlides.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlide
                    ? 'w-8 bg-amber-400 shadow-md'
                    : 'w-2.5 bg-white/40 hover:bg-white/70'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Delivery Location & Dish Search Floating Card */}
        <div className="mt-6 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl shadow-2xl border border-white/40 max-w-3xl mx-auto text-left text-[#1F2933]">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Delivery Location Input */}
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

            {/* Dish Search Input */}
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

