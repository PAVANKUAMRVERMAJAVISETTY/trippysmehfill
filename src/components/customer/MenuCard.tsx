import React from 'react';
import { MenuItem } from '../../types';
import { useCart } from '../../context/CartContext';
import { Plus, Minus, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MenuCardProps {
  item: MenuItem;
  onRequireAuth: () => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onRequireAuth }) => {
  const { cart, addToCart, updateQuantity, settings } = useCart();
  const { user } = useAuth();

  // Defensively return null if item is not available on customer storefront (Hide completely, no Sold Out)
  if (!item.is_available) {
    return null;
  }

  const cartItem = cart.find(c => c.menuItem.id === item.id);

  const handleAddClick = () => {
    if (!settings.is_open) {
      alert(`Restaurant is currently closed. Orders will resume at ${settings.opening_time || '09:00 AM'}.`);
      return;
    }
    addToCart(item);
  };

  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#C5A059]/20 shadow-xl hover:border-[#C5A059] hover:shadow-2xl transition-all flex flex-col justify-between group select-none">
      <div>
        {/* Dish HD Image */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#121212] mb-3">
          <img
            src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 select-none"
          />
          
          {/* Veg/Non-Veg Badge */}
          <div className="absolute top-2 left-2 bg-[#121212]/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 shadow-md border border-[#C5A059]/30">
            <span
              className={`w-2 h-2 rounded-full ${
                item.is_veg ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span className={item.is_veg ? 'text-emerald-400' : 'text-red-400'}>
              {item.is_veg ? 'VEG' : 'NON-VEG'}
            </span>
          </div>

          {/* Today's Special Badge if applicable */}
          {item.is_todays_special && (
            <div className="absolute top-2 right-2 bg-[#C5A059] text-black px-2 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1 shadow-md uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-black" />
              <span>Special</span>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="font-extrabold font-serif text-white text-base mb-1 line-clamp-1 group-hover:text-[#C5A059] transition-colors">
          {item.name}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3 font-medium">
          {item.description}
        </p>
      </div>

      {/* Footer Price & Actions */}
      <div className="pt-3 border-t border-[#333333] mt-2">
        {!user ? (
          <button
            onClick={onRequireAuth}
            className="w-full py-2 bg-[#121212] hover:bg-[#222222] text-[#C5A059] font-extrabold rounded-xl text-xs border border-[#C5A059]/40 transition text-center shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Login to View Price & Order</span>
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-black font-serif text-[#C5A059]">₹{item.price}</span>
            </div>

            {!settings.is_open ? (
              <button
                onClick={handleAddClick}
                className="bg-[#222222] text-gray-400 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-[#333333] transition cursor-pointer"
                title={`Restaurant is currently closed. Orders will resume at ${settings.opening_time || '09:00 AM'}.`}
              >
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>CLOSED</span>
              </button>
            ) : cartItem ? (
              <div className="flex items-center gap-2 bg-[#121212] border border-[#C5A059]/40 rounded-xl px-2 py-1">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-6 h-6 rounded-lg bg-[#222222] text-white hover:bg-[#333333] border border-[#333333] flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Minus className="w-3 h-3 text-white" />
                </button>
                <span className="text-xs font-extrabold text-[#C5A059] px-1">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-6 h-6 rounded-lg bg-[#FF5722] text-white hover:bg-[#E64A19] flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddClick}
                className="bg-[#FF5722] hover:bg-[#E64A19] active:scale-95 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md border border-[#FF5722] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>ADD</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
