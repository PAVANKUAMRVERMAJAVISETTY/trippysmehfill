import React from 'react';
import { MenuItem } from '../../types';
import { useCart } from '../../context/CartContext';
import { Plus, Minus, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MenuCardProps {
  item: MenuItem;
  onRequireAuth: () => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onRequireAuth }) => {
  const { cart, addToCart, updateQuantity, settings } = useCart();
  const { user } = useAuth();

  // Defensively return null if item is not available on customer storefront
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
    <div className="bg-white rounded-2xl p-4 border border-[#DDD6C8] shadow-sm hover:border-[#B8862D] hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Dish Image */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#F7F4EC] mb-3">
          <img
            src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 shadow-sm border border-[#DDD6C8]">
            <span
              className={`w-2 h-2 rounded-full ${
                item.is_veg ? 'bg-[#198754]' : 'bg-[#C0392B]'
              }`}
            />
            <span className={item.is_veg ? 'text-[#146C43]' : 'text-[#922B21]'}>
              {item.is_veg ? 'VEG' : 'NON-VEG'}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-extrabold text-[#1F2933] text-base mb-1 line-clamp-1">
          {item.name}
        </h3>
        <p className="text-xs text-[#5F6368] line-clamp-2 leading-relaxed mb-3">
          {item.description}
        </p>
      </div>

      {/* Footer Price & Actions */}
      <div className="pt-2 border-t border-[#DDD6C8] mt-2">
        {!user ? (
          <button
            onClick={onRequireAuth}
            className="w-full py-2 bg-[#F7F4EC] hover:bg-[#F0E8D8] text-[#D95F0A] font-extrabold rounded-xl text-xs border border-[#DDD6C8] transition text-center shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Login to View Price & Order</span>
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-black text-[#D95F0A]">₹{item.price}</span>
            </div>

            {!settings.is_open ? (
              <button
                onClick={handleAddClick}
                className="bg-[#F8F6F0] text-[#5F6368] font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-[#DDD6C8] shadow-sm transition hover:bg-[#F0E8D8] cursor-pointer"
                title={`Restaurant is currently closed. Orders will resume at ${settings.opening_time || '09:00 AM'}.`}
              >
                <Lock className="w-3.5 h-3.5 text-[#C0392B]" />
                <span>CLOSED</span>
              </button>
            ) : cartItem ? (
              <div className="flex items-center gap-2 bg-[#F8F6F0] border border-[#9F988A] rounded-xl px-2 py-1">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-6 h-6 rounded-lg bg-white text-[#1F2933] hover:bg-[#F0E8D8] border border-[#DDD6C8] flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Minus className="w-3 h-3 text-[#1F2933]" />
                </button>
                <span className="text-xs font-extrabold text-[#D95F0A] px-1">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-6 h-6 rounded-lg bg-[#D95F0A] text-white hover:bg-[#B94D00] flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddClick}
                className="bg-[#D95F0A] hover:bg-[#B94D00] active:scale-95 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm border border-[#B94D00] transition cursor-pointer"
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
