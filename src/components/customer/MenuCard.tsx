import React from 'react';
import { MenuItem } from '../../types';
import { useCart } from '../../context/CartContext';
import { Plus, Minus, Check, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MenuCardProps {
  item: MenuItem;
  onRequireAuth: () => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onRequireAuth }) => {
  const { cart, addToCart, updateQuantity, settings } = useCart();
  const { user } = useAuth();

  const cartItem = cart.find(c => c.menuItem.id === item.id);

  const handleAddClick = () => {
    if (!settings.is_open) {
      alert(`Restaurant is currently closed. Orders will resume at ${settings.opening_time || '09:00 AM'}.`);
      return;
    }
    addToCart(item);
  };

  return (
    <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg hover:border-[#C5A059]/40 transition-all flex flex-col justify-between group">
      <div>
        {/* Dish Image */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#181818] mb-3">
          <img
            src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'}
            alt={item.name}
            // One of these renders per dish, most below the fold on a phone.
            // Without lazy loading the browser fetches every menu image before
            // first paint, on a connection that is often a mobile network.
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2 bg-[#121212]/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 shadow-sm border border-white/10">
            <span
              className={`w-2 h-2 rounded-full ${
                item.is_veg ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span className={item.is_veg ? 'text-emerald-400' : 'text-rose-400'}>
              {item.is_veg ? 'VEG' : 'NON-VEG'}
            </span>
          </div>
          {!item.is_available && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-xs uppercase tracking-wider">
              Sold Out
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="font-bold text-white text-base mb-1 line-clamp-1">
          {item.name}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
          {item.description}
        </p>
      </div>

      {/* Footer Price & Actions */}
      <div className="pt-2 border-t border-white/10 mt-2">
        {!user ? (
          <button
            onClick={onRequireAuth}
            className="w-full py-2 bg-[#C5A059]/10 hover:bg-[#C5A059] text-[#C5A059] hover:text-black font-extrabold rounded-xl text-xs border border-[#C5A059]/40 transition text-center shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Login to View Price & Order</span>
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-black text-white">₹{item.price}</span>
            </div>

            {!item.is_available ? (
              <span className="text-xs text-gray-500 font-medium">Unavailable</span>
            ) : !settings.is_open ? (
              <button
                onClick={handleAddClick}
                className="bg-gray-800 text-gray-400 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-white/10 shadow-sm transition hover:bg-gray-700"
                title={`Restaurant is currently closed. Orders will resume at ${settings.opening_time || '09:00 AM'}.`}
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>CLOSED</span>
              </button>
            ) : cartItem ? (
              <div className="flex items-center gap-2 bg-[#181818] border border-white/10 rounded-xl px-2 py-1">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-6 h-6 rounded-lg bg-[#262626] text-white hover:bg-white/20 flex items-center justify-center font-bold text-xs shadow-sm"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-extrabold text-[#C5A059] px-1">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-6 h-6 rounded-lg bg-[#C5A059] text-black hover:bg-[#b38f48] flex items-center justify-center font-bold text-xs shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddClick}
                className="bg-[#C5A059] hover:bg-[#b38f48] active:scale-95 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
