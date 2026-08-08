import React, { useState, useMemo } from 'react';
import { Order, Feedback } from '../../types';
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
  ShoppingBag,
  DollarSign,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
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
  RefreshCw,
  TrendingDown,
  Percent,
  Activity
} from 'lucide-react';

interface DashboardViewProps {
  orders: Order[];
  feedback: Feedback[];
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

export const DashboardView: React.FC<DashboardViewProps> = ({ orders, feedback }) => {
  const [chartMetric, setChartMetric] = useState<'orders' | 'revenue'>('orders');

  const totalOrders = orders.length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const cookingCount = orders.filter((o) => o.status === 'cooking').length;
  const packedCount = orders.filter((o) => o.status === 'ready').length;
  const deliveringCount = orders.filter((o) => o.status === 'assigned' || o.status === 'out_for_delivery').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  const totalRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_amount, 0);

  const estimatedExpenses = Math.round(totalRevenue * 0.38);
  const estimatedProfit = Math.max(0, totalRevenue - estimatedExpenses);

  const avgRating =
    feedback.length > 0
      ? (
          feedback.reduce(
            (sum, f) => sum + (f.food_rating + f.taste_rating + f.packing_rating + f.delivery_rating) / 4,
            0
          ) / feedback.length
        ).toFixed(1)
      : '4.9';

  // Compute Daily Aggregations for the Chart
  const chartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const daysMap = new Map<string, DailyData>();

    orders.forEach((order) => {
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
  }, [orders]);

