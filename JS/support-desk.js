import { supabase } from "./api.js";
import { formatCurrency } from "./common.js";

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("btn-search-order");
  if (searchBtn) searchBtn.addEventListener("click", lookupActiveOrder);
});

window.searchHelplineOrder = lookupActiveOrder;

async function lookupActiveOrder() {
  const phoneInput = document.getElementById("search-phone") || document.getElementById("helpline-phone-input");
  const results = document.getElementById("search-results") || document.getElementById("helpline-results");

  if (!phoneInput || !results) return;

  const phone = phoneInput.value.trim();

  if (!phone || phone.length < 10) {
    alert("Please enter a valid 10-digit mobile number!");
    return;
  }

  results.innerHTML = `<p class="text-amber-800 text-center font-bold py-4">🔍 Searching active orders...</p>`;

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_phone', phone);

    if (error) throw error;

    const activeOrders = (orders || []).filter(o => o.status !== "DELIVERED" && o.status !== "CANCELLED");

    if (activeOrders.length === 0) {
      results.innerHTML = `
        <div class="p-5 bg-red-50 border border-red-100 rounded-2xl text-center text-xs md:text-sm">
          <p class="text-red-700 font-bold">No Active Orders Found</p>
          <p class="text-gray-500 mt-1">Your order may have already been delivered or cancelled.</p>
        </div>
      `;
      return;
    }

    results.innerHTML = activeOrders.map(active => `
      <div class="p-5 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-3 text-xs md:text-sm shadow-sm">
        <div class="flex justify-between items-start border-b border-amber-200 pb-2">
          <div>
            <span class="bg-amber-800 text-amber-100 font-bold px-2 py-0.5 rounded text-[10px]">#${active.customer_phone}</span>
            <h3 class="font-bold text-base mt-1 text-gray-900">${active.customer_name}</h3>
          </div>
          <span class="font-black text-amber-950 text-base">${formatCurrency(active.total_amount)}</span>
        </div>

        <div class="space-y-1.5 text-gray-700 text-xs md:text-sm">
          <p><b>Order Status:</b> 
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800">🍳 ${active.status}</span>
          </p>
          <p><b>Delivery Address:</b> ${active.delivery_address}</p>
          <p><b>Est. Delivery:</b> <span class="font-semibold text-green-700">20-30 Mins</span></p>
        </div>
      </div>
    `).join("");
  } catch (error) {
    results.innerHTML = `<p class="text-red-600 font-bold text-center">Database lookup failed.</p>`;
  }
}