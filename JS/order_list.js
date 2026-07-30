// ==========================================================
// JS/orders_list.js - STATS & SALES ITEM BREAKDOWN
// ==========================================================
import { API } from "./api.js";
import { formatCurrency } from "./common.js";

let allOrders = [];
let currentFilterPeriod = "today";

document.addEventListener("DOMContentLoaded", () => {
  initAnalytics();
  
  document.getElementById("card-today")?.addEventListener("click", () => switchPeriod("today"));
  document.getElementById("card-week")?.addEventListener("click", () => switchPeriod("week"));
  document.getElementById("card-month")?.addEventListener("click", () => switchPeriod("month"));
});

async function initAnalytics() {
  allOrders = await API.orders.getAll();
  calculateAndRenderStats();
  switchPeriod(currentFilterPeriod);
}

function parseOrderDate(order) {
  if (!order.timestamp) return new Date(0);
  if (typeof order.timestamp.toDate === "function") return order.timestamp.toDate();
  if (order.timestamp instanceof Date) return order.timestamp;
  return new Date(order.timestamp);
}

function calculateAndRenderStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const todayOrders = allOrders.filter(o => parseOrderDate(o) >= startOfToday);
  const weeklyOrders = allOrders.filter(o => parseOrderDate(o) >= oneWeekAgo);
  const monthlyOrders = allOrders.filter(o => parseOrderDate(o) >= oneMonthAgo);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const weeklyRevenue = weeklyOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  updateDOMElement("stat-today-count", todayOrders.length);
  updateDOMElement("stat-today-revenue", formatCurrency(todayRevenue));
  updateDOMElement("stat-week-count", weeklyOrders.length);
  updateDOMElement("stat-week-revenue", formatCurrency(weeklyRevenue));
  updateDOMElement("stat-month-count", monthlyOrders.length);
  updateDOMElement("stat-month-revenue", formatCurrency(monthlyRevenue));
}

function switchPeriod(period) {
  currentFilterPeriod = period;
  const now = new Date();
  let filteredList = [];

  if (period === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    filteredList = allOrders.filter(o => parseOrderDate(o) >= startOfToday);
  } else if (period === "week") {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredList = allOrders.filter(o => parseOrderDate(o) >= oneWeekAgo);
  } else if (period === "month") {
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filteredList = allOrders.filter(o => parseOrderDate(o) >= oneMonthAgo);
  }

  updateDOMElement("active-period-label", `Sales Itemized Breakdown: ${period.toUpperCase()}`);

  const itemQuantities = {};
  filteredList.forEach(order => {
    if (Array.isArray(order.items)) {
      order.items.forEach(item => {
        const name = item.name;
        const qty = Number(item.qty || 1);
        itemQuantities[name] = (itemQuantities[name] || 0) + qty;
      });
    }
  });

  renderItemBreakdown(itemQuantities);
}

function renderItemBreakdown(itemQuantities) {
  const container = document.getElementById("item-breakdown-list");
  if (!container) return;

  const itemKeys = Object.keys(itemQuantities);
  if (itemKeys.length === 0) {
    container.innerHTML = `<p class="text-gray-400 text-center py-6 text-xs">No food items sold in this period.</p>`;
    return;
  }

  const sortedItems = itemKeys.map(name => ({
    name,
    qty: itemQuantities[name]
  })).sort((a, b) => b.qty - a.qty);

  container.innerHTML = sortedItems.map(item => `
    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs md:text-sm">
      <span class="font-bold text-gray-900">${item.name}</span>
      <span class="bg-amber-100 text-amber-900 font-extrabold px-3 py-1 rounded-full text-xs">🔥 ${item.qty} Sold</span>
    </div>
  `).join("");
}

function updateDOMElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}
