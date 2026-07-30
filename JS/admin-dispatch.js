import { supabase } from "./api.js";
import { formatCurrency, showToast, playOrderChime } from "./common.js";

let polling = null;
let lastOrdersHash = null;

document.addEventListener("DOMContentLoaded", () => {
  initDispatch();
  // poll every 10s for new orders
  polling = setInterval(initDispatch, 10000);
});

async function initDispatch() {
  const grid = document.getElementById("dispatch-grid");
  if (!grid) return;

  grid.innerHTML = `<p class="col-span-3 text-center py-8 text-gray-400 font-bold">Loading orders...</p>`;

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'DELIVERED')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      grid.innerHTML = `<p class="col-span-3 text-center py-8 text-gray-400 font-bold">No active orders in queue.</p>`;
      lastOrdersHash = JSON.stringify([]);
      return;
    }

    // Detect new orders (simple diff by JSON string length/hash)
    const currentHash = JSON.stringify(orders.map(o => o.id));
    if (lastOrdersHash && lastOrdersHash !== currentHash) {
      showToast('New order(s) in queue', 'success');
      try { playOrderChime(); } catch (e) { /* ignore audio errors */ }
    }
    lastOrdersHash = currentHash;

    // Update Pending badge count
    const pendingCount = orders.filter(o => (o.status || '').toLowerCase() === 'pending' || (o.status || '').toUpperCase() === 'PENDING').length;
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
          <p><b>Status:</b> <span class="bg-amber-100 font-bold px-2 py-0.5 rounded text-[10px] text-amber-900">${o.status}</span></p>
        </div>

        <div class="pt-2 border-t flex gap-2">
          <button data-id="${o.id}" data-status="PREPARING" class="accept-btn flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-lg text-xs transition">Accept & Cook</button>
          <button data-id="${o.id}" data-status="OUT FOR DELIVERY" class="dispatch-btn flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 rounded-lg text-xs transition">Dispatch</button>
        </div>
      </div>
    `).join("");

    // attach handlers
    document.querySelectorAll('.accept-btn, .dispatch-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        const newStatus = btn.getAttribute('data-status');
        if (!id || !newStatus) return;

        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = 'Updating...';

        try {
          const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
          if (error) throw error;
          showToast('Order status updated');
          // refresh list
          await initDispatch();
        } catch (err) {
          console.error('Update order status failed', err);
          showToast('Status update failed', 'error');
        } finally {
          btn.disabled = false;
          btn.innerText = originalText;
        }
      });
    });

  } catch (err) {
    console.error('Dispatch load failed', err);
    grid.innerHTML = `<p class="col-span-3 text-center py-8 text-gray-400 font-bold">Failed to load dispatch queue.</p>`;
    showToast('Failed to load dispatch queue', 'error');
  }
}
