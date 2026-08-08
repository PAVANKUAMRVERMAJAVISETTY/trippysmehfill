import React, { useState } from 'react';
import { Order, UserProfile } from '../../types';
import { exportOrdersToExcel, exportOrdersToPDF } from '../../lib/exportUtils';
import { Search, FileText, Download } from 'lucide-react';

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
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-[#1F2933]" style={{ backgroundColor: '#F5F1E8' }}>
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#252525] font-serif">Order History</h1>
          <p className="text-xs text-[#5F6368]">{filteredOrders.length} of {orders.length} orders</p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportOrdersToPDF(filteredOrders)}
            className="px-4 py-2 bg-[#B8862D] hover:bg-[#A37424] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm border border-[#A37424] transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => exportOrdersToExcel(filteredOrders)}
            className="px-4 py-2 bg-[#198754] hover:bg-[#146C43] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm border border-[#146C43] transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#DDD6C8] shadow-sm text-xs">
        <div className="relative col-span-1 sm:col-span-1">
          <Search className="w-4 h-4 text-[#5F6368] absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, order no"
            className="w-full pl-9 pr-3 py-2 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none text-[#1F2933] placeholder-[#6B6B63] focus:border-[#D95F0A]"
          />
        </div>

        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="p-2 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none font-medium text-[#1F2933] focus:border-[#D95F0A]"
        >
          <option>All time</option>
          <option>Today</option>
          <option>This week</option>
          <option>This month</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none font-medium text-[#1F2933] focus:border-[#D95F0A]"
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
          className="p-2 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none font-medium text-[#1F2933] focus:border-[#D95F0A]"
        >
          <option>All drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.full_name}>{d.full_name}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#DDD6C8] shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#E9E1D0] text-[#2B2418] font-bold border-b border-[#DDD6C8]">
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
          <tbody className="divide-y divide-[#DDD6C8]">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-[#5F6368] italic">
                  No orders match these filters.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[#FFF0D5] transition">
                  <td className="p-3 font-extrabold text-[#D95F0A]">{order.order_number}</td>
                  <td className="p-3 text-[#5F6368] whitespace-nowrap">{order.created_at}</td>
                  <td className="p-3 font-bold text-[#1F2933]">{order.customer_name}</td>
                  <td className="p-3 font-mono text-[#1F2933]">{order.customer_phone}</td>
                  <td className="p-3 text-[#5F6368] max-w-[150px] truncate">{order.delivery_address}</td>
                  <td className="p-3 text-[#1F2933]">
                    {order.items.map((i) => `${i.dish_name} (x${i.quantity})`).join(', ')}
                  </td>
                  <td className="p-3 font-black text-[#1F2933]">₹{order.total_amount}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
                      order.status === 'delivered' ? 'bg-[#D1FAE5] text-[#146C43] border-[#86EFAC]' :
                      order.status === 'cancelled' ? 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]' : 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-3 text-[#1F2933] font-medium">{order.driver_name || '-'}</td>
                  <td className="p-3 text-[#B8862D] font-bold">
                    {order.rating ? `${order.rating.toFixed(1)} ★` : '-'}
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
