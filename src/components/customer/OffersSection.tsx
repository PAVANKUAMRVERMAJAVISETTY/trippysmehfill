import React, { useState } from 'react';
import { Tag, Copy, Check, Sparkles, Gift, Truck, Percent } from 'lucide-react';

interface OfferCardProps {
  title: string;
  discount: string;
  description: string;
  code: string;
  bgGradient: string;
  badgeBg: string;
  icon: React.ReactNode;
}

const OfferCard: React.FC<OfferCardProps> = ({
  title,
  discount,
  description,
  code,
  bgGradient,
  badgeBg,
  icon
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border border-white/10 ${bgGradient} shadow-xl hover:border-orange-500/50 transition-all group flex flex-col justify-between`}>
      {/* Background Decorative Pattern */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className={`p-2.5 rounded-xl ${badgeBg} text-white shadow-md`}>
            {icon}
          </div>
          <span className="text-2xl sm:text-3xl font-black text-amber-400 font-serif tracking-tight">
            {discount}
          </span>
        </div>

        <div>
          <h3 className="font-serif font-black text-white text-base sm:text-lg leading-tight">
            {title}
          </h3>
          <p className="text-xs text-gray-300 mt-1 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-white/15">
          <Tag className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-mono font-black text-amber-300 tracking-wider">
            {code}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className={`px-3 min-h-[44px] rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-md ${
            copied
              ? 'bg-emerald-500 text-black'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const OffersSection: React.FC = () => {
  return (
    <section id="offers-section" className="py-10 bg-[#0a0a0a] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-black shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white font-serif tracking-wide flex items-center gap-2">
              <span>Latest Offers</span>
            </h2>
            <p className="text-xs text-gray-400">
              Exclusive discount promo codes for online food delivery orders
            </p>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <OfferCard
            title="20% OFF on First Order"
            discount="20% OFF"
            description="Sign up now and get 20% off your first order with code WELCOME20."
            code="WELCOME20"
            bgGradient="bg-gradient-to-br from-orange-950/80 via-[#181818] to-[#121212]"
            badgeBg="bg-orange-600"
            icon={<Percent className="w-5 h-5" />}
          />

          <OfferCard
            title="Free Delivery on Orders Above Rs. 500"
            discount="FREE DEL"
            description="Enjoy free home delivery on all orders above Rs. 500 across campus & hostels."
            code="FREEDEL"
            bgGradient="bg-gradient-to-br from-amber-950/80 via-[#181818] to-[#121212]"
            badgeBg="bg-amber-600"
            icon={<Truck className="w-5 h-5" />}
          />

          <OfferCard
            title="Buy 1 Get 1 on Biryani"
            discount="50% OFF"
            description="Order any biryani and get one free on select weekdays."
            code="BIRYANI12"
            bgGradient="bg-gradient-to-br from-rose-950/80 via-[#181818] to-[#121212]"
            badgeBg="bg-rose-600"
            icon={<Gift className="w-5 h-5" />}
          />
        </div>

      </div>
    </section>
  );
};
