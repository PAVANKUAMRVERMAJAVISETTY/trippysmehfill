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
    <div className="relative overflow-hidden rounded-2xl p-5 border border-[#DDD6C8] bg-white shadow-sm hover:border-[#B8862D] hover:shadow-md transition-all group flex flex-col justify-between">
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className={`p-2.5 rounded-xl ${badgeBg} text-white shadow-sm`}>
            {icon}
          </div>
          <span className="text-2xl sm:text-3xl font-black text-[#D95F0A] font-serif tracking-tight">
            {discount}
          </span>
        </div>

        <div>
          <h3 className="font-serif font-black text-[#1F2933] text-base sm:text-lg leading-tight">
            {title}
          </h3>
          <p className="text-xs text-[#5F6368] mt-1 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-[#DDD6C8] mt-4 flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5 bg-[#F7F4EC] px-3 py-1.5 rounded-xl border border-[#DDD6C8]">
          <Tag className="w-3.5 h-3.5 text-[#B8862D]" />
          <span className="text-xs font-mono font-black text-[#B8862D] tracking-wider">
            {code}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className={`px-3 min-h-[36px] rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
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
    <section id="offers-section" className="py-10 bg-[#F4F1E8] border-t border-[#DDD6C8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#B8862D] text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1F2933] font-serif tracking-wide flex items-center gap-2">
              <span>Latest Offers</span>
            </h2>
            <p className="text-xs text-[#5F6368]">
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
            bgGradient=""
            badgeBg="bg-[#D95F0A]"
            icon={<Percent className="w-5 h-5" />}
          />

          <OfferCard
            title="Free Delivery on Orders Above Rs. 500"
            discount="FREE DEL"
            description="Enjoy free home delivery on all orders above Rs. 500 across campus & hostels."
            code="FREEDEL"
            bgGradient=""
            badgeBg="bg-[#B8862D]"
            icon={<Truck className="w-5 h-5" />}
          />

          <OfferCard
            title="Buy 1 Get 1 on Biryani"
            discount="50% OFF"
            description="Order any biryani and get one free on select weekdays."
            code="BIRYANI12"
            bgGradient=""
            badgeBg="bg-[#C0392B]"
            icon={<Gift className="w-5 h-5" />}
          />
        </div>

      </div>
    </section>
  );
};
