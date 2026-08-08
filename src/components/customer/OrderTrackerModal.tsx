import React from 'react';
import { Order } from '../../types';
import { X, MapPin, Phone } from 'lucide-react';
import { OrderProgressTimeline } from './OrderProgressTimeline';
import { statusLabel, paymentLabel, paymentNote, paymentTone } from '../../lib/orderStatus';
import { estimatedDeliveryLabel } from '../../lib/checkout';
// WhatsApp support entry point, kept from the other branch -- the merged body
// still calls it. The icons and OrderStatus it also imported are gone because
// the inline status timeline they drew was replaced by OrderProgressTimeline;
// leaving them would be unused imports.
import { openWhatsAppSupport } from '../../lib/whatsapp';

const PAYMENT_TONE_CLASS: Record<string, string> = {
  success: 'text-[#146C43]',
  pending: 'text-[#8A5A00]',
  error: 'text-[#922B21]',
  neutral: 'text-[#B8862D]'
};

interface OrderTrackerModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onLeaveFeedback?: (order: Order) => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  order,
  isOpen,
  onClose,
  onLeaveFeedback
}) => {
  if (!isOpen || !order) return null;

  const note = paymentNote(order);
  const placedAt = new Date(order.created_at);
  const deliveryEstimate = order.status === 'delivered'
    ? 'Delivered'
    : order.status === 'cancelled'
      ? '—'
      : Number.isNaN(placedAt.getTime())
        ? '30 mins'
        : estimatedDeliveryLabel(placedAt, 30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#DDD6C8] text-[#1F2933]">
        
        {/* Header */}
        <div className="p-5 bg-[#F7F4EC] border-b border-[#DDD6C8] text-[#1F2933] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#B8862D] font-black uppercase tracking-wider">Live Tracking</div>
            <h2 className="text-xl font-extrabold font-serif">Order {order.order_number}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white hover:bg-[#F0E8D8] text-[#5F6368] transition border border-[#DDD6C8] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* At-a-glance facts */}
          <dl className="grid grid-cols-2 gap-3">
            <div className="bg-[#F7F4EC] rounded-2xl p-3.5 border border-[#DDD6C8]">
              <dt className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider">Order Status</dt>
              <dd className="text-sm font-black text-[#1F2933] mt-1">{statusLabel(order.status)}</dd>
            </div>

            <div className="bg-[#F7F4EC] rounded-2xl p-3.5 border border-[#DDD6C8]">
              <dt className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider">Payment Status</dt>
              <dd className={`text-sm font-black mt-1 ${PAYMENT_TONE_CLASS[paymentTone(order)]}`}>
                {paymentLabel(order)}
              </dd>
            </div>

            <div className="bg-[#F7F4EC] rounded-2xl p-3.5 border border-[#DDD6C8] col-span-2">
              <dt className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider">Estimated Delivery</dt>
              <dd className="text-sm font-black text-[#1F2933] mt-1">{deliveryEstimate}</dd>
            </div>
          </dl>

          {note && (
            <p className={`text-xs -mt-3 ${
              order.payment_status === 'rejected' || order.payment_status === 'failed'
                ? 'text-[#922B21] bg-[#FDE2E1] border border-[#F5A6A1] rounded-xl p-3 font-medium'
                : 'text-[#5F6368]'
            }`}>
              {note}
            </p>
          )}

          {/* Animated progress timeline */}
          <OrderProgressTimeline order={order} />

          {/* Delivery Details */}
          <div className="bg-[#F7F4EC] rounded-2xl p-4 border border-[#DDD6C8] space-y-2 text-xs">
            <div className="flex items-start gap-2 text-[#1F2933]">
              <MapPin className="w-4 h-4 text-[#B8862D] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#1F2933]">Delivery Address</p>
                <p className="text-[#1F2933]">{order.delivery_address}</p>
                {order.landmark && <p className="text-[#5F6368]">Landmark: {order.landmark}</p>}
              </div>
            </div>

            {order.driver_name && (
              <div className="pt-2 border-t border-[#DDD6C8] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#1F2933]">Assigned Delivery Partner</p>
                  <p className="text-[#1F2933] font-semibold">{order.driver_name}</p>
                </div>
                {order.driver_phone && (
                  <a
                    href={`tel:${order.driver_phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded-xl transition text-xs shadow-sm border border-[#B94D00]"
                  >
                    <Phone className="w-3.5 h-3.5 text-white" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Items Summary */}
          <div>
            <h3 className="text-xs font-bold text-[#5F6368] uppercase tracking-wider mb-2">Order Items</h3>
            <div className="space-y-1.5 text-xs">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[#1F2933] font-medium py-1 border-b border-[#DDD6C8]">
                  <span>{item.dish_name} <strong className="text-[#D95F0A]">x{item.quantity}</strong></span>
                  <span className="font-bold text-[#1F2933]">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="flex justify-between font-extrabold text-sm text-[#1F2933] pt-2 border-t border-[#DDD6C8]">
                <span>Total Amount ({order.payment_method})</span>
                <span className="text-[#D95F0A]">₹{order.total_amount}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp Support Action */}
          <button
            onClick={() => openWhatsAppSupport({ name: order.customer_name, phone: order.customer_phone, orderNumber: order.order_number })}
            className="w-full py-2.5 bg-[#198754] hover:bg-[#146C43] text-white font-extrabold rounded-xl shadow-sm transition text-xs flex items-center justify-center gap-2 border border-[#146C43] cursor-pointer"
          >
            <Phone className="w-4 h-4 text-white" />
            <span>Need Help? Chat on WhatsApp</span>
          </button>

          {/* Leave Feedback Action if Delivered */}
          {order.status === 'delivered' && onLeaveFeedback && (
            <button
              onClick={() => { onClose(); onLeaveFeedback(order); }}
              className="w-full py-3 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded-xl shadow-sm border border-[#B94D00] transition text-xs cursor-pointer"
            >
              ★ Leave Feedback & Rating
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
