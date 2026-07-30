// ==========================================================
// JS/admin-analytics.js - KITCHEN METRICS DASHBOARD
// ==========================================================
import { API } from "./api.js";
import { formatCurrency } from "./common.js";

document.addEventListener("DOMContentLoaded", () => {
  loadFullAnalytics();
});

async function loadFullAnalytics() {
  const statIds = ["stat-total-orders", "stat-completed-orders", "stat-revenue", "stat-pending-orders", "stat-avg-rating"];
  statIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = "⏳";
  });

  try {
    // 1. Fetch Orders and Feedbacks from Cloud Firestore
    const orders = await API.orders.getAll();
    const feedbacks = await API.feedback.getAll();

    // 2. Parse Timestamps for Dates
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayOrders = orders.filter(o => parseDate(o.timestamp) >= startOfToday);
    const completedOrders = orders.filter(o => o.status === "DELIVERED");
    const pendingOrders = orders.filter(o => o.status === "PENDING" || o.status === "PREPARING");

    // 3. Calculate Financials
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    // 4. Calculate Average Rating
    let avgRating = 5.0;
    if (feedbacks.length > 0) {
      const sumRatings = feedbacks.reduce((sum, f) => sum + (Number(f.rating) || 5), 0);
      avgRating = (sumRatings / feedbacks.length).toFixed(1);
    }

    // 5. Update Metrics Cards
    updateDOM("stat-total-orders", todayOrders.length);
    updateDOM("stat-completed-orders", completedOrders.length);
    updateDOM("stat-pending-orders", pendingOrders.length);
    updateDOM("stat-revenue", formatCurrency(totalRevenue));
    updateDOM("stat-avg-rating", `⭐ ${avgRating} / 5.0`);

    // 6. Load Recent Feedbacks Feed
    renderRecentFeedbacks(feedbacks);

  } catch (err) {
    console.error("Failed to load dashboard metrics:", err);
  }
}

function renderRecentFeedbacks(feedbacks) {
  const container = document.getElementById("admin-feedback-feed");
  if (!container) return;

  if (feedbacks.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-400 py-4 text-center">No customer reviews have been submitted yet.</p>`;
    return;
  }

  // Sort and display the 5 latest reviews
  const sortedFeedbacks = feedbacks.sort((a, b) => {
    return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
  }).slice(0, 5);

  container.innerHTML = sortedFeedbacks.map(f => `
    <div class="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs md:text-sm space-y-1">
      <div class="flex justify-between items-center font-bold">
        <span class="text-amber-950">Order #${f.orderId || 'Direct'}</span>
        <span class="text-yellow-600">${"★".repeat(f.rating)}${"☆".repeat(5 - f.rating)}</span>
      </div>
      <p class="text-gray-600 font-medium">"${f.comment || 'No comment left'}"</p>
    </div>
  `).join("");
}

function parseDate(ts) {
  if (!ts) return new Date(0);
  if (typeof ts.toDate === "function") return ts.toDate();
  return new Date(ts);
}

function updateDOM(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}
