import React, { useState } from 'react';
import { UserProfile, Order } from '../../types';
import { Bike, Star, CheckCircle, Clock, ShieldCheck, AlertTriangle, Phone, ExternalLink, RefreshCw, Power } from 'lucide-react';
import { getRouteDirectionsUrl } from '../../lib/geoUtils';

interface DriverStatsViewProps {
  drivers?: UserProfile[];
  orders?: Order[];
  onToggleActive?: (driverId: string) => void;
}

export type DriverStateCategory = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'UNAVAILABLE' | 'PENDING';

export const getDriverStatus = (
  driver: UserProfile,
  activeOrdersForDriver: Order[]
): { category: DriverStateCategory; label: string; badgeClass: string } => {
  if (driver.account_status === 'blocked_fraud') {
    return {
      category: 'UNAVAILABLE',
      label: 'UNAVAILABLE / BLOCKED',
      badgeClass: 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]'
    };
  }

  if (driver.is_approved === false || driver.account_status === 'pending_verification') {
    return {
      category: 'PENDING',
      label: 'PENDING APPROVAL',
      badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]'
    };
  }

  if (!driver.is_active) {
    return {
      category: 'OFFLINE',
      label: 'OFFLINE / INACTIVE',
      badgeClass: 'bg-[#E5E7EB] text-[#4B5563] border-[#D1D5DB]'
    };
  }

  if (activeOrdersForDriver.length > 0) {
    return {
      category: 'BUSY',
      label: `BUSY (${activeOrdersForDriver.length} ON DELIVERY)`,
      badgeClass: 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]'
    };
  }

  return {
    category: 'AVAILABLE',
    label: 'AVAILABLE',
    badgeClass: 'bg-[#D1FAE5] text-[#146C43] border-[#86EFAC]'
  };
};

