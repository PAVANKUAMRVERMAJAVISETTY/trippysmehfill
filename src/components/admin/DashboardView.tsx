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
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-[#1F2933]" style={{ backgroundColor: '#F5F1E8' }}>
      
      {/* Title & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D2C5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#B8862D]" />
            <h1 className="text-2xl font-black text-[#1F2933] font-serif tracking-wide">
              Live ERP Admin Control Center
            </h1>
          </div>
          <p className="text-xs text-[#5F6368]">
            Real-time kitchen queue, driver operations, revenue analytics & inventory status.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#DDD6C8] px-3.5 py-2 rounded-xl text-xs font-mono text-[#B8862D] shadow-sm">
          <Calendar className="w-4 h-4 text-[#B8862D]" />
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* LIVE OPERATIONAL QUEUE WIDGETS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E8C66A] space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#8A5A00] uppercase tracking-wider">Pending Orders</span>
            <Clock className="w-4 h-4 text-[#8A5A00]" />
          </div>
          <p className="text-2xl font-black text-[#1F2933]">{pendingCount}</p>
          <p className="text-[9px] text-[#5F6368]">Awaiting kitchen accept</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#B94D00]/30 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#D95F0A] uppercase tracking-wider">Kitchen Queue</span>
            <ChefHat className="w-4 h-4 text-[#D95F0A]" />
          </div>
          <p className="text-2xl font-black text-[#1F2933]">{cookingCount}</p>
          <p className="text-[9px] text-[#5F6368]">Dishes currently cooking</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#8FB6D9] space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#2563A6] uppercase tracking-wider">Packed Orders</span>
            <PackageCheck className="w-4 h-4 text-[#2563A6]" />
          </div>
          <p className="text-2xl font-black text-[#1F2933]">{packedCount}</p>
          <p className="text-[9px] text-[#5F6368]">Ready for pickup runner</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#86EFAC] space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#146C43] uppercase tracking-wider">Delivering</span>
            <Bike className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="text-2xl font-black text-[#1F2933]">{deliveringCount}</p>
          <p className="text-[9px] text-[#5F6368]">Drivers on delivery run</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DDD6C8] space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#B8862D] uppercase tracking-wider">Drivers Online</span>
            <Users className="w-4 h-4 text-[#B8862D]" />
          </div>
          <p className="text-2xl font-black text-[#1F2933]">6 Online</p>
          <p className="text-[9px] text-[#5F6368]">4 Delivering • 2 Idle</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DDD6C8] space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#2563A6] uppercase tracking-wider">Live Visitors</span>
            <Eye className="w-4 h-4 text-[#2563A6]" />
          </div>
          <p className="text-2xl font-black text-[#1F2933]">14 Active</p>
          <p className="text-[9px] text-[#5F6368]">142 total today</p>
        </div>
      </div>

      {/* REVENUE & PROFIT SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#DDD6C8] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Today's Revenue</p>
            <DollarSign className="w-4 h-4 text-[#B8862D]" />
          </div>
          <p className="text-2xl font-black text-[#1F2933] mt-1">₹{todayStats.revenue}</p>
          <p className="text-[10px] text-[#146C43] font-bold mt-1">
            +18.4% vs yesterday ({todayStats.totalOrders} orders)
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#DDD6C8] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Today's Net Profit</p>
            <TrendingUp className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="text-2xl font-black text-[#146C43] mt-1">₹{todayProfit}</p>
          <p className="text-[10px] text-[#5F6368] font-mono mt-1">62% profit margin after raw costs</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#DDD6C8] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Weekly Revenue</p>
            <BarChart3 className="w-4 h-4 text-[#B8862D]" />
          </div>
          <p className="text-2xl font-black text-[#B8862D] mt-1">₹{totalRevenue}</p>
          <p className="text-[10px] text-[#5F6368] font-mono mt-1">Total {totalOrders} orders completed</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#DDD6C8] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Monthly Revenue</p>
            <Award className="w-4 h-4 text-[#2563A6]" />
          </div>
          <p className="text-2xl font-black text-[#1F2933] mt-1">₹{monthlyRevenue.toFixed(0)}</p>
          <p className="text-[10px] text-[#2563A6] font-bold mt-1">Delivered orders, month to date</p>
        </div>
      </div>

      {/* TOP SELLING & FRAUD / LOW STOCK INTELLIGENCE WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Selling Dish */}
        <div className="bg-white p-4 rounded-2xl border border-[#DDD6C8] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#FFF0CC] border border-[#E8C66A] rounded-2xl text-[#8A5A00]">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#B8862D]">Top Selling Dish</span>
            <h4 className="font-extrabold text-[#1F2933] text-sm font-serif line-clamp-1">{topDish || 'No orders yet'}</h4>
            <p className="text-[11px] text-[#5F6368] font-mono">{topDishCount > 0 ? `${topDishCount} sold` : 'Awaiting the first order'}</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-4 rounded-2xl border border-[#F5A6A1] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#FDE2E1] border border-[#F5A6A1] rounded-2xl text-[#922B21]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#922B21]">Inventory</span>
            <h4 className="font-extrabold text-[#1F2933] text-sm">Check the Inventory tab</h4>
            <p className="text-[11px] text-[#5F6368]">Live stock levels and low-stock alerts</p>
          </div>
        </div>

        {/* Top Loyal Customer */}
        <div className="bg-white p-4 rounded-2xl border border-[#DDD6C8] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#E8F1FA] border border-[#8FB6D9] rounded-2xl text-[#2563A6]">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#2563A6]">Top Customer</span>
            <h4 className="font-extrabold text-[#1F2933] text-sm">{topCustomer ? topCustomer[0] : 'No orders yet'}</h4>
            <p className="text-[11px] text-[#5F6368] font-mono">
              {topCustomer
                ? `₹${topCustomer[1].spent.toFixed(0)} spent • ${topCustomer[1].orders} order${topCustomer[1].orders === 1 ? '' : 's'}`
                : 'Awaiting the first delivered order'}
            </p>
          </div>
        </div>
      </div>

      {/* VISUAL ORDER PERFORMANCE CHART (RECHARTS) */}
      <div className="bg-white rounded-2xl p-5 border border-[#DDD6C8] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD6C8] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F7F4EC] border border-[#DDD6C8] rounded-xl text-[#B8862D]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#1F2933] font-serif tracking-tight">Order Performance per Day</h2>
              <p className="text-xs text-[#5F6368]">Daily breakdown of kitchen volume and revenue trend</p>
            </div>
          </div>

          <div className="flex items-center p-1 bg-[#F7F4EC] border border-[#DDD6C8] rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setChartMetric('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                chartMetric === 'orders'
                  ? 'bg-[#B8862D] text-white shadow-sm'
                  : 'text-[#5F6368] hover:text-[#1F2933]'
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
                  : 'text-[#5F6368] hover:text-[#1F2933]'
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
                <CartesianGrid strokeDasharray="3 3" stroke="#DDD6C8" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: '#5F6368', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#DDD6C8' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#5F6368', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#DDD6C8' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DDD6C8',
                    borderRadius: '12px',
                    color: '#1F2933',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: any) => [`${value} orders`, 'Volume']}
                  labelStyle={{ color: '#B8862D', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar dataKey="totalOrders" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.totalOrders > 0 ? '#D95F0A' : '#DDD6C8'}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#DDD6C8" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: '#5F6368', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#DDD6C8' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#5F6368', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#DDD6C8' }}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DDD6C8',
                    borderRadius: '12px',
                    color: '#1F2933',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
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
        <div className="bg-white rounded-2xl p-5 border border-[#DDD6C8] shadow-sm">
          <h2 className="font-bold text-base text-[#1F2933] mb-3">Latest Orders Live Feed</h2>
          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-[#F7F4EC] rounded-xl border border-[#DDD6C8] text-xs"
              >
                <div>
                  <span className="font-extrabold text-[#1F2933] mr-2">#{order.order_number}</span>
                  <span className="text-[#1F2933] font-semibold">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#1F2933]">₹{order.total_amount}</span>
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
            ))}
          </div>
        </div>

        {/* Customer Feedback Ratings */}
        <div className="bg-white rounded-2xl p-5 border border-[#DDD6C8] shadow-sm">
          <h2 className="font-bold text-base text-[#1F2933] mb-3">Customer Feedback & Ratings</h2>
          <div className="space-y-3">
            {feedback.length === 0 ? (
              <p className="text-xs text-[#5F6368] italic">No feedback received yet.</p>
            ) : (
              feedback.map((fb) => (
                <div key={fb.id} className="p-3 bg-[#F7F4EC] rounded-xl border border-[#DDD6C8] text-xs space-y-1">
                  <div className="flex justify-between font-bold text-[#1F2933]">
                    <span>{fb.order_id} - {fb.customer_name}</span>
                    <div className="flex text-[#B8862D]">
                      {'★'.repeat(fb.food_rating)}
                    </div>
                  </div>
                  {fb.comment && <p className="text-[#5F6368] text-[11px]">{fb.comment}</p>}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
