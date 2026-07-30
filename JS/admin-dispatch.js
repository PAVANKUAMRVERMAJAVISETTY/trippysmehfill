// ==========================================================
// JS/admin-dispatch.js - DISPATCH DESK & LIVE STREAM
// ==========================================================
import { API } from "./api.js";
import { AuthGuard } from "./auth.js"; // Checks if administrator session is active
import { showToast, playOrderChime, formatCurrency } from "./common.js";

let currentDrivers = [];

document.addEventListener("DOMContentLoaded", () => {
  initDispatch();
});

async function initDispatch() {
  const grid = document.getElementById("dispatch-grid");
  if (grid) grid.innerHTML = `<p class="col-span-3 text-center py-8 text-amber-950 font-bold">🔍 Synchronizing live order queue...</p>`;

  // 1. Fetch available drivers first
  try {
    const staffList = await API.staff.getAll();
    currentDrivers = staffList.filter(s => s.role === "Driver" || s.role === "Delivery Boy");
  } catch (err) {
    console.error("Error loading delivery team:", err);
  }

  // 2. Subscribe to live Firestore updates
  API.orders.subscribe((orders) => {
    playOrderChime();
    renderDispatchCards(orders);
  });
}

function renderDispatchCards(orders) {
  const grid = document.getElementById("dispatch-grid");
  if (!grid) return;

  // Filter out completely finished orders
  const activeOrders = orders.filter(o => o.status !== "DELIVERED" && o.status !== "CANCELLED");
  
  const pendingCount = activeOrders.filter(o => o.status === "PENDING").length;
  const queueBadge = document.getElementById("queue-badge");
  if (queueBadge) queueBadge.innerText = `Pending Orders: ${pendingCount}`;

  if (activeOrders.length === 0) {
    grid.innerHTML = `<p class="col-span-3 text-center py-8 text-gray-400 font-bold">No active orders in queue.</p>`;
    return;
  }

  grid.innerHTML = activeOrders.map(o => {
    const isPending = o.status === "PENDING";
    return `
      <div class="bg-white p-5 rounded-2xl shadow border space-y-3 text-xs md:text-sm ${isPending ? 'border-l-4 border-yellow-500' : 'border-l-4 border-blue-600'}">
        <div class="flex justify-between items-start border-b pb-2">
          <div>
            <span class="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs">#${o.orderId || o.phone}</span>
            <h3 class="font-bold text-base mt-1 text-gray-900">${o.name}</h3>
            <p class="text-xs text-amber-900 font-bold mt-0.5">📱 Mobile: ${o.phone}</p>
          </div>
          <span class="font-black text-amber-900 text-base">${formatCurrency(o.amount)}</span>
        </div>

        <div class="text-xs text-gray-600 space-y-1">
          <p><b>Campus Landmark:</b> ${o.campus || 'N/A'}</p>
          <p><b>Address:</b> ${o.address}</p>
          <p><b>Items:</b> ${o.items ? o.items.map(i => `${i.name} (x${i.qty})`).join(', ') : 'N/A'}</p>
          ${o.notes !== "None" ? `<p class="text-amber-800 font-bold bg-yellow-50 px-1 rounded mt-1 inline-block">Notes: ${o.notes}</p>` : ''}
        </div>

        <div class="pt-2 border-t space-y-2">
          <label class="block text-[10px] font-bold uppercase text-gray-500">Assign Delivery Partner:</label>
          <select data-id="${o.id}" class="select-driver w-full border p-2 rounded-lg text-xs bg-white font-semibold outline-none focus:border-amber-800">
            <option value="">Select Delivery Boy...</option>
            ${currentDrivers.map(d => `
              <option value="${d.name}" ${o.assignedDriver === d.name ? 'selected' : ''}>${d.name}</option>
            `).join('')}
          </select>

          <div class="flex gap-2">
            ${isPending ? `
              <button data-id="${o.id}" class="btn-accept w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-95">
                ✔ Accept & Start Cooking
              </button>
            ` : `
              <span class="w-full text-center bg-blue-50 text-blue-800 border border-blue-100 font-bold py-1 rounded text-xs">
                🍳 Status: ${o.status}
              </span>
            `}
            <button data-id="${o.id}" class="btn-delete bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Bind Drivers Allocation dropdown changes
  document.querySelectorAll(".select-driver").forEach(select => {
    select.addEventListener("change", async (e) => {
      const orderId = e.target.dataset.id;
      const driverName = e.target.value;
      if (!driverName) return;

      try {
        await API.orders.update(orderId, { assignedDriver: driverName, status: "OUT FOR DELIVERY" });
        showToast(`Dispatched with ${driverName}!`);
      } catch (err) {
        showToast("Allocation failed", "error");
      }
    });
  });

  // Bind Accept Order clicks
  document.querySelectorAll(".btn-accept").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await API.orders.update(btn.dataset.id, { status: "PREPARING" });
        showToast("Order is now in preparation!");
      } catch (err) {
        showToast("Accept failed", "error");
      }
    });
  });

  // Bind Permanently Delete Order clicks
  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Permanently delete this order data from Cloud?")) {
        try {
          await API.orders.delete(btn.dataset.id);
          showToast("Order removed", "error");
        } catch (err) {
          showToast("Delete failed", "error");
        }
      }
    });
  });
}
