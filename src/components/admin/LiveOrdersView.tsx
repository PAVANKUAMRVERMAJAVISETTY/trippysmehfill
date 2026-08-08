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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-serif">Live Orders</h1>
        <p className="text-xs text-gray-500">New orders appear here automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orders.map((order) => {
          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-5 border border-orange-100 shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              {/* Top Banner Status */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-lg font-black text-orange-600">{order.order_number}</span>
                  <span className="text-xs text-gray-400 ml-2 font-mono">{order.created_at}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                  order.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'cooking' ? 'bg-amber-100 text-amber-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="text-sm">{order.customer_name}</span>
                  <a href={`tel:${order.customer_phone}`} className="text-orange-600 underline font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{order.customer_phone}</span>
                  </a>
                </div>

                <div className="flex items-start gap-1.5 text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                  <span>{order.delivery_address}</span>
                </div>

                {order.landmark && (
                  <p className="text-[11px] text-gray-400 italic">Preference: {order.landmark}</p>
                )}

                {/* ERP Anti-Fraud & Live GPS Tracking Panel */}
                <div className="bg-neutral-900 rounded-xl p-2.5 text-[11px] text-gray-300 space-y-1.5 border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium text-[10px]">Anti-Fraud Risk:</span>
                    <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase border flex items-center gap-1 ${
                      order.fraud_risk_level === 'high'
                        ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                        : order.fraud_risk_level === 'medium'
                        ? 'bg-amber-950 text-amber-300 border-amber-600'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                    }`}>
                      {order.fraud_risk_level === 'high' && '🔴 HIGH RISK'}
                      {order.fraud_risk_level === 'medium' && '⚠️ MEDIUM RISK'}
                      {(!order.fraud_risk_level || order.fraud_risk_level === 'low') && '🟢 LOW RISK'}
                    </span>
                  </div>

                  {order.fraud_risk_reasons && order.fraud_risk_reasons.length > 0 && (
                    <div className="p-1.5 bg-rose-950/40 border border-rose-500/30 rounded-lg space-y-0.5 text-[9px] text-rose-300">
                      {order.fraud_risk_reasons.map((r, i) => (
                        <p key={i} className="font-bold flex items-start gap-1">
                          <span>•</span>
                          <span>{r}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>🌐 IP: {order.customer_ip || '103.211.14.82'}</span>
                    <span className="text-orange-400 font-bold">{order.device_type || 'Desktop'} ({order.os_name || 'Windows'})</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[10px]">
                    <span className="text-emerald-400 font-bold font-mono">
                      📍 {formatDistanceText(order.distance_km || 0.1)}
                    </span>
                    <div className="flex items-center gap-1">
                      <a
                        href={order.google_maps_url || `https://www.google.com/maps?q=${order.order_latitude || 28.2468},${order.order_longitude || 77.0628}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-bold rounded transition text-[9px] border border-neutral-700"
                      >
                        📍 Pos
                      </a>
                      <a
                        href={getRouteDirectionsUrl(order.order_latitude || 28.2468, order.order_longitude || 77.0628)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded transition text-[10px] flex items-center gap-1 shadow-sm"
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
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : normalizePaymentStatus(order.payment_status) === 'failed'
                    || normalizePaymentStatus(order.payment_status) === 'rejected'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                      {normalizePaymentStatus(order.payment_status) === 'completed' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>✓ UPI Payment Verified & Paid</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>⚠️ UPI Payment Verification Pending</span>
                        </>
                      )}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/80 font-mono font-bold text-[10px] uppercase border">
                      {order.payment_status}
                    </span>
                  </div>

                  <div className="bg-white/90 p-2 rounded-lg border space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">UTR / Ref ID:</span>
                      <strong className="text-gray-900 font-bold">{order.utr_number || order.upi_transaction_id || 'Not Submitted'}</strong>
                    </div>
                    {order.payment_time && (
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Submitted Time:</span>
                        <span>{new Date(order.payment_time).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>

                  {normalizePaymentStatus(order.payment_status) === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleAssignAndStatus(order.id, 'cooking', 'completed')}
                        className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition shadow-sm"
                      >
                        ✓ Approve & Cook
                      </button>
                      <button
                        onClick={() => handleAssignAndStatus(order.id, 'cancelled', 'rejected')}
                        className="py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs transition shadow-sm"
                      >
                        ✕ Reject Payment
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-gray-800 font-medium">
                    <span>{it.dish_name} <strong className="text-orange-600">x{it.quantity}</strong></span>
                    <span className="font-bold">₹{it.price * it.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 font-extrabold text-sm text-gray-900">
                  <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
                    {order.payment_method}
                  </span>
                  <span className="text-orange-600">₹{order.total_amount}</span>
                </div>
              </div>

              {/* Driver Assignment Dropdown */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="relative">
                    <select
                      value={selectedDrivers[order.id] || order.driver_id || ''}
                      onChange={(e) => setSelectedDrivers({ ...selectedDrivers, [order.id]: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-orange-500"
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
                      className="py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition"
                    >
                      Cook in Kitchen
                    </button>
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'out_for_delivery')}
                      className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
                    >
                      Out for Delivery
                    </button>
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'delivered')}
                      className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                    >
                      Mark Delivered
                    </button>
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'cancelled')}
                      className="py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs transition"
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
