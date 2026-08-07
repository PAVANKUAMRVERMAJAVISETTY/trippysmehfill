import React, { useState } from 'react';
import { Order, UserProfile } from '../../types';
import { exportOrdersToExcel, exportOrdersToPDF } from '../../lib/exportUtils';
import { Search, FileText, Download } from 'lucide-react';
import { formatCurrency, formatRating } from '../../lib/format';
import { orderStatusBadgeClass } from '../../lib/orderStatus';

interface OrderHistoryViewProps {
  orders: Order[];
  drivers: UserProfile[];
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({ orders, drivers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('All time');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [driverFilter, setDriverFilter] = useState('All drivers');

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_phone.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'All statuses' || o.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesDriver =
      driverFilter === 'All drivers' || o.driver_name === driverFilter;

    return matchesSearch && matchesStatus && matchesDriver;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-serif">Order History</h1>
          <p className="text-xs text-gray-500">{filteredOrders.length} of {orders.length} orders</p>
        </div>

        {/* Export Buttons matching video frame 1:31 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportOrdersToPDF(filteredOrders)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => exportOrdersToExcel(filteredOrders)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filters Bar matching video frame 1:31 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-xs">
        <div className="relative col-span-1 sm:col-span-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, order no"
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          />
        </div>

        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium"
        >
          <option>All time</option>
          <option>Today</option>
          <option>This week</option>
          <option>This month</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium"
        >
          <option>All statuses</option>
          <option>Pending</option>
          <option>Cooking</option>
          <option>Out for Delivery</option>
          <option>Delivered</option>
          <option>Cancelled</option>
        </select>

        <select
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          className="p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium"
        >
          <option>All drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.full_name}>{d.full_name}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-amber-50/60 text-amber-950 font-bold border-b border-amber-100">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Driver</th>
              <th className="p-3">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-400 italic">
                  No orders match these filters.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/80 transition">
                  <td className="p-3 font-extrabold text-orange-600">{order.order_number}</td>
                  <td className="p-3 text-gray-500 whitespace-nowrap">{order.created_at}</td>
                  <td className="p-3 font-bold text-gray-900">{order.customer_name}</td>
                  <td className="p-3 font-mono text-gray-700">{order.customer_phone}</td>
                  <td className="p-3 text-gray-600 max-w-[150px] truncate">{order.delivery_address}</td>
                  <td className="p-3 text-gray-700">
                    {order.items.map((i) => `${i.dish_name} (x${i.quantity})`).join(', ')}
                  </td>
                  <td className="p-3 font-black text-gray-900">{formatCurrency(order.total_amount)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${orderStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700 font-medium">{order.driver_name || '-'}</td>
                  <td className="p-3 text-amber-500 font-bold">
                    {order.rating ? `${formatRating(order.rating)} ★` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
