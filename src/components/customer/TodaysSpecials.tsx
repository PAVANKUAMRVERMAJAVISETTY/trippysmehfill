import React from 'react';
import { MenuItem } from '../../types';
import { useCart } from '../../context/CartContext';
import { Sparkles, Plus, Check, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initialKitchenSettings } from '../../lib/initialData';

interface TodaysSpecialsProps {
  items?: MenuItem[];
  specials?: MenuItem[];
  isLoading?: boolean;
  onRequireAuth?: () => void;
}

export const TodaysSpecials: React.FC<TodaysSpecialsProps> = ({
  items,
  specials,
  isLoading = false,
  onRequireAuth = () => {}
}) => {
  // The defensive defaults are kept -- they are what stopped this component
  // black-screening on null data. The settings fallback is the full
  // initialKitchenSettings rather than `{ is_open: true }`, because a partial
  // object widens the inferred type to `KitchenSettings | { is_open: true }`
  // and every other field, opening_time included, then fails to typecheck.
  const { cart = [], addToCart = () => {}, settings = initialKitchenSettings } = useCart() || {};
  const { user } = useAuth() || {};

  // Safely resolve items array regardless of whether parent passes 'items' or 'specials'
  const rawList = Array.isArray(items)
    ? items
    : Array.isArray(specials)
    ? specials
    : [];

  // Filter out invalid items safely with null/undefined checks
  const specialsList = (rawList ?? [])
    .filter((item): item is MenuItem => Boolean(item && typeof item === 'object'))
    .filter(item => item.is_todays_special !== false);

  // Loading state handling
  if (isLoading) {
    return (
      <div className="space-y-4 my-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#C5A059] animate-pulse" />
          <h2 className="text-xl font-extrabold text-white font-serif tracking-tight">
            Today's Specials
          </h2>
        </div>
        <div className="bg-[#121212] p-8 rounded-2xl border border-white/10 text-center flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin text-[#C5A059]" />
          <span className="text-xs font-bold">Loading Today's Specials...</span>
        </div>
      </div>
    );
  }

  // If no specials exist, return null
  if (!specialsList || specialsList.length === 0) {
    return null;
  }

  const handleAddClick = (item: MenuItem) => {
    if (!item) return;
    if (!settings?.is_open) {
      alert(`Restaurant is currently closed. Orders will resume at ${settings?.opening_time || '09:00 AM'}.`);
      return;
    }
    addToCart(item);
  };

  const safeCart = Array.isArray(cart) ? cart : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[#B8862D] animate-pulse" />
        <h2 className="text-xl font-extrabold text-[#1F2933] font-serif tracking-tight">
          Today's Specials
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(specialsList ?? []).map((item) => {
          if (!item || !item.id) return null;
          const cartItem = safeCart.find(c => c?.menuItem?.id === item.id);

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-[#DDD6C8] flex gap-4 items-center shadow-sm hover:border-[#B8862D] hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-[#F7F4EC]">
                <img
                  src={item.image_url || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'}
                  alt={item.name || "Today's Special"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#F7F4EC] text-[#B8862D] text-[10px] font-black px-2 py-0.5 rounded uppercase border border-[#DDD6C8]">
                    SPECIAL
                  </span>
                  <span className={`text-[10px] font-bold ${item.is_veg ? 'text-[#146C43]' : 'text-[#922B21]'}`}>
                    {item.is_veg ? '● VEG' : '● NON-VEG'}
                  </span>
                </div>

                <h3 className="font-bold text-[#1F2933] text-sm truncate mb-1 font-serif">
                  {item.name || 'Special Dish'}
                </h3>
                <p className="text-xs text-[#5F6368] line-clamp-2 leading-relaxed">
                  {item.description || ''}
                </p>

                <div className="mt-3 pt-2 border-t border-[#DDD6C8] flex items-center justify-between">
                  {!user ? (
                    <button
                      onClick={onRequireAuth}
                      className="w-full py-1.5 bg-[#F7F4EC] hover:bg-[#F0E8D8] text-[#D95F0A] font-extrabold rounded-xl text-xs border border-[#DDD6C8] transition text-center shadow-sm cursor-pointer"
                    >
                      Login to Order
                    </button>
                  ) : (
                    <>
                      <div className="text-base font-black text-[#D95F0A]">
                        ₹{item.price ?? 0}
                      </div>

                      {!settings?.is_open ? (
                        <button
                          onClick={() => handleAddClick(item)}
                          className="bg-[#F8F6F0] text-[#5F6368] font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-[#DDD6C8] shadow-sm transition hover:bg-[#F0E8D8] cursor-pointer"
                          title={`Restaurant is currently closed. Orders will resume at ${settings?.opening_time || '09:00 AM'}.`}
                        >
                          <Lock className="w-3.5 h-3.5 text-[#C0392B]" />
                          <span>CLOSED</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddClick(item)}
                          className="bg-[#D95F0A] hover:bg-[#B94D00] active:scale-95 text-white font-extrabold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm border border-[#B94D00] transition-all cursor-pointer"
                        >
                          {cartItem ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>In Cart ({cartItem.quantity || 1})</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
