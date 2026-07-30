import { supabase } from "./api.js";
import { formatCurrency } from "./common.js";

document.addEventListener("DOMContentLoaded", () => {
  initDispatch();
});

async function initDispatch() {
  const grid = document.getElementById("dispatch-grid");
  if (!grid) return;

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .neq('status', 'DELIVERED')
    .order('created_at', { ascending: false });

  if (error || !orders || orders.length === 0) {
    grid.innerHTML = `<p class="col-span-3 text-center py-8 text-gray-400 font-bold">No active orders in queue.</p>`;
    return;
  }

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'PENDING').length;
  const queueBadge = document.getElementById("queue-badge");
  if (queueBadge) queueBadge.innerText = `Pending Orders: ${pendingCount}`;

  grid.innerHTML = orders.map(o => `
    <div class="bg-white p-5 rounded-2xl shadow border space-y-3 text-xs md:text-sm border-l-4 border-amber-800">
      <div class="flex justify-between items-start border-b pb-2">
        <div>
          <span class="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs">#${o.customer_phone || 'TM'}</span>
          <h3 class="font-bold text-base mt-1 text-gray-900">${o.customer_name}</h3>
          <p class="text-xs text-amber-900 font-bold mt-0.5">📱 Mobile: ${o.customer_phone}</p>
        </div>
        <span class="font-black text-amber-900 text-base">${formatCurrency(o.total_amount)}</span>
      </div>

      <div class="text-xs text-gray-600 space-y-1">
        <p><b>Address:</b> ${o.delivery_address}</p>
        <p><b>Notes:</b> ${o.notes || 'None'}</p>
      </div>

      <div class="pt-2 border-t flex gap-2">
        <button onclick="updateOrderStatus('${o.id}', 'PREPARING')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-lg text-xs">
          Accept & Cook
        </button>
        <button onclick="updateOrderStatus('${o.id}', 'OUT FOR DELIVERY')" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 rounded-lg text-xs">
          Dispatch
        </button>
      </div>
    </div>
  `).join("");
}

window.updateOrderStatus = async function(orderId, newStatus) {
  await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  initDispatch();
};