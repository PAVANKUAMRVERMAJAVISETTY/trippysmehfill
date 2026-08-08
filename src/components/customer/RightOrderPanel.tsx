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
    <div className={`bg-white border border-[#DDD6C8] rounded-3xl p-5 shadow-md flex flex-col justify-between text-[#1F2933] ${
      isDrawer ? 'h-full border-none rounded-none' : 'sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto'
    }`}>

      {/* Panel Header */}
      <div className="pb-4 border-b border-[#DDD6C8] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#F7F4EC] border border-[#DDD6C8] rounded-xl text-[#B8862D] shadow-sm">
            <ShoppingBag className="w-5 h-5 text-[#B8862D]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#1F2933] font-serif tracking-tight">Your Cart</h2>
            <p className="text-[11px] text-[#5F6368]">
              {cart.length === 0 ? 'Cart is empty' : `${itemCount} item${itemCount === 1 ? '' : 's'} selected`}
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-[11px] font-bold text-[#C0392B] hover:underline cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="py-4 space-y-4 flex-1">
        {cart.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <div className="w-16 h-16 bg-[#F7F4EC] border border-[#DDD6C8] rounded-2xl flex items-center justify-center mx-auto text-[#5F6368]">
              <ShoppingBag className="w-8 h-8 text-[#B8862D]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1F2933]">No items in your cart</p>
              <p className="text-xs text-[#5F6368] mt-1 max-w-xs mx-auto">
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
                  className="p-3 bg-[#F7F4EC] rounded-2xl border border-[#DDD6C8] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.menuItem.is_veg ? 'bg-[#198754]' : 'bg-[#C0392B]'
                        }`}
                      />
                      <h4 className="text-xs font-bold text-[#1F2933] line-clamp-1">
                        {item.menuItem.name}
                      </h4>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.menuItem.id)}
                      className="text-[#5F6368] hover:text-[#C0392B] transition p-0.5 cursor-pointer"
                      title="Remove item"
                      aria-label={`Remove ${item.menuItem.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#DDD6C8]">
                    <div className="flex items-center gap-2 bg-white border border-[#9F988A] rounded-lg px-2 py-0.5">
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, -1)}
                        aria-label={`Decrease ${item.menuItem.name}`}
                        className="w-5 h-5 rounded hover:bg-[#F0E8D8] flex items-center justify-center font-bold text-[#1F2933] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-[#D95F0A] px-1 text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, 1)}
                        aria-label={`Increase ${item.menuItem.name}`}
                        className="w-5 h-5 rounded hover:bg-[#F0E8D8] flex items-center justify-center font-bold text-[#1F2933] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[#5F6368] text-[11px] mr-1">₹{item.menuItem.price} x {item.quantity} =</span>
                      <span className="font-extrabold text-[#1F2933] text-xs">₹{item.menuItem.price * item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Calculation Summary */}
            <div className="pt-3 border-t border-[#DDD6C8] text-xs space-y-1">
              <div className="flex justify-between text-[#5F6368]">
                <span>Items Subtotal</span>
                <span className="font-bold text-[#1F2933]">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-[#5F6368]">
                <span>Delivery Charge</span>
                <span className="font-bold">
                  {deliveryFee === 0 ? <span className="text-[#198754] font-extrabold uppercase">FREE</span> : `₹${deliveryFee}`}
                </span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-[#5F6368]">
                  <span>GST ({settings.tax_percent}%)</span>
                  <span className="font-bold text-[#1F2933]">₹{taxAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#1F2933] pt-2 border-t border-[#DDD6C8]">
                <span>Grand Total</span>
                <span className="text-[#D95F0A] text-base font-black">₹{grandTotal}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {cart.length > 0 && (
        <div className="pt-3 border-t border-[#DDD6C8]">
          {!isMinOrderMet && (
            <p className="text-[11px] text-[#B8862D] font-semibold mb-2 text-center bg-[#F7F4EC] p-1.5 rounded-xl border border-[#DDD6C8]">
              Add ₹{settings.min_order_value - subtotal} more for min order value (₹{settings.min_order_value})
            </p>
          )}

          <button
            onClick={handleCheckoutClick}
            disabled={!isMinOrderMet}
            className="w-full py-3 bg-[#D95F0A] hover:bg-[#B94D00] active:scale-[0.99] text-white font-extrabold rounded-xl shadow-md border border-[#B94D00] flex items-center justify-center gap-2 transition text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{user ? `Proceed to Checkout • ₹${grandTotal}` : 'Sign In to Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
