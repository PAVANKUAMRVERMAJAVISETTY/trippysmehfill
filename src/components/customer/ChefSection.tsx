import React from 'react';
import { ChefHat, Heart, Utensils } from 'lucide-react';
import { HomepageSection } from '../../types';

interface ChefSectionProps {
  section?: HomepageSection;
}

export const ChefSection: React.FC<ChefSectionProps> = ({ section }) => {
  if (section && section.is_visible === false) {
    return null;
  }

  const title = section?.title || 'Crafted by an Experienced Continental Chef';
  const subtitle = section?.subtitle || 'EXPERIENCED CULINARY TEAM';
  const description =
    section?.description ||
    "At Trippy's Mehfill, every dish is an artful fusion of authentic flavors, premium ingredients, and expert culinary techniques. Guided by an experienced Continental Chef, our kitchen prepares authentic multi-cuisine delicacies, signature specials, and party platters fresh to order.";
  const imageUrl =
    section?.image_url ||
    'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80';
  const buttonText = section?.button_text || 'Explore Menu';
  const buttonLink = section?.button_link || 'menu-section';

  const handleAction = () => {
    if (buttonLink.startsWith('http') || buttonLink.startsWith('tel:')) {
      window.open(buttonLink, '_blank');
    } else {
      const el = document.getElementById(buttonLink.replace('#', ''));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 bg-[#161616] text-[#F7F2E8] border-b border-[#333333] select-none overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Sharp Culinary Photography */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden border-2 border-[#C5A059]/40 shadow-2xl bg-[#1A1A1A] aspect-4/3 sm:aspect-video lg:aspect-square">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover object-center select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              <div className="absolute bottom-4 left-4 right-4 p-4 bg-[#1A1A1A]/90 backdrop-blur-md rounded-2xl border border-[#C5A059]/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C5A059] text-black flex items-center justify-center font-black text-xl shrink-0">
                  👨‍🍳
                </div>
                <div>
                  <h4 className="text-sm font-black font-serif text-white">Culinary Excellence</h4>
                  <p className="text-[11px] text-gray-300">Continental & Multi-Cuisine Masterchef</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Narrative & Key Highlights */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] text-xs font-black tracking-widest uppercase">
              <ChefHat className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{subtitle}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white leading-tight">
              {title}
            </h2>

            <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
              {description}
            </p>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 p-3.5 bg-[#1A1A1A] rounded-2xl border border-[#C5A059]/20 hover:border-[#C5A059] transition-colors">
                <span className="text-2xl shrink-0">👨‍🍳</span>
                <div>
                  <h4 className="text-xs font-black font-serif text-white">Expert Chef</h4>
                  <p className="text-[11px] text-gray-400">Crafting continental & traditional recipes</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-[#1A1A1A] rounded-2xl border border-[#C5A059]/20 hover:border-[#C5A059] transition-colors">
                <span className="text-2xl shrink-0">🍽️</span>
                <div>
                  <h4 className="text-xs font-black font-serif text-white">Multi-Cuisine</h4>
                  <p className="text-[11px] text-gray-400">Biryani, Italian, North & South Indian</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-[#1A1A1A] rounded-2xl border border-[#C5A059]/20 hover:border-[#C5A059] transition-colors">
                <span className="text-2xl shrink-0">🥘</span>
                <div>
                  <h4 className="text-xs font-black font-serif text-white">Fresh Preparation</h4>
                  <p className="text-[11px] text-gray-400">Hygienically cooked fresh upon order</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-[#1A1A1A] rounded-2xl border border-[#C5A059]/20 hover:border-[#C5A059] transition-colors">
                <span className="text-2xl shrink-0">🔥</span>
                <div>
                  <h4 className="text-xs font-black font-serif text-white">Chef Specials</h4>
                  <p className="text-[11px] text-gray-400">Exclusive daily signature creations</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleAction}
                className="px-6 py-3 bg-[#FF5722] hover:bg-[#E64A19] text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
              >
                <Utensils className="w-4 h-4" />
                <span>{buttonText}</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-[#C5A059]">
                <Heart className="w-4 h-4 text-[#FF5722] fill-[#FF5722]" />
                <span>Uncompromising Hygiene</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
