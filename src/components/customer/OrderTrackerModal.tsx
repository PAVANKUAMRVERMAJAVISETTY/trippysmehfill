import React from 'react';
import { Order, OrderStatus } from '../../types';
import { X, CheckCircle2, Clock, CookingPot, Bike, MapPin, Phone } from 'lucide-react';
import { formatCurrency } from '../../lib/format';

interface OrderTrackerModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onLeaveFeedback?: (order: Order) => void;
}

const statusSteps: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'pending', label: 'Order Placed', icon: <Clock className="w-4 h-4" /> },
  { key: 'cooking', label: 'Cooking in Kitchen', icon: <CookingPot className="w-4 h-4" /> },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: <Bike className="w-4 h-4" /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle2 className="w-4 h-4" /> }
];

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  order,
  isOpen,
  onClose,
  onLeaveFeedback
}) => {
  if (!isOpen || !order) return null;

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 0;
      case 'cooking': return 1;
      case 'assigned': return 1;
      case 'out_for_delivery': return 2;
      case 'delivered': return 3;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const currentStep = getStepIndex(order.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#121212] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10 text-gray-200">
        
        {/* Header */}
        <div className="p-5 bg-[#0d0d0d] border-b border-white/10 text-white flex items-center justify-between">
          <div>
            <div className="text-xs text-[#C5A059] font-bold uppercase tracking-wider">Live Tracking</div>
            <h2 className="text-xl font-extrabold font-serif">Order {order.order_number}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Cancelled State */}
          {order.status === 'cancelled' ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center text-rose-400">
              <p className="font-bold text-base">Order Cancelled</p>
              <p className="text-xs text-rose-300/80 mt-1">This order was cancelled by the cloud kitchen or customer.</p>
            </div>
          ) : (
            /* Progress Stepper */
            <div className="relative py-2">
              <div className="flex items-center justify-between relative z-10">
                {statusSteps.map((step, idx) => {
                  const isCompleted = idx <= currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1 text-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                          isCompleted
                            ? 'bg-[#C5A059] text-black font-extrabold ring-4 ring-[#C5A059]/20'
                            : 'bg-[#181818] text-gray-500 border border-white/10'
                        }`}
                      >
                        {step.icon}
                      </div>
                      <span
                        className={`text-[11px] font-bold mt-2 leading-tight ${
                          isCurrent ? 'text-[#C5A059]' : isCompleted ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery Details */}
          <div className="bg-[#181818] rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
            <div className="flex items-start gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Delivery Address</p>
                <p className="text-gray-300">{order.delivery_address}</p>
                {order.landmark && <p className="text-gray-400">Landmark: {order.landmark}</p>}
              </div>
            </div>

            {order.driver_name && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Assigned Delivery Partner</p>
                  <p className="text-gray-300 font-semibold">{order.driver_name}</p>
                </div>
                {order.driver_phone && (
                  <a
                    href={`tel:${order.driver_phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl transition text-xs shadow-md"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Items Summary */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Order Items</h3>
            <div className="space-y-1.5 text-xs">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-gray-300 font-medium py-1 border-b border-white/5">
                  <span>{item.dish_name} <strong className="text-[#C5A059]">x{item.quantity}</strong></span>
                  <span className="font-bold text-white">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between font-extrabold text-sm text-white pt-2 border-t border-white/10">
                <span>Total Amount ({order.payment_method})</span>
                <span className="text-[#C5A059]">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Leave Feedback Action if Delivered */}
          {order.status === 'delivered' && onLeaveFeedback && (
            <button
              onClick={() => { onClose(); onLeaveFeedback(order); }}
              className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 transition text-xs"
            >
              ★ Leave Feedback & Rating
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
