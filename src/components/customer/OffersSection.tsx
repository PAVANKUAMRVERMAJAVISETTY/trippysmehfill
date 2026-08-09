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
    if (offer.discount_type === 'free_delivery') return { bg: 'bg-[#B8862D]', icon: <Truck className="w-5 h-5" /> };
    if (offer.discount_type === 'fixed') return { bg: 'bg-[#C0392B]', icon: <Gift className="w-5 h-5" /> };
    return { bg: 'bg-[#D95F0A]', icon: <Percent className="w-5 h-5" /> };
  };

  const badgeStyle = getBadgeStyle();

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 border border-[#DDD6C8] bg-white shadow-sm hover:border-[#B8862D] hover:shadow-md transition-all group flex flex-col justify-between">
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className={`p-2.5 rounded-xl ${badgeStyle.bg} text-white shadow-sm`}>
            {badgeStyle.icon}
          </div>
          <span className="text-2xl sm:text-3xl font-black text-[#D95F0A] font-serif tracking-tight">
            {offer.discount_label}
          </span>
        </div>

        <div>
          <h3 className="font-serif font-black text-[#1F2933] text-base sm:text-lg leading-tight">
            {offer.title}
          </h3>
          {offer.description && (
            <p className="text-xs text-[#5F6368] mt-1 line-clamp-2">
              {offer.description}
            </p>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-[#DDD6C8] mt-4 flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5 bg-[#F7F4EC] px-3 py-1.5 rounded-xl border border-[#DDD6C8]">
          <Tag className="w-3.5 h-3.5 text-[#B8862D]" />
          <span className="text-xs font-mono font-black text-[#B8862D] tracking-wider">
            {offer.code}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className={`px-3.5 min-h-[36px] rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
            copied
              ? 'bg-[#198754] text-white border border-[#146C43]'
              : 'bg-white hover:bg-[#F0E8D8] text-[#1F2933] border border-[#9F988A]'
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
    <section id="offers-section" className="py-10 bg-[#F4F1E8] border-t border-[#DDD6C8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#B8862D] text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1F2933] font-serif tracking-wide flex items-center gap-2">
              <span>LATEST OFFERS</span>
            </h2>
            <p className="text-xs text-[#5F6368]">
              Exclusive discount promo codes for online food delivery orders
            </p>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {displayOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>

      </div>
    </section>
  );
};
