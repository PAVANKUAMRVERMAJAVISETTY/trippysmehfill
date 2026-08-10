import React, { useState } from 'react';
import { Tag, Copy, Check, Sparkles, Gift, Truck, Percent } from 'lucide-react';
import { Offer } from '../../types';

interface OffersSectionProps {
  offers?: Offer[];
}

const DEFAULT_OFFERS: Offer[] = [
  {
    id: 'off-1',
    title: '20% OFF on First Order',
    discount_label: '20% OFF',
    description: 'Sign up now and get 20% off your first order with code WELCOME20.',
    code: 'WELCOME20',
    is_active: true,
    discount_type: 'percentage',
    discount_value: 20
  },
  {
    id: 'off-2',
    title: 'Free Delivery on Orders Above Rs. 500',
    discount_label: 'FREE DEL',
    description: 'Enjoy free home delivery on all orders above Rs. 500 across campus & hostels.',
    code: 'FREEDEL',
    is_active: true,
    discount_type: 'free_delivery',
    min_order_amount: 500
  },
  {
    id: 'off-3',
    title: 'Buy 1 Get 1 on Biryani',
    discount_label: '50% OFF',
    description: 'Order any biryani and get one free on select weekdays.',
    code: 'BIRYANI12',
    is_active: true,
    discount_type: 'percentage',
    discount_value: 50
  }
];

const OfferCard: React.FC<{ offer: Offer }> = ({ offer }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(offer.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeStyle = () => {
    if (offer.discount_type === 'free_delivery') return { bg: 'bg-[#C5A059]', icon: <Truck className="w-5 h-5 text-black" /> };
    if (offer.discount_type === 'fixed') return { bg: 'bg-[#FF5722]', icon: <Gift className="w-5 h-5 text-white" /> };
    return { bg: 'bg-[#C5A059]', icon: <Percent className="w-5 h-5 text-black" /> };
  };

  const badgeStyle = getBadgeStyle();

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 border border-[#C5A059]/30 bg-[#1A1A1A] shadow-xl hover:border-[#C5A059] transition-all group flex flex-col justify-between select-none">
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className={`p-2.5 rounded-xl ${badgeStyle.bg} shadow-md`}>
            {badgeStyle.icon}
          </div>
          <span className="text-2xl sm:text-3xl font-black text-[#C5A059] font-serif tracking-tight">
            {offer.discount_label}
          </span>
        </div>

        <div>
          <h3 className="font-serif font-black text-white text-base sm:text-lg leading-tight group-hover:text-[#C5A059] transition-colors">
            {offer.title}
          </h3>
          {offer.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
              {offer.description}
            </p>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-[#333333] mt-4 flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5 bg-[#121212] px-3 py-1.5 rounded-xl border border-[#C5A059]/40">
          <Tag className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="text-xs font-mono font-black text-[#C5A059] tracking-wider">
            {offer.code}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className={`px-4 min-h-[36px] rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white border border-emerald-500'
              : 'bg-[#FF5722] hover:bg-[#E64A19] text-white border border-[#FF5722]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const OffersSection: React.FC<OffersSectionProps> = ({ offers = [] }) => {
  const activeOffers = offers.filter(o => o.is_active);
  const displayOffers = activeOffers.length > 0 ? activeOffers : DEFAULT_OFFERS;

  return (
    <section id="offers-section" className="py-16 bg-[#121212] border-t border-[#333333] select-none text-[#F7F2E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Section Header */}
        <div className="flex items-center gap-3 border-b border-[#333333] pb-6">
          <div className="p-2.5 rounded-xl bg-[#C5A059] text-black shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-wide">
              LATEST PROMO OFFERS
            </h2>
            <p className="text-xs text-gray-400">
              Exclusive discount promo codes for multi-cuisine food delivery & party orders
            </p>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>

      </div>
    </section>
  );
};
