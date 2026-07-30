// ==========================================================
// JS/admin-driver-stats.js - DRIVER PERFORMANCE METRICS
// ==========================================================
import { API } from "./api.js";
import { formatCurrency } from "./common.js";

let allOrders = [];
let allDrivers = [];

document.addEventListener("DOMContentLoaded", () => {
  initDriverStats();
  
  const selectElement = document.getElementById("select-driver-stats");
  if (selectElement) {
    selectElement.addEventListener("change", (e) => calculateStatsForDriver(e.target.value));
  }
});

async function initDriverStats() {
  const dropdown = document.getElementById("select-driver-stats");
  if (dropdown) dropdown.innerHTML = `<option value="">Loading drivers...</option>`;

  try {
    // 1. Fetch live data
    allOrders = await API.orders.getAll();
    const staffList = await API.staff.getAll();
    allDrivers = staffList.filter(s => s.role === "Driver" || s.role === "Delivery Boy");

    // 2. Populate Dropdown list
    if (dropdown) {
      if (allDrivers.length === 0) {
        dropdown.innerHTML = `<option value="">No registered drivers found</option>`;
        return;
      }
      dropdown.innerHTML = `<option value="">Select a Delivery Partner...</option>` +
        allDrivers.map(d => `<option value="${d.name}">${d.name} (${d.username})</option>`).join("");
    }
  } catch (err) {
    console.error("Failed to load driver profiles:", err);
  }
}

function calculateStatsForDriver(driverName) {
  const metricsBox = document.getElementById("driver-stats-metrics");
  if (!driverName) {
    if (metricsBox) metricsBox.classList.add("hidden");
    return;
  }

  // Un-hide display container
  if (metricsBox) metricsBox.classList.remove("hidden");

  // 1. Filter orders assigned to this specific driver
  const driverOrders = allOrders.filter(o => o.assignedDriver === driverName);
  
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayOrders = driverOrders.filter(o => parseDate(o.timestamp) >= startOfToday);
  const completedOrders = driverOrders.filter(o => o.status === "DELIVERED");
  const pendingOrders = driverOrders.filter(o => o.status === "OUT FOR DELIVERY" || o.status === "Out For Delivery");

  // 2. Calculate Cash Collected Today
  const totalCashCollected = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  // 3. Calculate Average Delivery Speed (Timestamp to DeliveredAt gap)
  let avgDeliveryTime = "N/A";
  const speedRecords = completedOrders.filter(o => o.deliveredAt && o.timestamp);
  
  if (speedRecords.length > 0) {
    const totalMinutes = speedRecords.reduce((sum, o) => {
      const start = parseDate(o.timestamp).getTime();
      const end = parseDate(o.deliveredAt).getTime();
      const diffMins = Math.round((end - start) / 60000);
      return sum + (diffMins > 0 ? diffMins : 15); // Fallback to campus default if instant
    }, 0);
    avgDeliveryTime = `${Math.round(totalMinutes / speedRecords.length)} Minutes`;
  }

  // 4. Update UI
  updateDOM("driver-stat-name", driverName);
  updateDOM("driver-stat-today-count", todayOrders.length);
  updateDOM("driver-stat-completed", completedOrders.length);
  updateDOM("driver-stat-pending", pendingOrders.length);
  updateDOM("driver-stat-cash", formatCurrency(totalCashCollected));
  updateDOM("driver-stat-speed", avgDeliveryTime);
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
