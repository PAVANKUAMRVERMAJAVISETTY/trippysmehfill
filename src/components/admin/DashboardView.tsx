import React, { useState, useMemo } from 'react';
import { Order, Feedback, UserProfile, InventoryItem } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import {
  DollarSign,
  Clock,
  TrendingUp,
  BarChart3,
  Calendar,
  Flame,
  ChefHat,
  PackageCheck,
  Bike,
  Users,
  Eye,
  Award,
  AlertTriangle,
  Activity
} from 'lucide-react';

import { usePresence } from '../../context/PresenceContext';

interface DashboardViewProps {
  orders?: Order[];
  feedback?: Feedback[];
  drivers?: UserProfile[];
  inventory?: InventoryItem[];
}

interface DailyData {
  dateKey: string;
  displayDate: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenue: number;
}

function parseOrderDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const parts = dateStr.split(',');
  if (parts[0]) {
    const dateParts = parts[0].trim().split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders = [],
  feedback = [],
  drivers = [],
  inventory = []
}) => {
  const { liveCount, setIsLiveModalOpen } = usePresence();
  const [chartMetric, setChartMetric] = useState<'orders' | 'revenue'>('orders');

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeFeedback = Array.isArray(feedback) ? feedback : [];
  const safeDrivers = Array.isArray(drivers) ? drivers : [];
  const safeInventory = Array.isArray(inventory) ? inventory : [];

  // Order Counts by Status
  const pendingCount = safeOrders.filter((o) => o.status === 'pending').length;
  const cookingCount = safeOrders.filter((o) => o.status === 'cooking').length;
  const packedCount = safeOrders.filter((o) => o.status === 'ready').length;
  const deliveringCount = safeOrders.filter(
    (o) => o.status === 'assigned' || o.status === 'out_for_delivery'
  ).length;

  // Drivers Online Metrics
  const onlineDrivers = safeDrivers.filter((d) => d.is_active);
  const deliveringDriversCount = onlineDrivers.filter((d) =>
    safeOrders.some(
      (o) =>
        (o.driver_id === d.id || o.driver_name === d.full_name) &&
        (o.status === 'out_for_delivery' || o.status === 'cooking' || o.status === 'assigned')
    )
  ).length;
  const idleDriversCount = Math.max(0, onlineDrivers.length - deliveringDriversCount);

  // Today's Key & Aggregations
  const todayDateObj = new Date();
  const todayKey = `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}-${String(todayDateObj.getDate()).padStart(2, '0')}`;

  const todayOrders = safeOrders.filter((o) => {
    const d = parseOrderDate(o.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return k === todayKey;
  });

  const todayDeliveredOrders = todayOrders.filter((o) => o.status === 'delivered');
  const todayRevenue = todayDeliveredOrders.reduce((sum, o) => sum + o.total_amount, 0);

  // Weekly Revenue (Last 7 Days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(todayDateObj.getDate() - 7);
  const weeklyDeliveredOrders = safeOrders.filter(
    (o) => o.status === 'delivered' && parseOrderDate(o.created_at) >= sevenDaysAgo
  );
  const weeklyRevenue = weeklyDeliveredOrders.reduce((sum, o) => sum + o.total_amount, 0);

  // Monthly Revenue (Month to Date)
  const monthStart = new Date(todayDateObj.getFullYear(), todayDateObj.getMonth(), 1);
  const monthlyDeliveredOrders = safeOrders.filter(
    (o) => o.status === 'delivered' && parseOrderDate(o.created_at) >= monthStart
  );
  const monthlyRevenue = monthlyDeliveredOrders.reduce((sum, o) => sum + o.total_amount, 0);

  // Top Customer Calculation
  const customerSpend = new Map<string, { spent: number; orders: number }>();
  safeOrders
    .filter((o) => o.status === 'delivered' && o.customer_name)
    .forEach((o) => {
      const prev = customerSpend.get(o.customer_name) || { spent: 0, orders: 0 };
      customerSpend.set(o.customer_name, {
        spent: prev.spent + o.total_amount,
        orders: prev.orders + 1
      });
    });
  const topCustomerEntry = [...customerSpend.entries()].sort((a, b) => b[1].spent - a[1].spent)[0];

  // Top Selling Dish Calculation
  const dishCounts: { [name: string]: number } = {};
  safeOrders.forEach((o) => {
    o.items?.forEach((i) => {
      const dName = i.dish_name || (i as any).menuItem?.name || 'Special Dish';
      dishCounts[dName] = (dishCounts[dName] || 0) + i.quantity;
    });
  });
  let topDish = '';
  let topDishCount = 0;
  Object.entries(dishCounts).forEach(([name, count]) => {
    if (count > topDishCount) {
      topDishCount = count;
      topDish = name;
    }
  });

  // Low Stock Items Count
  const lowStockItems = safeInventory.filter((i) => i.quantity <= i.low_alert_threshold);

  // Compute Daily Aggregations for Chart
  const chartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const daysMap = new Map<string, DailyData>();

    safeOrders.forEach((order) => {
      const dateObj = parseOrderDate(order.created_at);
      const year = dateObj.getFullYear();
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dateObj.getDate()).padStart(2, '0');

      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const displayDate = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;

      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, {
          dateKey,
          displayDate,
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          revenue: 0
        });
      }

      const current = daysMap.get(dateKey)!;
      current.totalOrders += 1;
      if (order.status === 'delivered') {
        current.deliveredOrders += 1;
        current.revenue += order.total_amount;
      } else if (order.status === 'cancelled') {
        current.cancelledOrders += 1;
      }
    });

    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const year = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, {
          dateKey,
          displayDate: `${d.getDate()} ${monthNames[d.getMonth()]}`,
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          revenue: 0
        });
      }
    }

    return Array.from(daysMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [safeOrders]);

  return (
    <div
      className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-[#1F2933]"
      style={{ backgroundColor: '#F5F1E8' }}
    >
      {/* Title & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D2C5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#B8862D]" />
            <h1 className="text-2xl font-black text-[#252525] font-serif tracking-wide">
              Live ERP Admin Control Center
            </h1>
          </div>
          <p className="text-xs text-[#5F6368]">
            Real-time kitchen queue, driver operations, revenue analytics & inventory status.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#D8D2C5] px-3.5 py-2 rounded-xl text-xs font-mono text-[#B8862D] shadow-sm">
          <Calendar className="w-4 h-4 text-[#B8862D]" />
          <span>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* LIVE OPERATIONAL QUEUE WIDGETS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Pending Orders - Gold Border */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8C66A] space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#8A5A00] uppercase tracking-wider">
              PENDING ORDERS
            </span>
            <Clock className="w-4 h-4 text-[#8A5A00]" />
          </div>
          <p className="text-2xl font-black text-[#17212B]">{pendingCount}</p>
          <p className="text-[9px] text-[#5F6368]">Awaiting kitchen accept</p>
        </div>

        {/* Kitchen Queue - Saffron Border */}
        <div className="bg-white p-4 rounded-2xl border border-[#D96A16]/50 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#D96A16] uppercase tracking-wider">
              KITCHEN QUEUE
            </span>
            <ChefHat className="w-4 h-4 text-[#D96A16]" />
          </div>
          <p className="text-2xl font-black text-[#17212B]">{cookingCount}</p>
          <p className="text-[9px] text-[#5F6368]">Dishes currently cooking</p>
        </div>

        {/* Packed Orders - Blue Border */}
        <div className="bg-white p-4 rounded-2xl border border-[#2878B5]/50 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#2878B5] uppercase tracking-wider">
              PACKED ORDERS
            </span>
            <PackageCheck className="w-4 h-4 text-[#2878B5]" />
          </div>
          <p className="text-2xl font-black text-[#17212B]">{packedCount}</p>
          <p className="text-[9px] text-[#5F6368]">Ready for pickup runner</p>
        </div>

        {/* Delivering - Green Border */}
        <div className="bg-white p-4 rounded-2xl border border-[#198754]/50 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#198754] uppercase tracking-wider">
              DELIVERING
            </span>
            <Bike className="w-4 h-4 text-[#198754]" />
          </div>
          <p className="text-2xl font-black text-[#17212B]">{deliveringCount}</p>
          <p className="text-[9px] text-[#5F6368]">Drivers on delivery run</p>
        </div>

        {/* Drivers Online - Gold/Amber Border */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8C66A] space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#B8862D] uppercase tracking-wider">
              DRIVERS ONLINE
            </span>
            <Users className="w-4 h-4 text-[#B8862D]" />
          </div>
          <p className="text-2xl font-black text-[#17212B]">{onlineDrivers.length} Online</p>
          <p className="text-[9px] text-[#5F6368]">
            {safeDrivers.length === 0
              ? 'No drivers currently online'
              : `${deliveringDriversCount} Delivering • ${idleDriversCount} Idle`}
          </p>
        </div>

        {/* Live Visitors / Customers Online - Blue Border */}
        <button
          onClick={() => setIsLiveModalOpen(true)}
          className="bg-white p-4 rounded-2xl border border-[#2878B5]/50 space-y-1 shadow-sm text-left hover:border-[#2878B5] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#2878B5] uppercase tracking-wider">
              LIVE VISITORS
            </span>
            <Eye className="w-4 h-4 text-[#2878B5]" />
          </div>
          <p className="text-2xl font-black text-[#17212B] flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#198754] animate-pulse" />
            <span>{liveCount} Active</span>
          </p>
          <p className="text-[9px] text-[#5F6368]">
            {liveCount} {liveCount === 1 ? 'Customer' : 'Customers'} • 0 Guests
          </p>
        </button>
      </div>

      {/* REVENUE & PROFIT SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8C66A] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#8A5A00] uppercase tracking-wider">
              TODAY'S REVENUE
            </p>
            <DollarSign className="w-4 h-4 text-[#B8862D]" />
          </div>
          <p className="text-2xl font-black text-[#17212B] mt-1">₹{todayRevenue}</p>
          <p className="text-[10px] text-[#5F6368] font-medium mt-1">
            Today's delivered orders: {todayDeliveredOrders.length}
          </p>
        </div>

        {/* Today's Net Profit */}
        <div className="bg-white rounded-2xl p-4 border border-[#198754]/40 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#198754] uppercase tracking-wider">
              TODAY'S NET PROFIT
            </p>
            <TrendingUp className="w-4 h-4 text-[#198754]" />
          </div>
          <p className="text-lg font-extrabold text-[#5F6368] mt-1">Cost data N/A</p>
          <p className="text-[10px] text-[#5F6368] font-medium mt-1">Cost data unavailable</p>
        </div>

        {/* Weekly Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-[#E8C66A] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#8A5A00] uppercase tracking-wider">
              WEEKLY REVENUE
            </p>
            <BarChart3 className="w-4 h-4 text-[#B8862D]" />
          </div>
          <p className="text-2xl font-black text-[#B8862D] mt-1">₹{weeklyRevenue}</p>
          <p className="text-[10px] text-[#5F6368] font-medium mt-1">
            Total {weeklyDeliveredOrders.length} order
            {weeklyDeliveredOrders.length === 1 ? '' : 's'} completed
          </p>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-[#2878B5]/40 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#2878B5] uppercase tracking-wider">
              MONTHLY REVENUE
            </p>
            <Award className="w-4 h-4 text-[#2878B5]" />
          </div>
          <p className="text-2xl font-black text-[#17212B] mt-1">₹{monthlyRevenue}</p>
          <p className="text-[10px] text-[#2878B5] font-bold mt-1">
            Delivered orders, month to date
          </p>
        </div>
      </div>

      {/* TOP SELLING, INVENTORY & TOP CUSTOMER WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Selling Dish */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8C66A] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#FFF0CC] border border-[#E8C66A] rounded-2xl text-[#8A5A00]">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#B8862D]">
              TOP SELLING DISH
            </span>
            <h4 className="font-extrabold text-[#17212B] text-sm font-serif line-clamp-1">
              {topDish || 'No orders yet'}
            </h4>
            <p className="text-[11px] text-[#5F6368] font-mono">
              {topDishCount > 0 ? `${topDishCount} sold` : 'Awaiting the first order'}
            </p>
          </div>
        </div>

        {/* Inventory Card */}
        <div
          className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3 ${
            lowStockItems.length > 0 ? 'border-[#F5A6A1]' : 'border-[#D8D2C5]'
          }`}
        >
          <div
            className={`p-3 rounded-2xl border ${
              lowStockItems.length > 0
                ? 'bg-[#FDE2E1] border-[#F5A6A1] text-[#922B21]'
                : 'bg-[#F8F6F0] border-[#D8D2C5] text-[#5F6368]'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span
              className={`text-[10px] font-black uppercase ${
                lowStockItems.length > 0 ? 'text-[#922B21]' : 'text-[#5F6368]'
              }`}
            >
              INVENTORY
            </span>
            <h4 className="font-extrabold text-[#17212B] text-sm">
              {lowStockItems.length > 0
                ? `${lowStockItems.length} Low Stock Alert${lowStockItems.length > 1 ? 's' : ''}`
                : 'Check the Inventory tab'}
            </h4>
            <p className="text-[11px] text-[#5F6368]">Live stock levels and low-stock alerts</p>
          </div>
        </div>

        {/* Top Customer */}
        <div className="bg-white p-4 rounded-2xl border border-[#2878B5]/40 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#E8F1FA] border border-[#2878B5]/40 rounded-2xl text-[#2878B5]">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#2878B5]">TOP CUSTOMER</span>
            <h4 className="font-extrabold text-[#17212B] text-sm">
              {topCustomerEntry ? topCustomerEntry[0] : 'No orders yet'}
            </h4>
            <p className="text-[11px] text-[#5F6368] font-mono">
              {topCustomerEntry
                ? `₹${topCustomerEntry[1].spent} spent • ${topCustomerEntry[1].orders} order${
                    topCustomerEntry[1].orders === 1 ? '' : 's'
                  }`
                : 'Awaiting the first delivered order'}
            </p>
          </div>
        </div>
      </div>

      {/* VISUAL ORDER PERFORMANCE CHART (RECHARTS) */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8D2C5] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8D2C5] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl text-[#B8862D]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#252525] font-serif tracking-tight">
                Order Performance per Day
              </h2>
              <p className="text-xs text-[#5F6368]">
                Daily breakdown of kitchen volume and revenue trend
              </p>
            </div>
          </div>

          <div className="flex items-center p-1 bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setChartMetric('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                chartMetric === 'orders'
                  ? 'bg-[#B8862D] text-white shadow-sm'
                  : 'text-[#5F6368] hover:text-[#17212B]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Orders / Day</span>
            </button>
            <button
              onClick={() => setChartMetric('revenue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                chartMetric === 'revenue'
                  ? 'bg-[#B8862D] text-white shadow-sm'
                  : 'text-[#5F6368] hover:text-[#17212B]'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Revenue (₹)</span>
            </button>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'orders' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D2C5" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: '#5F6368', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#D8D2C5' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#5F6368', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#D8D2C5' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#D8D2C5',
                    borderRadius: '12px',
                    color: '#17212B',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                  }}
                  formatter={(value: any) => [`${value} orders`, 'Volume']}
                  labelStyle={{ color: '#B8862D', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar dataKey="totalOrders" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.totalOrders > 0 ? '#D96A16' : '#D8D2C5'}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#198754" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#198754" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D2C5" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: '#5F6368', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#D8D2C5' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#5F6368', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#D8D2C5' }}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#D8D2C5',
                    borderRadius: '12px',
                    color: '#17212B',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                  }}
                  formatter={(value: any) => [`₹${value}`, 'Revenue']}
                  labelStyle={{ color: '#198754', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#198754"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latest Orders & Customer Feedback Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Latest Orders */}
        <div className="bg-white rounded-2xl p-5 border border-[#D8D2C5] shadow-sm">
          <h2 className="font-bold text-base text-[#252525] mb-3 font-serif">
            Latest Orders Live Feed
          </h2>
          <div className="space-y-3">
            {safeOrders.length === 0 ? (
              <p className="text-xs text-[#5F6368] italic p-4 bg-[#F8F6F0] rounded-xl border border-[#D8D2C5]">
                No orders placed yet.
              </p>
            ) : (
              safeOrders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-[#F8F6F0] rounded-xl border border-[#D8D2C5] text-xs"
                >
                  <div>
                    <span className="font-extrabold text-[#D96A16] mr-2">
                      #{order.order_number}
                    </span>
                    <span className="text-[#17212B] font-semibold">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#17212B]">₹{order.total_amount}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
                        order.status === 'delivered'
                          ? 'bg-[#D1FAE5] text-[#146C43] border-[#86EFAC]'
                          : order.status === 'cancelled'
                          ? 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]'
                          : 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Feedback Ratings */}
        <div className="bg-white rounded-2xl p-5 border border-[#D8D2C5] shadow-sm">
          <h2 className="font-bold text-base text-[#252525] mb-3 font-serif">
            Customer Feedback & Ratings
          </h2>
          <div className="space-y-3">
            {safeFeedback.length === 0 ? (
              <p className="text-xs text-[#5F6368] italic p-4 bg-[#F8F6F0] rounded-xl border border-[#D8D2C5]">
                No customer feedback recorded yet.
              </p>
            ) : (
              safeFeedback.slice(0, 4).map((fb) => (
                <div
                  key={fb.id}
                  className="p-3 bg-[#F8F6F0] rounded-xl border border-[#D8D2C5] text-xs space-y-1"
                >
                  <div className="flex justify-between font-bold text-[#17212B]">
                    <span>
                      Order #{fb.order_id} - {fb.customer_name}
                    </span>
                    <div className="flex text-[#B8862D]">{'★'.repeat(fb.food_rating)}</div>
                  </div>
                  {fb.comment && <p className="text-[#5F6368] text-[11px]">"{fb.comment}"</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

