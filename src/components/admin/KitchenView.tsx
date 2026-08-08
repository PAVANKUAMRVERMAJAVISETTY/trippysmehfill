import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { CookingPot, Volume2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { playKitchenAlertSound } from '../../lib/sound';
import { paymentLabel, paymentTone } from '../../lib/orderStatus';

/**
 * How the payment reads on a kitchen ticket.
 *
 * The kitchen sees every order the moment it is placed, paid or not, so the
 * badge is the only thing telling them whether the money arrived. Wording and
 * colour come from the shared helpers, so this cannot drift away from what the
 * customer is being told on their own screen.
 *
 * A rejected payment is deliberately the loudest state on the ticket: it is the
 * one case where cooking the food is actively wrong.
 */
const paymentBadge = (order: Order) => {
  switch (paymentTone(order)) {
    case 'success':
      return { icon: '🟢', text: paymentLabel(order), className: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    case 'error':
      return { icon: '⛔', text: `${paymentLabel(order)} — do not prepare`, className: 'bg-rose-100 text-rose-900 border-rose-400' };
    case 'pending':
      return { icon: '⚠️', text: paymentLabel(order), className: 'bg-amber-100 text-amber-900 border-amber-300' };
    default:
      return { icon: '🚚', text: paymentLabel(order), className: 'bg-gray-100 text-gray-700 border-gray-300' };
  }
};

interface KitchenViewProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

export const KitchenView: React.FC<KitchenViewProps> = ({ orders, onUpdateOrderStatus }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const kitchenOrders = orders.filter(o => o.status === 'pending' || o.status === 'cooking' || o.status === 'assigned');

  const handleTestSound = () => {
    playKitchenAlertSound();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-orange-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-serif flex items-center gap-2">
            <CookingPot className="w-7 h-7 text-orange-600" />
            <span>Kitchen Display System (KDS)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Orders arrive here automatically with a sound alert — <strong>including UPI orders whose
            payment has not been confirmed yet</strong>. Check the payment badge on each ticket before
            you start cooking.
          </p>
        </div>

        <button
          onClick={handleTestSound}
          className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold text-xs transition"
        >
          <Volume2 className="w-4 h-4 text-amber-700" />
          <span>Test Sound Alert</span>
        </button>
      </div>

      {/* Ticket Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
          <CookingPot className="w-12 h-12 text-gray-300 mx-auto mb-2 animate-bounce" />
          <p className="text-gray-800 font-bold">No live tickets right now.</p>
          <p className="text-xs text-gray-400 mt-1">When new orders come in, they will beep and appear here instantly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kitchenOrders.map((order) => (
            <div
              key={order.id}
              className="bg-amber-50/50 rounded-2xl p-5 border-2 border-orange-300 shadow-lg flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between border-b border-orange-200 pb-3 mb-3">
                  <div>
                    <span className="text-xl font-black text-orange-700">{order.order_number}</span>
                    <span className="text-xs text-gray-500 font-bold ml-2">({order.customer_name})</span>
                  </div>
                  <span className="px-2.5 py-1 bg-orange-600 text-white rounded-lg text-xs font-black uppercase">
                    {order.status}
                  </span>
                </div>

                {/* Payment state — the only signal the kitchen has about whether
                    the money arrived, so it sits above the food, not below it. */}
                {(() => {
                  const badge = paymentBadge(order);
                  return (
                    <div
                      className={`mb-3 px-3 py-2 rounded-xl border-2 flex items-center gap-2 ${badge.className}`}
                    >
                      <span aria-hidden="true" className="text-base leading-none">{badge.icon}</span>
                      <span className="text-xs font-black uppercase tracking-wide">{badge.text}</span>
                    </div>
                  );
                })()}

                {/* Items to Cook */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">Items to prepare:</h4>
                  {order.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-amber-200/80 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${it.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="font-bold text-gray-900 text-sm">{it.dish_name}</span>
                      </div>
                      <span className="bg-orange-100 text-orange-950 font-black px-2.5 py-1 rounded-lg text-sm">
                        x{it.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Stage Buttons */}
              <div className="pt-2 border-t border-orange-200">
                <button
                  onClick={() => onUpdateOrderStatus(order.id, 'out_for_delivery')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                >
                  <span>Ready for Dispatch</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