export const DriverStatsView: React.FC<DriverStatsViewProps> = ({
  drivers = [],
  orders = [],
  onToggleActive
}) => {
  const safeDrivers = Array.isArray(drivers) ? drivers : [];
  const safeOrders = Array.isArray(orders) ? orders : [];

  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    safeDrivers[0]?.id || ''
  );

  const selectedDriver =
    safeDrivers.find((d) => d.id === selectedDriverId) || safeDrivers[0];

  const getDriverOrders = (driver: UserProfile | undefined) => {
    if (!driver) return [];
    return safeOrders.filter(
      (o) => o.driver_id === driver.id || o.driver_name === driver.full_name
    );
  };

  const selectedDriverOrders = getDriverOrders(selectedDriver);
  const selectedCompletedCount = selectedDriverOrders.filter(
    (o) => o.status === 'delivered'
  ).length;

  const selectedActiveOrder = selectedDriverOrders.find(
    (o) => o.status === 'out_for_delivery' || o.status === 'cooking' || o.status === 'assigned'
  );

  return (
    <div
      className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-[#1F2933]"
      style={{ backgroundColor: '#EEF5F7' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#D8D2C5] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#252525] font-serif flex items-center gap-2">
            <Bike className="w-7 h-7 text-[#D96A16]" />
            <span>Delivery Partner Status & Performance</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Real-time delivery partner availability, active delivery tracking, and performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#F8F6F0] px-3.5 py-2 rounded-xl border border-[#AFA797] text-xs font-bold flex items-center gap-2">
            <span className="text-[#5F6368]">Total Partners:</span>
            <span className="text-[#1F2933] font-black text-sm">{safeDrivers.length}</span>
          </div>
        </div>
      </div>

      {/* Graceful Empty State if no drivers exist */}
      {safeDrivers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#D8D2C5] shadow-sm space-y-3">
          <Bike className="w-12 h-12 text-[#5F6368] mx-auto mb-2" />
          <h3 className="text-base font-extrabold text-[#252525]">No Delivery Partners Registered</h3>
          <p className="text-xs text-[#5F6368] max-w-md mx-auto">
            There are currently no users with the <strong>Driver</strong> role registered in your system.
            You can create delivery partner accounts under the <strong>Staff & Drivers</strong> tab.
          </p>
        </div>
      ) : (
        <>
          {/* Driver Overview Table / Cards Matrix */}
          <div className="bg-white rounded-2xl border border-[#D8D2C5] shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-[#D8D2C5] pb-3">
              <h2 className="text-sm font-black text-[#252525] uppercase tracking-wider font-serif">
                Delivery Partner Roster & Live Status Matrix
              </h2>
              <span className="text-xs text-[#5F6368] font-bold">
                {safeDrivers.filter((d) => d.is_active).length} Active Online
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F6F0] text-[#252525] font-bold border-b border-[#D8D2C5]">
                  <tr>
                    <th className="p-3">Partner Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3">Active Order</th>
                    <th className="p-3">Total Delivered</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D2C5]">
                  {safeDrivers.map((d) => {
                    const dOrders = getDriverOrders(d);
                    const activeOrder = dOrders.find(
                      (o) =>
                        o.status === 'out_for_delivery' ||
                        o.status === 'cooking' ||
                        o.status === 'assigned'
                    );
                    const completed = dOrders.filter((o) => o.status === 'delivered').length;
                    const statusInfo = getDriverStatus(d, activeOrder ? [activeOrder] : []);

                    const isSelected = selectedDriver?.id === d.id;

                    return (
                      <tr
                        key={d.id}
                        onClick={() => setSelectedDriverId(d.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-[#F0E7D5]/70 font-medium' : 'hover:bg-[#F8F6F0]'
                        }`}
                      >
                        <td className="p-3 font-extrabold text-[#1F2933]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#B8862D]" />
                            <span>{d.full_name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[#5F6368]">{d.phone || 'N/A'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1 ${statusInfo.badgeClass}`}
                          >
                            <span>{statusInfo.label}</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[#1F2933]">
                          {activeOrder ? (
                            <span className="text-[#D96A16] font-bold flex items-center gap-1">
                              <span>🛵 #{activeOrder.order_number}</span>
                              <span className="text-[10px] text-[#5F6368]">({activeOrder.status})</span>
                            </span>
                          ) : (
                            <span className="text-[#747474] italic">None (Ready)</span>
                          )}
                        </td>
                        <td className="p-3 font-black text-[#1F2933]">{completed}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onToggleActive && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleActive(d.id);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                  d.is_active
                                    ? 'bg-[#198754] text-white border-[#146C43] hover:bg-[#146C43]'
                                    : 'bg-[#FFFFFF] text-[#252525] border-[#9D9587] hover:bg-[#F0E7D5]'
                                }`}
                                title="Toggle Active/Inactive"
                              >
                                <Power className="w-3 h-3" />
                                <span>{d.is_active ? 'Set Offline' : 'Set Active'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDriverId(d.id);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#B8862D] text-white border-[#8F691F]'
                                  : 'bg-white text-[#252525] border-[#9D9587] hover:bg-[#F0E7D5]'
                              }`}
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Driver Detailed Metrics & Active Order Card */}
          {selectedDriver && (
            <div className="space-y-6">
              {/* Partner Dropdown Selector */}
              <div className="bg-white p-4 rounded-2xl border border-[#D8D2C5] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#252525] mb-1">
                    Inspecting Partner Details:
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="p-2.5 bg-white border border-[#AFA797] rounded-xl text-xs font-bold text-[#1F2933] outline-none focus:border-[#D96A16] focus:ring-1 focus:ring-[#D96A16] cursor-pointer min-w-[260px]"
                  >
                    {safeDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.phone || d.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  {(() => {
                    const st = getDriverStatus(
                      selectedDriver,
                      selectedActiveOrder ? [selectedActiveOrder] : []
                    );
                    return (
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-black uppercase border flex items-center gap-1.5 ${st.badgeClass}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        <span>{st.label}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Driver Stats KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-[#D8D2C5] shadow-sm">
                  <p className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                    Completed Deliveries
                  </p>
                  <p className="text-2xl font-black text-[#1F2933] mt-1">
                    {selectedCompletedCount}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#D8D2C5] shadow-sm">
                  <p className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                    Average Customer Rating
                  </p>
                  <p className="text-2xl font-black text-[#B8862D] mt-1">5.0 ★</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#D8D2C5] shadow-sm">
                  <p className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                    On-Time Delivery %
                  </p>
                  <p className="text-2xl font-black text-[#198754] mt-1">98%</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#D8D2C5] shadow-sm">
                  <p className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                    Account Status
                  </p>
                  <p className="text-sm font-black text-[#1F2933] mt-2 uppercase">
                    {selectedDriver.is_active ? (
                      <span className="text-[#198754]">● Active Online</span>
                    ) : (
                      <span className="text-[#747474]">○ Offline</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Active Order in Progress Card if Busy */}
              {selectedActiveOrder && (
                <div className="bg-white p-5 rounded-2xl border-2 border-[#E8C66A] shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-[#D8D2C5] pb-2">
                    <h3 className="font-extrabold text-sm text-[#252525] flex items-center gap-2">
                      <Bike className="w-4 h-4 text-[#D96A16]" />
                      <span>Current Active Delivery in Progress</span>
                    </h3>
                    <span className="px-2.5 py-0.5 bg-[#FFF0CC] text-[#8A5A00] border border-[#E8C66A] font-extrabold text-xs rounded-full uppercase">
                      {selectedActiveOrder.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[#5F6368] block">Order Number:</span>
                      <strong className="text-[#D96A16] font-mono text-sm">
                        {selectedActiveOrder.order_number}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#5F6368] block">Customer Name:</span>
                      <strong className="text-[#1F2933]">
                        {selectedActiveOrder.customer_name} ({selectedActiveOrder.customer_phone})
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#5F6368] block">Delivery Address:</span>
                      <strong className="text-[#1F2933]">
                        {selectedActiveOrder.delivery_address}
                      </strong>
                    </div>
                  </div>

                  {selectedActiveOrder.order_latitude && selectedActiveOrder.order_longitude && (
                    <div className="pt-2 flex justify-end">
                      <a
                        href={getRouteDirectionsUrl(
                          selectedActiveOrder.order_latitude,
                          selectedActiveOrder.order_longitude
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-[#D96A16] hover:bg-[#B8530B] text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm border border-[#B8530B]"
                      >
                        <span>🗺️ Route from GLS</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Driver Order History List */}
              <div className="bg-white rounded-2xl p-5 border border-[#D8D2C5] shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-[#252525]">
                  Order History for {selectedDriver.full_name} ({selectedDriverOrders.length})
                </h3>

                {selectedDriverOrders.length === 0 ? (
                  <p className="text-xs text-[#5F6368] italic p-4 bg-[#F8F6F0] rounded-xl border border-[#D8D2C5]">
                    No orders completed or assigned yet for this delivery partner.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDriverOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-3 bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl text-xs flex justify-between items-center font-medium text-[#1F2933]"
                      >
                        <div>
                          <span className="font-extrabold text-[#D96A16] mr-2">
                            {o.order_number}
                          </span>
                          <span>
                            {o.customer_name} ({o.delivery_address})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[#5F6368]">₹{o.total_amount}</span>
                          <span
                            className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] border ${
                              o.status === 'delivered'
                                ? 'bg-[#D1FAE5] text-[#146C43] border-[#86EFAC]'
                                : o.status === 'cancelled'
                                ? 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]'
                                : 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]'
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