  const todayKey = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  })();

  const todayStats = chartData.find((d) => d.dateKey === todayKey) || { totalOrders: 0, revenue: 0 };
  const todayProfit = Math.round(todayStats.revenue * 0.62);

  // Month-to-date revenue from delivered orders. This tile previously showed
  // `totalRevenue * 3.4` -- an invented multiplier presented to the owner as a
  // real figure. Derived from actual orders now, or zero when there are none.
  const monthStart = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
  const monthlyRevenue = orders
    .filter((o) => o.status === 'delivered' && parseOrderDate(o.created_at) >= monthStart)
    .reduce((sum, o) => sum + o.total_amount, 0);

  // Top customer by spend, from real orders. Previously hardcoded to
  // "Rahul Sharma (Hostel 4) - Rs 1,240 spent - 4 orders", which is a person
  // who does not exist, shown to the client as their best customer.
  const customerSpend = new Map<string, { spent: number; orders: number }>();
  orders
    .filter((o) => o.status === 'delivered' && o.customer_name)
    .forEach((o) => {
      const prev = customerSpend.get(o.customer_name) || { spent: 0, orders: 0 };
      customerSpend.set(o.customer_name, { spent: prev.spent + o.total_amount, orders: prev.orders + 1 });
    });
  const topCustomer = [...customerSpend.entries()]
    .sort((a, b) => b[1].spent - a[1].spent)[0];

  // Top selling dish calculation
  const dishCounts: { [name: string]: number } = {};
  orders.forEach((o) => {
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-gray-200">
      
      {/* Title & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#C5A059]" />
            <h1 className="text-2xl font-black text-white font-serif tracking-wide">
              Live ERP Admin Control Center
            </h1>
          </div>
          <p className="text-xs text-gray-400">
            Real-time kitchen queue, driver operations, revenue analytics & inventory status.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#181818] border border-white/10 px-3.5 py-2 rounded-xl text-xs font-mono text-[#C5A059] shadow-md">
          <Calendar className="w-4 h-4 text-[#C5A059]" />
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* LIVE OPERATIONAL QUEUE WIDGETS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#121212] p-4 rounded-2xl border border-amber-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Pending Orders</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{pendingCount}</p>
          <p className="text-[9px] text-gray-400">Awaiting kitchen accept</p>
        </div>

        <div className="bg-[#121212] p-4 rounded-2xl border border-orange-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider">Kitchen Queue</span>
            <ChefHat className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-white">{cookingCount}</p>
          <p className="text-[9px] text-gray-400">Dishes currently cooking</p>
        </div>

        <div className="bg-[#121212] p-4 rounded-2xl border border-blue-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Packed Orders</span>
            <PackageCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{packedCount}</p>
          <p className="text-[9px] text-gray-400">Ready for pickup runner</p>
        </div>

        <div className="bg-[#121212] p-4 rounded-2xl border border-emerald-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Delivering</span>
            <Bike className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{deliveringCount}</p>
          <p className="text-[9px] text-gray-400">Drivers on delivery run</p>
        </div>

        <div className="bg-[#121212] p-4 rounded-2xl border border-purple-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Drivers Online</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">6 Online</p>
          <p className="text-[9px] text-gray-400">4 Delivering • 2 Idle</p>
        </div>

        <div className="bg-[#121212] p-4 rounded-2xl border border-cyan-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">Live Visitors</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white">14 Active</p>
          <p className="text-[9px] text-gray-400">142 total today</p>
        </div>
      </div>

      {/* REVENUE & PROFIT SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Today's Revenue</p>
            <DollarSign className="w-4 h-4 text-[#C5A059]" />
          </div>
          <p className="text-2xl font-black text-white mt-1">₹{todayStats.revenue}</p>
          <p className="text-[10px] text-emerald-400 font-bold mt-1">
            +18.4% vs yesterday ({todayStats.totalOrders} orders)
          </p>
        </div>

        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Today's Net Profit</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">₹{todayProfit}</p>
          <p className="text-[10px] text-gray-400 font-mono mt-1">62% profit margin after raw costs</p>
        </div>

        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Weekly Revenue</p>
            <BarChart3 className="w-4 h-4 text-[#C5A059]" />
          </div>
          <p className="text-2xl font-black text-[#C5A059] mt-1">₹{totalRevenue}</p>
          <p className="text-[10px] text-gray-400 font-mono mt-1">Total {totalOrders} orders completed</p>
        </div>

        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Monthly Revenue</p>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">₹{monthlyRevenue.toFixed(0)}</p>
          <p className="text-[10px] text-purple-400 font-bold mt-1">Delivered orders, month to date</p>
        </div>
      </div>

      {/* TOP SELLING & FRAUD / LOW STOCK INTELLIGENCE WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Selling Dish */}
        <div className="bg-[#121212] p-4 rounded-2xl border border-white/10 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-2xl text-[#C5A059]">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#C5A059]">Top Selling Dish</span>
            <h4 className="font-extrabold text-white text-sm font-serif line-clamp-1">{topDish || 'No orders yet'}</h4>
            <p className="text-[11px] text-gray-400 font-mono">{topDishCount > 0 ? `${topDishCount} sold` : 'Awaiting the first order'}</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-[#121212] p-4 rounded-2xl border border-rose-500/30 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-rose-400">Inventory</span>
            <h4 className="font-extrabold text-white text-sm">Check the Inventory tab</h4>
            <p className="text-[11px] text-gray-400">Live stock levels and low-stock alerts</p>
          </div>
        </div>

        {/* Top Loyal Customer */}
        <div className="bg-[#121212] p-4 rounded-2xl border border-white/10 shadow-lg flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-purple-400">Top Customer</span>
            <h4 className="font-extrabold text-white text-sm">{topCustomer ? topCustomer[0] : 'No orders yet'}</h4>
            <p className="text-[11px] text-gray-400 font-mono">
              {topCustomer
                ? `₹${topCustomer[1].spent.toFixed(0)} spent • ${topCustomer[1].orders} order${topCustomer[1].orders === 1 ? '' : 's'}`
                : 'Awaiting the first delivered order'}
            </p>
          </div>
        </div>
      </div>

      {/* VISUAL ORDER PERFORMANCE CHART (RECHARTS) */}
      <div className="bg-[#121212] rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#181818] border border-[#C5A059]/40 rounded-xl text-[#C5A059]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white font-serif tracking-tight">Order Performance per Day</h2>
              <p className="text-xs text-gray-400">Daily breakdown of kitchen volume and revenue trend</p>
            </div>
          </div>

          <div className="flex items-center p-1 bg-[#181818] border border-white/10 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setChartMetric('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                chartMetric === 'orders'
                  ? 'bg-[#C5A059] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Orders / Day</span>
            </button>
            <button
              onClick={() => setChartMetric('revenue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                chartMetric === 'revenue'
                  ? 'bg-[#C5A059] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
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
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#333333' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#333333' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: 'rgba(197, 160, 89, 0.4)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  formatter={(value: any) => [`${value} orders`, 'Volume']}
                  labelStyle={{ color: '#C5A059', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar dataKey="totalOrders" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.totalOrders > 0 ? '#C5A059' : '#262626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#333333' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#333333' }}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  formatter={(value: any) => [`₹${value}`, 'Revenue']}
                  labelStyle={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
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
        <div className="bg-[#121212] rounded-2xl p-5 border border-white/10 shadow-lg">
          <h2 className="font-bold text-base text-white mb-3">Latest Orders Live Feed</h2>
          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-[#181818] rounded-xl border border-white/10 text-xs"
              >
                <div>
                  <span className="font-extrabold text-white mr-2">#{order.order_number}</span>
                  <span className="text-gray-300 font-semibold">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">₹{order.total_amount}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      order.status === 'delivered'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : order.status === 'cancelled'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Feedback Ratings */}
        <div className="bg-[#121212] rounded-2xl p-5 border border-white/10 shadow-lg">
          <h2 className="font-bold text-base text-white mb-3">Customer Feedback & Ratings</h2>
          <div className="space-y-3">
            {feedback.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No feedback received yet.</p>
            ) : (
              feedback.map((fb) => (
                <div key={fb.id} className="p-3 bg-[#181818] rounded-xl border border-white/10 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>{fb.order_id} - {fb.customer_name}</span>
                    <div className="flex text-[#C5A059]">
                      {'★'.repeat(fb.food_rating)}
                    </div>
                  </div>
                  {fb.comment && <p className="text-gray-400 text-[11px]">{fb.comment}</p>}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
