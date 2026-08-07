import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { ShoppingBag, Trash2, Plus, Minus, MapPin, QrCode, DollarSign, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import { Order, PaymentMethod } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { playKitchenAlertSound } from '../../lib/sound';
import { currentTimestamp, formatCurrency } from '../../lib/format';

import { captureFullSecurityContext } from '../../lib/geoUtils';

interface RightOrderPanelProps {
  onOrderSuccess: (order: Order) => void;
  onRequireAuth: () => void;
  existingOrders?: Order[];
  isDrawer?: boolean;
  onCloseDrawer?: () => void;
}

export const RightOrderPanel: React.FC<RightOrderPanelProps> = ({
  onOrderSuccess,
  onRequireAuth,
  existingOrders = [],
  isDrawer = false,
  onCloseDrawer
}) => {
  const { cart, updateQuantity, removeFromCart, clearCart, subtotal, deliveryFee, taxAmount, grandTotal, settings } = useCart();
  const { user } = useAuth();

  const [deliveryAddress, setDeliveryAddress] = useState(user?.hostel_address || 'Main Campus Hostel, Block B Room 204');
  const [landmark, setLandmark] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [upiTxnId, setUpiTxnId] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [placedOrderSuccess, setPlacedOrderSuccess] = useState<Order | null>(null);

  const isMinOrderMet = subtotal >= settings.min_order_value;

  const handlePlaceOrder = async () => {
    setErrorMsg('');

    if (!user) {
      onRequireAuth();
      return;
    }

    if (!deliveryAddress.trim()) {
      setErrorMsg('Please enter your hostel / room delivery address.');
      return;
    }

    if (!isMinOrderMet) {
      setErrorMsg(
        `Minimum order value is ${formatCurrency(settings.min_order_value)}. Add ${formatCurrency(settings.min_order_value - subtotal)} more.`
      );
      return;
    }

    if (paymentMethod === 'UPI' && !upiTxnId.trim()) {
      setErrorMsg('Please enter the 12-digit UPI transaction reference ID.');
      return;
    }

    setIsPlacing(true);

    const sec = await captureFullSecurityContext();

    // Compute sequential order number (#1001, #1002, #1003...)
    const orderNums = existingOrders.map(o => {
      const match = o.order_number?.match(/\d+/);
      return match ? parseInt(match[0], 10) : 1000;
    });
    const maxNum = orderNums.length > 0 ? Math.max(...orderNums) : 1000;
    const nextSeq = Math.max(maxNum + 1, 1005);
    const newOrderNumber = `#${nextSeq}`;

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      order_number: newOrderNumber,
      customer_id: user.id,
      customer_name: user.full_name,
      customer_phone: user.phone || '6301196547',
      delivery_address: deliveryAddress,
      landmark,
      items: cart.map(c => ({
        dish_id: c.menuItem.id,
        dish_name: c.menuItem.name,
        quantity: c.quantity,
        price: c.menuItem.price,
        is_veg: c.menuItem.is_veg
      })),
      subtotal,
      tax_amount: taxAmount,
      delivery_fee: deliveryFee,
      total_amount: grandTotal,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'UPI' ? 'completed' : 'pending',
      upi_transaction_id: upiTxnId,
      status: 'pending',
      customer_ip: sec.ipAddress,
      order_latitude: sec.latitude,
      order_longitude: sec.longitude,
      gps_accuracy: sec.accuracyMeters,
      gps_allowed: sec.gpsAllowed,
      distance_km: sec.distanceKm,
      device_type: sec.deviceType,
      os_name: sec.osName,
      browser_name: sec.browserName,
      city: sec.city,
      state: sec.state,
      pin_code: sec.pinCode,
      google_maps_url: sec.googleMapsUrl,
      fraud_risk_level: sec.fraudRiskLevel,
      fraud_risk_reasons: sec.fraudRiskReasons,
      created_at: currentTimestamp()
    };

    if (isSupabaseConfigured) {
      try {
        const { data: insertedOrder, error: insertError } = await supabase
          .from('orders')
          .insert([newOrder])
          .select()
          .single();

        if (insertError) {
          console.error('Failed to sync order to Supabase:', insertError.message);
          throw new Error(insertError.message);
        }
      } catch (err: any) {
        console.error('Order database insert error:', err);
        setErrorMsg(`Order creation failed: ${err?.message || 'Database error'}`);
        setIsPlacing(false);
        return;
      }
    }

    // Play kitchen alert chime
    playKitchenAlertSound();

    setIsPlacing(false);
    clearCart();
    setPlacedOrderSuccess(newOrder);
    onOrderSuccess(newOrder);

    if (isDrawer && onCloseDrawer) {
      setTimeout(() => onCloseDrawer(), 2500);
    }
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
            <h2 className="text-base font-extrabold text-white font-serif tracking-tight">Your Order Summary</h2>
            <p className="text-[11px] text-gray-400">
              {cart.length === 0 ? 'Cart is empty' : `${cart.reduce((s, i) => s + i.quantity, 0)} items selected`}
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
        
        {/* Order Success Message Banner */}
        {placedOrderSuccess ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2 animate-in fade-in">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-black text-white">Order {placedOrderSuccess.order_number} Confirmed!</h3>
            <p className="text-xs text-emerald-300">
              Sent to kitchen! Your food is now being prepared fresh.
            </p>
            <button
              onClick={() => setPlacedOrderSuccess(null)}
              className="mt-2 text-xs font-bold bg-emerald-500 text-black px-4 py-1.5 rounded-xl hover:bg-emerald-400 transition"
            >
              Order More Items
            </button>
          </div>
        ) : cart.length === 0 ? (
          /* Empty Cart State */
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
          /* Cart Items List */
          <div className="space-y-3">
            
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
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
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <div className="flex items-center gap-2 bg-[#121212] border border-white/10 rounded-lg px-2 py-0.5">
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, -1)}
                        className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center font-bold text-gray-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-[#C5A059] px-1 text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, 1)}
                        className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center font-bold text-gray-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-gray-400 text-[11px] mr-1">{formatCurrency(item.menuItem.price)} x {item.quantity} =</span>
                      <span className="font-extrabold text-white text-xs">{formatCurrency(item.menuItem.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery Location Section */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Delivery Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#C5A059] absolute left-3 top-3" />
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Hostel Room / Gate No / Building Address"
                  className="w-full pl-9 pr-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-xs font-medium text-white placeholder-gray-500 focus:border-[#C5A059] outline-none"
                />
              </div>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Landmark (Optional)"
                className="w-full px-3 py-1.5 bg-[#181818] border border-white/10 rounded-xl text-xs font-medium text-white placeholder-gray-500 focus:border-[#C5A059] outline-none"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Payment Option
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-2.5 rounded-xl border text-left font-bold text-xs flex items-center gap-1.5 transition ${
                    paymentMethod === 'COD'
                      ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]'
                      : 'border-white/10 bg-[#181818] text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-[#C5A059]" />
                  <span>Cash on Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-2.5 rounded-xl border text-left font-bold text-xs flex items-center gap-1.5 transition ${
                    paymentMethod === 'UPI'
                      ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]'
                      : 'border-white/10 bg-[#181818] text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-[#C5A059]" />
                  <span>Instant UPI QR</span>
                </button>
              </div>

              {/* UPI QR Display */}
              {paymentMethod === 'UPI' && (
                <div className="p-3 bg-[#181818] rounded-xl border border-white/10 text-center space-y-2">
                  <p className="text-xs font-bold text-[#C5A059]">
                    Scan & Pay {formatCurrency(grandTotal)}
                  </p>
                  <div className="bg-white p-2 rounded-xl inline-block border border-white/20">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                        `upi://pay?pa=${settings.restaurant_upi_id}&pn=TrippysMehfill&am=${grandTotal}&cu=INR`
                      )}`}
                      alt="UPI QR Code"
                      className="w-28 h-28 mx-auto"
                    />
                  </div>
                  <p className="font-mono text-xs text-white bg-[#121212] py-1 px-2 rounded border border-[#C5A059]/30">
                    {settings.restaurant_upi_id}
                  </p>

                  <input
                    type="text"
                    value={upiTxnId}
                    onChange={(e) => setUpiTxnId(e.target.value)}
                    placeholder="Enter 12-digit UPI Txn Ref ID"
                    className="w-full px-3 py-1.5 bg-[#121212] border border-white/10 rounded-xl text-xs font-mono text-white outline-none focus:border-[#C5A059]"
                  />
                </div>
              )}
            </div>

            {/* Bill Calculation Summary */}
            <div className="pt-3 border-t border-white/10 text-xs space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Items Subtotal</span>
                <span className="font-bold text-white">{formatCurrency(subtotal)}</span>
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
                  <span className="font-bold text-white">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                <span>Grand Total</span>
                <span className="text-[#C5A059] text-base">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Footer Checkout Button */}
      {cart.length > 0 && !placedOrderSuccess && (
        <div className="pt-3 border-t border-white/10">
          {!isMinOrderMet && (
            <p className="text-[11px] text-[#C5A059] font-semibold mb-2 text-center bg-[#181818] p-1.5 rounded-xl border border-white/10">
              Add {formatCurrency(settings.min_order_value - subtotal)} more for min order value ({formatCurrency(settings.min_order_value)})
            </p>
          )}

          {!user ? (
            <button
              onClick={onRequireAuth}
              className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl shadow-lg transition text-xs"
            >
              Sign In to Place Order
            </button>
          ) : (
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacing || !isMinOrderMet}
              className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] active:scale-[0.99] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 flex items-center justify-center gap-2 transition text-xs sm:text-sm disabled:opacity-50"
            >
              {isPlacing ? (
                <span>Sending to Kitchen...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Place Order • {formatCurrency(grandTotal)}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

    </div>
  );
};
