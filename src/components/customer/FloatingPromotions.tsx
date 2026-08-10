import React, { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight } from 'lucide-react';

interface PromoNotice {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  actionId: string;
}

const PROMO_NOTICES: PromoNotice[] = [
  {
    id: 'p1',
    icon: '🎉',
    title: 'Birthday Party Bookings Open',
    subtitle: 'Book our function hall & custom party menu at GLS Sohna.',
    actionId: 'events-section'
  },
  {
    id: 'p2',
    icon: '🏨',
    title: 'Guest House Rooms Available',
    subtitle: 'Clean, comfortable & late-night stays with food service.',
    actionId: 'guesthouse-section'
  },
  {
    id: 'p3',
    icon: '🌙',
    title: 'Late-Night Stay Available',
    subtitle: 'Convenient accommodations & late-night food ordering.',
    actionId: 'guesthouse-section'
  },
  {
    id: 'p4',
    icon: '🍲',
    title: 'Catering Available for Events',
    subtitle: 'Multi-cuisine continental & Indian catering for all gatherings.',
    actionId: 'hall-section'
  },
  {
    id: 'p5',
    icon: '🔥',
    title: "Today's Chef Special",
    subtitle: 'Freshly prepared continental & dum biryani specials.',
    actionId: 'menu-section'
  }
];

export const FloatingPromotions: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed) return;

    // Rotate through promo notices every 7 seconds
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % PROMO_NOTICES.length);
        setIsVisible(true);
      }, 500); // 500ms fade transition
    }, 7000);

    return () => clearInterval(interval);
  }, [isDismissed]);

  if (isDismissed) return null;

  const currentNotice = PROMO_NOTICES[currentIndex];

  const handleAction = () => {
    const el = document.getElementById(currentNotice.actionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className={`fixed bottom-5 left-5 z-30 max-w-sm transition-all duration-500 transform select-none ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-[#1A1A1A]/95 backdrop-blur-md text-white p-4 rounded-2xl border-2 border-[#C5A059]/40 shadow-2xl flex items-start gap-3 relative overflow-hidden group">
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#C5A059]" />

        <div className="w-10 h-10 rounded-xl bg-[#252525] border border-[#C5A059]/30 flex items-center justify-center text-xl shrink-0 shadow-inner">
          {currentNotice.icon}
        </div>

        <div className="flex-1 pr-6 cursor-pointer" onClick={handleAction}>
          <div className="flex items-center gap-1 text-[10px] font-black text-[#C5A059] uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#C5A059]" />
            <span>Featured Highlight</span>
          </div>
          <h4 className="text-xs font-black font-serif text-white leading-tight mt-0.5 group-hover:text-[#C5A059] transition-colors">
            {currentNotice.title}
          </h4>
          <p className="text-[11px] text-gray-300 font-medium leading-snug mt-0.5">
            {currentNotice.subtitle}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
