import { supabase } from "./api.js";
import { formatCurrency } from "./common.js";

let currentDriver = null;

document.getElementById("btn-driver-login")?.addEventListener("click", async () => {
  const email = document.getElementById("delivery-username")?.value.trim();
  const password = document.getElementById("delivery-pass")?.value.trim();

  if (!email || !password) return alert("Please enter Email and Password!");

  try {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile && (profile.role === 'driver' || profile.role === 'delivery' || profile.role === 'staff')) {
      currentDriver = profile;
      document.getElementById("delivery-login-box")?.classList.add("hidden");
      document.getElementById("delivery-main-content")?.classList.remove("hidden");
      
      if (document.getElementById("driver-welcome-name")) {
        document.getElementById("driver-welcome-name").innerText = `Welcome, ${profile.full_name}`;
      }
      loadDriverOrders();
    } else {
      alert("Access Denied: You do not have delivery permissions.");
    }
  } catch (error) {
    alert(`Authentication Failed: ${error.message}`);
  }
});

async function loadDriverOrders() {
  if (!currentDriver) return;

  const container = document.getElementById("driver-assigned-cards");
  if (!container) return;

  container.innerHTML = `<p class="col-span-2 text-amber-800 text-center py-4 font-bold">🔍 Fetching active deliveries...</p>`;

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'OUT FOR DELIVERY');

  if (error || !orders || orders.length === 0) {
    container.innerHTML = `<div class="col-span-2 bg-white p-6 rounded-xl text-center text-gray-400 border">No active deliveries assigned right now!</div>`;
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="bg-white p-4 rounded-xl shadow border space-y-3 border-l-4 border-amber-800 text-xs md:text-sm">
      <div class="flex justify-between items-start border-b pb-2">
        <div>
          <span class="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs">#${o.customer_phone}</span>
          <h3 class="font-bold text-base mt-1 text-gray-900">${o.customer_name}</h3>
          <p class="text-xs text-amber-900 font-bold mt-0.5">📱 Mobile: ${o.customer_phone}</p>
        </div>
      </div>

      <div class="text-xs space-y-1 text-gray-700">
        <p><b>Address:</b> ${o.delivery_address || 'N/A'}</p>
      </div>

      <div class="p-2 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
        <span class="text-xs font-bold text-green-900">Collect Cash (COD):</span>
        <span class="text-lg font-black text-green-700">${formatCurrency(o.total_amount)}</span>
      </div>

      <button onclick="markDelivered('${o.id}')" class="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg text-xs transition">
        ✔ Mark Delivered & Complete
      </button>
    </div>
  `).join("");
}

window.markDelivered = async function(orderId) {
  if (confirm("Mark order as DELIVERED and Cash Collected?")) {
    await supabase.from('orders').update({ status: 'DELIVERED' }).eq('id', orderId);
    alert("✔ Delivery Completed!");
    loadDriverOrders();
  }
};