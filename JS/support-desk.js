// ==========================================================
// JS/support_desk.js - SUPPORT DESK & HELPLINE CONTROLLER
// ==========================================================
import { API } from "./api.js";
import { formatCurrency } from "./common.js";

/**
 * Searches live orders in Firestore based on customer mobile number.
 * Attached to the window object to match the HTML inline trigger: onclick="searchHelplineOrder()"
 */
window.searchHelplineOrder = async function() {
  const phoneInput = document.getElementById("helpline-phone-input");
  const resultsContainer = document.getElementById("helpline-results");
  
  if (!phoneInput || !resultsContainer) return;

  const phone = phoneInput.value.trim();

  if (!phone || phone.length < 10) {
    alert("Please enter a valid 10-digit mobile number!");
    return;
  }

  resultsContainer.innerHTML = `
    <p class="text-amber-800 text-center font-bold py-4">🔍 Searching active cloud orders...</p>
  `;

  try {
    const orders = await API.orders.getAll();
    
    // Filter out delivered or cancelled orders to focus ONLY on active dispatches
    const activeOrders = orders.filter(o => 
      o.phone === phone && 
      o.status !== "DELIVERED" && 
      o.status !== "CANCELLED"
    );

    if (activeOrders.length === 0) {
      resultsContainer.innerHTML = `
        <div class="p-4 bg-red-50 border border-red-200 rounded-2xl text-center text-xs md:text-sm">
          <p class="text-red-700 font-bold">No Active Orders Found</p>
          <p class="text-gray-500 mt-1">If you placed an order, it has already been delivered or cancelled.</p>
        </div>
      `;
      return;
    }

    // Render active order card(s)
    resultsContainer.innerHTML = activeOrders.map(active => {
      const itemsList = active.items 
        ? active.items.map(i => `${i.name} (x${i.qty})`).join(", ") 
        : "N/A";
        
      return `
        <div class="p-4 border rounded-xl bg-amber-50/50 border-amber-200 space-y-2 my-2 text-xs md:text-sm shadow-sm">
          <div class="flex justify-between items-start font-bold border-b border-amber-200 pb-1">
            <span class="text-amber-950">Order ID: #${active.orderId || active.phone}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-yellow-100 text-yellow-800">
              🍳 ${active.status}
            </span>
          </div>
          <div class="space-y-1.5 text-gray-700">
            <p><b>Delivery Boy:</b> <span class="font-bold text-amber-900">${active.assignedDriver || "Cooking in Progress (Unassigned)"}</span></p>
            <p><b>Collect Cash (COD):</b> <span class="text-green-700 font-bold">${formatCurrency(active.amount)}</span></p>
            <p><b>Items:</b> ${itemsList}</p>
            <p><b>Address:</b> ${active.address}</p>
            <p><b>ETA:</b> <span class="text-green-700 font-bold">20-30 Mins (Fast Delivery)</span></p>
          </div>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Support Desk lookup error:", error);
    resultsContainer.innerHTML = `
      <p class="text-red-600 font-bold text-center text-xs py-4">Database search failed. Please try again.</p>
    `;
  }
};
