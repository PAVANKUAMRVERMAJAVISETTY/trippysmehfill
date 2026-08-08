import React, { useState } from 'react';
import { Order, OrderStatus, PaymentStatus, UserProfile } from '../../types';
import { Bike, Phone, MapPin, CheckCircle2, Clock, XCircle, ChevronDown, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatDistanceText, getRouteDirectionsUrl } from '../../lib/geoUtils';
// Rows written by the parallel build hold 'paid' / 'pending_verification',
// which this deployment's CHECK constraint no longer accepts. Reads normalise
// them so those orders still render; writes below use the five values the
// database actually allows.
import { normalizePaymentStatus } from '../../lib/orderStatus';

interface LiveOrdersViewProps {
  orders: Order[];
  drivers: UserProfile[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, driverId?: string, driverName?: string, driverPhone?: string, paymentStatus?: PaymentStatus) => void;
}

export const LiveOrdersView: React.FC<LiveOrdersViewProps> = ({
  orders,
  drivers,
  onUpdateOrderStatus
}) => {
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});

  const handleAssignAndStatus = (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => {
    const driverId = selectedDrivers[orderId];
    const driverObj = drivers.find(d => d.id === driverId);
    // driverPhone sits in position 5 now that both branches' parameters are
    // present. It was previously never passed, so assignDriver stored an empty
    // driver_phone and the customer had no number to call.
    onUpdateOrderStatus(orderId, status, driverObj?.id, driverObj?.full_name, driverObj?.phone, paymentStatus);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-[#1F2933]" style={{ backgroundColor: '#F3F6F4' }}>
      <div>
        <h1 className="text-2xl font-black text-[#252525] font-serif">Live Orders</h1>
        <p className="text-xs text-[#5F6368]">New orders appear here automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orders.map((order) => {
          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-5 border border-[#DDD6C8] shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              {/* Top Banner Status */}
              <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
                <div>
                  <span className="text-lg font-black text-[#D95F0A]">{order.order_number}</span>
                  <span className="text-xs text-[#5F6368] ml-2 font-mono">{order.created_at}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                  order.status === 'delivered' ? 'bg-[#D1FAE5] text-[#146C43] border-[#86EFAC]' :
                  order.status === 'out_for_delivery' ? 'bg-[#E8F1FA] text-[#2563A6] border-[#8FB6D9]' :
                  order.status === 'cooking' ? 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]' :
                  order.status === 'cancelled' ? 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]' : 'bg-[#FFF0CC] text-[#D95F0A] border-[#E8C66A]'
                }`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-[#1F2933]">
                  <span className="text-sm">{order.customer_name}</span>
                  <a href={`tel:${order.customer_phone}`} className="text-[#D95F0A] underline font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#D95F0A]" />
                    <span>{order.customer_phone}</span>
                  </a>
                </div>

                <div className="flex items-start gap-1.5 text-[#5F6368]">
                  <MapPin className="w-3.5 h-3.5 text-[#B8862D] shrink-0 mt-0.5" />
                  <span className="text-[#1F2933]">{order.delivery_address}</span>
                </div>

                {order.landmark && (
                  <p className="text-[11px] text-[#5F6368] italic">Preference: {order.landmark}</p>
                )}

                {/* ERP Anti-Fraud & Live GPS Tracking Panel */}
                <div className="bg-[#F7F4EC] rounded-xl p-2.5 text-[11px] text-[#1F2933] space-y-1.5 border border-[#DDD6C8]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5F6368] font-bold text-[10px]">Anti-Fraud Risk:</span>
                    <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase border flex items-center gap-1 ${
                      order.fraud_risk_level === 'high'
                        ? 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]'
                        : order.fraud_risk_level === 'medium'
                        ? 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]'
                        : 'bg-[#D1FAE5] text-[#146C43] border-[#86EFAC]'
                    }`}>
                      {order.fraud_risk_level === 'high' && '🔴 HIGH RISK'}
                      {order.fraud_risk_level === 'medium' && '⚠️ MEDIUM RISK'}
                      {(!order.fraud_risk_level || order.fraud_risk_level === 'low') && '🟢 LOW RISK'}
                    </span>
                  </div>

                  {order.fraud_risk_reasons && order.fraud_risk_reasons.length > 0 && (
                    <div className="p-1.5 bg-[#FDE2E1] border border-[#F5A6A1] rounded-lg space-y-0.5 text-[9px] text-[#922B21]">
                      {order.fraud_risk_reasons.map((r, i) => (
                        <p key={i} className="font-bold flex items-start gap-1">
                          <span>•</span>
                          <span>{r}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-[#5F6368] font-mono">
                    <span>🌐 IP: {order.customer_ip || '103.211.14.82'}</span>
                    <span className="text-[#D95F0A] font-bold">{order.device_type || 'Desktop'} ({order.os_name || 'Windows'})</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#DDD6C8] text-[10px]">
                    <span className="text-[#146C43] font-bold font-mono">
                      📍 {formatDistanceText(order.distance_km || 0.1)}
                    </span>
                    <div className="flex items-center gap-1">
                      <a
                        href={order.google_maps_url || `https://www.google.com/maps?q=${order.order_latitude || 28.2468},${order.order_longitude || 77.0628}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-white hover:bg-[#F0E8D8] text-[#1F2933] font-bold rounded transition text-[9px] border border-[#9F988A]"
                      >
                        📍 Pos
                      </a>
                      <a
                        href={getRouteDirectionsUrl(order.order_latitude || 28.2468, order.order_longitude || 77.0628)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded transition text-[10px] flex items-center gap-1 shadow-sm border border-[#B94D00]"
                      >
                        🗺️ Route from GLS
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* UPI Payment Settlement Verification Card */}
              {order.payment_method === 'UPI' && (
                <div className={`p-3 rounded-xl border space-y-2 text-xs ${
                  normalizePaymentStatus(order.payment_status) === 'completed'
                    ? 'bg-[#D1FAE5] border-[#86EFAC] text-[#146C43]'
                    : normalizePaymentStatus(order.payment_status) === 'failed'
                    || normalizePaymentStatus(order.payment_status) === 'rejected'
                    ? 'bg-[#FDE2E1] border-[#F5A6A1] text-[#922B21]'
                    : 'bg-[#FFF0CC] border-[#E8C66A] text-[#8A5A00]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                      {normalizePaymentStatus(order.payment_status) === 'completed' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-[#146C43]" />
                          <span>✓ UPI Payment Verified & Paid</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-[#8A5A00]" />
                          <span>⚠️ UPI Payment Verification Pending</span>
                        </>
                      )}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white font-mono font-bold text-[10px] uppercase border border-[#DDD6C8]">
                      {order.payment_status}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-[#DDD6C8] space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#5F6368]">UTR / Ref ID:</span>
                      <strong className="text-[#1F2933] font-bold">{order.utr_number || order.upi_transaction_id || 'Not Submitted'}</strong>
                    </div>
                    {order.payment_time && (
                      <div className="flex justify-between text-[10px] text-[#5F6368]">
                        <span>Submitted Time:</span>
                        <span>{new Date(order.payment_time).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>

                  {normalizePaymentStatus(order.payment_status) === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleAssignAndStatus(order.id, 'cooking', 'completed')}
                        className="py-1.5 bg-[#198754] hover:bg-[#146C43] text-white font-extrabold rounded-lg text-xs transition shadow-sm border border-[#146C43] cursor-pointer"
                      >
                        ✓ Approve & Cook
                      </button>
                      <button
                        onClick={() => handleAssignAndStatus(order.id, 'cancelled', 'rejected')}
                        className="py-1.5 bg-[#C0392B] hover:bg-[#922B21] text-white font-extrabold rounded-lg text-xs transition shadow-sm border border-[#922B21] cursor-pointer"
                      >
                        ✕ Reject Payment
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="bg-[#F7F4EC] rounded-xl p-3 border border-[#DDD6C8] space-y-1 text-xs">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[#1F2933] font-medium">
                    <span>{it.dish_name} <strong className="text-[#D95F0A]">x{it.quantity}</strong></span>
                    <span className="font-bold text-[#1F2933]">₹{it.price * it.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-[#DDD6C8] font-extrabold text-sm text-[#1F2933]">
                  <span className="bg-[#FFF0CC] text-[#8A5A00] px-2 py-0.5 rounded text-[10px] font-mono uppercase border border-[#E8C66A]">
                    {order.payment_method}
                  </span>
                  <span className="text-[#D95F0A]">₹{order.total_amount}</span>
                </div>
              </div>

              {/* Driver Assignment Dropdown */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="space-y-2 pt-2 border-t border-[#DDD6C8]">
                  <div className="relative">
                    <select
                      value={selectedDrivers[order.id] || order.driver_id || ''}
                      onChange={(e) => setSelectedDrivers({ ...selectedDrivers, [order.id]: e.target.value })}
                      className="w-full bg-[#F8F6F0] border border-[#9F988A] rounded-xl px-3 py-2 text-xs font-semibold text-[#1F2933] outline-none focus:border-[#D95F0A]"
                    >
                      <option value="">Select Delivery Driver...</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name} ({d.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'cooking')}
                      className="py-2 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-bold rounded-xl text-xs transition border border-[#B94D00] cursor-pointer"
                    >
                      Cook in Kitchen
                    </button>
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'out_for_delivery')}
                      className="py-2 bg-[#2563A6] hover:bg-[#1E4F7A] text-white font-bold rounded-xl text-xs transition border border-[#1E4F7A] cursor-pointer"
                    >
                      Out for Delivery
                    </button>
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'delivered')}
                      className="py-2 bg-[#198754] hover:bg-[#146C43] text-white font-bold rounded-xl text-xs transition border border-[#146C43] cursor-pointer"
                    >
                      Mark Delivered
                    </button>
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'cancelled')}
                      className="py-2 bg-[#FDE2E1] hover:bg-[#F5A6A1] text-[#922B21] font-bold rounded-xl text-xs transition border border-[#F5A6A1] cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};
