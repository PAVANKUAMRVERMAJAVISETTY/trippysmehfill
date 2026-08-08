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
      return { icon: '🟢', text: paymentLabel(order), className: 'bg-[#D1FAE5] text-[#146C43] border-[#86EFAC]' };
    case 'error':
      return { icon: '⛔', text: `${paymentLabel(order)} — do not prepare`, className: 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]' };
    case 'pending':
      return { icon: '⚠️', text: paymentLabel(order), className: 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]' };
    default:
      return { icon: '🚚', text: paymentLabel(order), className: 'bg-[#F7F4EC] text-[#5F6368] border-[#DDD6C8]' };
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
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-[#1F2933]" style={{ backgroundColor: '#F4F0E8' }}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#D8D2C5] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#1F2933] font-serif flex items-center gap-2">
            <CookingPot className="w-7 h-7 text-[#D95F0A]" />
            <span>Kitchen Display System (KDS)</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Orders arrive here automatically with a sound alert — <strong>including UPI orders whose
            payment has not been confirmed yet</strong>. Check the payment badge on each ticket before
            you start cooking.
          </p>
        </div>

        <button
          onClick={handleTestSound}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFF0CC] hover:bg-[#FFE5A3] text-[#8A5A00] rounded-xl font-bold text-xs border border-[#E8C66A] transition cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-[#8A5A00]" />
          <span>Test Sound Alert</span>
        </button>
      </div>

      {/* Ticket Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-[#DDD6C8]">
          <CookingPot className="w-12 h-12 text-[#DDD6C8] mx-auto mb-2 animate-bounce" />
          <p className="text-[#1F2933] font-bold">No live tickets right now.</p>
          <p className="text-xs text-[#5F6368] mt-1">When new orders come in, they will beep and appear here instantly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kitchenOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[#F7F4EC] rounded-2xl p-5 border-2 border-[#DDD6C8] shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3 mb-3">
                  <div>
                    <span className="text-xl font-black text-[#D95F0A]">{order.order_number}</span>
                    <span className="text-xs text-[#5F6368] font-bold ml-2">({order.customer_name})</span>
                  </div>
                  <span className="px-2.5 py-1 bg-[#D95F0A] text-white rounded-lg text-xs font-black uppercase border border-[#B94D00]">
                    {order.status}
                  </span>
                </div>

                {/* Payment state */}
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
                  <h4 className="text-[11px] font-extrabold uppercase text-[#5F6368] tracking-wider">Items to prepare:</h4>
                  {order.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-[#DDD6C8] flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${it.is_veg ? 'bg-[#198754]' : 'bg-[#C0392B]'}`} />
                        <span className="font-bold text-[#1F2933] text-sm">{it.dish_name}</span>
                      </div>
                      <span className="bg-[#FFF0CC] text-[#8A5A00] border border-[#E8C66A] font-black px-2.5 py-1 rounded-lg text-sm">
                        x{it.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Stage Buttons */}
              <div className="pt-2 border-t border-[#DDD6C8]">
                <button
                  onClick={() => onUpdateOrderStatus(order.id, 'out_for_delivery')}
                  className="w-full py-3 bg-[#198754] hover:bg-[#146C43] text-white font-extrabold rounded-xl shadow-sm border border-[#146C43] transition flex items-center justify-center gap-2 text-xs cursor-pointer"
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
