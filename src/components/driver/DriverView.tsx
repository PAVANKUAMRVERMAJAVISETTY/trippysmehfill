import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Bike, MapPin, Phone, CheckCircle2, Navigation, Clock } from 'lucide-react';

interface DriverViewProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

export const DriverView: React.FC<DriverViewProps> = ({ orders, onUpdateOrderStatus }) => {
  const { user } = useAuth();
  const [navigatingOrderId, setNavigatingOrderId] = useState<string | null>(null);

  /**
   * Is this order assigned to the signed-in driver?
   *
   * Matched on `driver_id` first. The list previously included every order with
   * status 'assigned' or 'out_for_delivery' regardless of who it belonged to,
   * so every driver saw every other driver's deliveries -- including the
   * customer's name, phone number and home address.
   *
   * The `driver_name` comparison is kept only as a fallback for rows that were
   * assigned before `driver_id` was populated. It is a weaker check: two drivers
   * sharing a name would match each other. Once no such rows remain it should
   * be removed.
   */
  const isAssignedToMe = (order: Order): boolean => {
    if (!user) return false;
    if (order.driver_id) return order.driver_id === user.id;
    return Boolean(order.driver_name) && order.driver_name === user.full_name;
  };

  const assignedOrders = orders.filter(
    o => isAssignedToMe(o) && o.status !== 'delivered' && o.status !== 'cancelled'
  );

  const completedOrders = orders.filter(
    o => isAssignedToMe(o) && o.status === 'delivered'
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 text-gray-200">
      
      {/* Driver Header */}
      <div className="bg-[#121212] border border-white/10 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/20 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-serif">{user?.full_name || 'Delivery Partner'}</h1>
            <p className="text-xs text-gray-400">Phone: {user?.phone || '6301050250'} • <span className="text-emerald-400 font-semibold">Active & Online</span></p>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-black text-[#C5A059]">{completedOrders.length}</span>
          <span className="text-[10px] text-gray-400 uppercase font-bold">Delivered Today</span>
        </div>
      </div>

      {/* Active Orders */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-white font-serif tracking-wide">
          Assigned Deliveries ({assignedOrders.length})
        </h2>

        {assignedOrders.length === 0 ? (
          <div className="bg-[#121212] rounded-2xl p-8 text-center border border-white/10 shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-white font-bold">No active deliveries pending.</p>
            <p className="text-xs text-gray-400 mt-1">New orders assigned by dispatch will show up here immediately.</p>
          </div>
        ) : (
          assignedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[#121212] rounded-2xl p-5 border border-white/10 hover:border-[#C5A059]/40 shadow-xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <span className="text-lg font-black text-[#C5A059]">{order.order_number}</span>
                  <span className="text-xs text-gray-400 font-mono ml-2">{order.created_at}</span>
                </div>
                <span className="px-3 py-1 bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] font-extrabold text-xs rounded-full uppercase">
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-white">
                  <span className="text-sm">{order.customer_name}</span>
                  <a href={`tel:${order.customer_phone}`} className="px-3 py-1 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl flex items-center gap-1 text-xs shadow-sm">
                    <Phone className="w-3.5 h-3.5" /> Call Customer
                  </a>
                </div>

                <div className="flex items-start gap-1.5 text-gray-300 bg-[#181818] p-2.5 rounded-xl border border-white/10">
                  <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">{order.delivery_address}</p>
                    {order.landmark && <p className="text-gray-400 text-[11px] italic">Note: {order.landmark}</p>}
                  </div>
                </div>

                <div className="bg-[#181818] p-3 rounded-xl border border-[#C5A059]/30 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#C5A059]">Collect Payment ({order.payment_method})</p>
                    <p className="text-[11px] text-gray-400">
                      {order.payment_method === 'COD' ? 'Collect cash on doorstep' : 'Already paid via UPI'}
                    </p>
                  </div>
                  <span className="text-lg font-black text-white">₹{order.total_amount}</span>
                </div>
              </div>

              {/* Navigation GPS simulation bar */}
              {navigatingOrderId === order.id && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <Navigation className="w-4 h-4 text-blue-400" />
                    <span>Navigation</span>
                  </div>
                  {/* Previously hardcoded "1.2 km • 5 mins to Campus Hostel" and
                      showed it for every order regardless of destination, under
                      a heading claiming live GPS was active. Nothing here reads
                      the device's location. Show the stored distance when the
                      order actually has one, and otherwise claim nothing. */}
                  {typeof order.distance_km === 'number' ? (
                    <p className="text-[11px] text-blue-300/80">
                      Approximately {order.distance_km.toFixed(1)} km to the delivery address.
                    </p>
                  ) : (
                    <p className="text-[11px] text-blue-300/80">
                      Use the address above with your preferred maps app.
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setNavigatingOrderId(navigatingOrderId === order.id ? null : order.id)}
                  className="py-2.5 bg-[#181818] border border-white/10 hover:bg-white/5 text-gray-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <Navigation className="w-4 h-4 text-blue-400" />
                  {/* "Start GPS" promised live tracking this does not do -- no
                      geolocation is read and nothing is transmitted. It only
                      expands the address panel, so the label now says that. */}
                  <span>{navigatingOrderId === order.id ? 'Hide Directions' : 'Directions'}</span>
                </button>

                <button
                  onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                  className="py-2.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Delivered</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
