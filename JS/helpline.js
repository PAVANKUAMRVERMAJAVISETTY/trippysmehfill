// ==========================================================
// JS/helpline.js - HELPLINE / ACTIVE ORDER SEARCHER
// ==========================================================
import { API } from "./api.js";
import { formatCurrency } from "./common.js";

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("btn-search-order");
  if (searchBtn) searchBtn.addEventListener("click", lookupActiveOrder);
});

async function lookupActiveOrder() {
  const phone = document.getElementById("search-phone").value.trim();
  const results = document.getElementById("search-results");

  if (!phone || phone.length < 10) {
    alert("Please enter a valid 10-digit mobile number!");
    return;
  }

  results.innerHTML = `<p class="text-amber-800 text-center font-bold">🔍 Fetching active orders...</p>`;

  try {
    const orders = await API.orders.getAll();
    const activeOrders = orders.filter(o => 
      o.phone === phone && 
      o.status !== "DELIVERED" && 
      o.status !== "CANCELLED"
    );

    if (activeOrders.length === 0) {
      results.innerHTML = `
        <div class="p-5 bg-red-50 border border-red-100 rounded-2xl text-center text-xs md:text-sm">
          <p class="text-red-700 font-bold">No Active Orders Found</p>
          <p class="text-gray-500 mt-1">If you placed an order, it may have already been completed.</p>
        </div>
      `;
      return;
    }

    results.innerHTML = activeOrders.map(active => `
      <div class="p-5 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-3 text-xs md:text-sm shadow-sm">
        <div class="flex justify-between items-start border-b border-amber-200 pb-2">
          <div>
            <span class="bg-amber-800 text-amber-100 font-bold px-2 py-0.5 rounded text-[10px]">#${active.orderId || active.phone}</span>
            <h3 class="font-bold text-base mt-1 text-gray-900">${active.name}</h3>
          </div>
          <span class="font-black text-amber-950 text-base">${formatCurrency(active.amount)}</span>
        </div>

        <div class="space-y-1.5 text-gray-700 text-xs md:text-sm">
          <p><b>Order Status:</b> 
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800">🍳 ${active.status}</span>
          </p>
          <p><b>Delivery Boy:</b> <span class="font-bold text-amber-900">${active.assignedDriver || 'Cooking in Progress (Unassigned)'}</span></p>
          <p><b>Delivery Address:</b> ${active.address}</p>
          <p><b>Items:</b> ${active.items ? active.items.map(i => `${i.name} (x${i.qty})`).join(', ') : 'N/A'}</p>
          <p><b>Est. Delivery:</b> <span class="font-semibold text-green-700">20-30 Mins (Campus Special)</span></p>
        </div>
      </div>
    `).join("");
  } catch (error) {
    console.error("Helpline lookup failed:", error);
    results.innerHTML = `<p class="text-red-600 font-bold text-center">Database query failed.</p>`;
  }
}
