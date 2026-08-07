import React from 'react';
import { MenuItem } from '../../types';
import { Sparkles, Plus, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/format';

interface TodaysSpecialsProps {
  specials: MenuItem[];
  onRequireAuth: () => void;
}

export const TodaysSpecials: React.FC<TodaysSpecialsProps> = ({ specials, onRequireAuth }) => {
  const { cart, addToCart } = useCart();
  const { user } = useAuth();

  if (!specials || specials.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#C5A059] animate-spin" />
        <h2 className="text-xl sm:text-2xl font-black text-[#C5A059] font-serif tracking-wide">
          Today's Specials
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {specials.map((item) => {
          const cartItem = cart.find(c => c.menuItem.id === item.id);
          return (
            <div
              key={item.id}
              className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-xl hover:border-[#C5A059]/40 transition-all flex flex-col justify-between"
            >
              <div className="flex gap-4">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-24 h-24 rounded-xl object-cover shrink-0 border border-white/10 shadow-sm"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        item.is_veg ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                    />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded-full border border-[#C5A059]/20">
                      Special Offer
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                {!user ? (
                  <button
                    onClick={onRequireAuth}
                    className="w-full py-2 bg-[#C5A059]/10 hover:bg-[#C5A059] text-[#C5A059] hover:text-black font-extrabold rounded-xl text-xs border border-[#C5A059]/40 transition text-center shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>Login to View Special Price</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-base font-black text-white">
                      {formatCurrency(item.price)}
                    </div>

                    <button
                      onClick={() => addToCart(item)}
                      className="bg-[#C5A059] hover:bg-[#b38f48] active:scale-95 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      {cartItem ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>In Cart ({cartItem.quantity})</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
