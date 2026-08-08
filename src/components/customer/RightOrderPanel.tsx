import React from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';

interface RightOrderPanelProps {
  /** Opens the auth modal; the customer returns straight to checkout afterwards. */
  onRequireAuth: () => void;
  /** Navigates to the checkout page, where details and payment are collected. */
  onProceedToCheckout: () => void;
  isDrawer?: boolean;
  onCloseDrawer?: () => void;
}

/**
 * The cart: what is in it, how much it costs, and the way onward.
 *
 * Address, payment and order creation live on the checkout page rather than
 * here. This panel renders in two places at once -- as a sidebar on the menu
 * and inside the cart drawer -- so keeping order submission out of it means
 * there is exactly one place an order can be created, not two.
 */
export const RightOrderPanel: React.FC<RightOrderPanelProps> = ({
  onRequireAuth,
  onProceedToCheckout,
  isDrawer = false,
  onCloseDrawer
}) => {
  const { cart, updateQuantity, removeFromCart, clearCart, subtotal, deliveryFee, taxAmount, grandTotal, settings } = useCart();
  const { user } = useAuth();

  const isMinOrderMet = subtotal >= settings.min_order_value;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleCheckoutClick = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (isDrawer && onCloseDrawer) onCloseDrawer();
    onProceedToCheckout();
  };

  return (
    <div className={`bg-[#121212] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col justify-between text-gray-200 ${
      isDrawer ? 'h-full border-none rounded-none' : 'sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto'
    }`}>

      {/* Panel Header */}
      <div className="pb-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#181818] border border-[#C5A059]/40 rounded-xl text-[#C5A059] shadow-sm">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white font-serif tracking-tight">Your Cart</h2>
            <p className="text-[11px] text-gray-400">
              {cart.length === 0 ? 'Cart is empty' : `${itemCount} item${itemCount === 1 ? '' : 's'} selected`}
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="py-4 space-y-4 flex-1">
        {cart.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <div className="w-16 h-16 bg-[#181818] border border-white/10 rounded-2xl flex items-center justify-center mx-auto text-gray-500">
              <ShoppingBag className="w-8 h-8 text-[#C5A059]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">No items in your cart</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Click "+ ADD" on any biryani, starter, or dessert from the menu to build your order!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.menuItem.id}
                  className="p-3 bg-[#181818] rounded-2xl border border-white/10 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.menuItem.is_veg ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {item.menuItem.name}
                      </h4>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.menuItem.id)}
                      className="text-gray-500 hover:text-rose-400 transition p-0.5"
                      title="Remove item"
                      aria-label={`Remove ${item.menuItem.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <div className="flex items-center gap-2 bg-[#121212] border border-white/10 rounded-lg px-2 py-0.5">
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, -1)}
                        aria-label={`Decrease ${item.menuItem.name}`}
                        className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center font-bold text-gray-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-[#C5A059] px-1 text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, 1)}
                        aria-label={`Increase ${item.menuItem.name}`}
                        className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center font-bold text-gray-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-gray-400 text-[11px] mr-1">₹{item.menuItem.price} x {item.quantity} =</span>
                      <span className="font-extrabold text-white text-xs">₹{item.menuItem.price * item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Calculation Summary */}
            <div className="pt-3 border-t border-white/10 text-xs space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Items Subtotal</span>
                <span className="font-bold text-white">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery Charge</span>
                <span className="font-bold">
                  {deliveryFee === 0 ? <span className="text-emerald-400 font-extrabold uppercase">FREE</span> : `₹${deliveryFee}`}
                </span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>GST ({settings.tax_percent}%)</span>
                  <span className="font-bold text-white">₹{taxAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                <span>Grand Total</span>
                <span className="text-[#C5A059] text-base">₹{grandTotal}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {cart.length > 0 && (
        <div className="pt-3 border-t border-white/10">
          {!isMinOrderMet && (
            <p className="text-[11px] text-[#C5A059] font-semibold mb-2 text-center bg-[#181818] p-1.5 rounded-xl border border-white/10">
              Add ₹{settings.min_order_value - subtotal} more for min order value (₹{settings.min_order_value})
            </p>
          )}

          <button
            onClick={handleCheckoutClick}
            disabled={!isMinOrderMet}
            className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] active:scale-[0.99] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 flex items-center justify-center gap-2 transition text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{user ? `Proceed to Checkout • ₹${grandTotal}` : 'Sign In to Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
