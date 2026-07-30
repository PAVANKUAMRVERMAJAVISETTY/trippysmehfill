// ==========================================================
// JS/admin-orders.js - ORDER REGISTRY CONTROLLER
// ==========================================================
import { API } from "./api.js";
import { formatCurrency } from "./common.js";

let allOrders = [];

document.addEventListener("DOMContentLoaded", () => {
  loadOrdersList();

  // Bind live filter changes
  document.getElementById("filter-phone").addEventListener("input", applyFilters);
  document.getElementById("filter-landmark").addEventListener("change", applyFilters);
  document.getElementById("filter-status").addEventListener("change", applyFilters);
});

async function loadOrdersList() {
  allOrders = await API.orders.getAll();
  renderOrdersTable(allOrders);
}

function renderOrdersTable(ordersList) {
  const tbody = document.getElementById("orders-table-body");
  if (!tbody) return;

  if (ordersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-400">No matching orders found in system.</td></tr>`;
    return;
  }

  tbody.innerHTML = ordersList.map(o => `
    <tr class="border-b hover:bg-gray-50 text-xs md:text-sm">
      <td class="p-3 font-bold text-amber-900">${o.orderId || o.phone}</td>
      <td class="p-3 font-semibold">${o.name}<br><span class="text-xs text-gray-400">${o.phone}</span></td>
      <td class="p-3"><span class="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded text-xs font-bold">${o.campus || 'N/A'}</span><br><span class="text-xs text-gray-500">${o.address}</span></td>
      <td class="p-3">
        <ul class="list-disc list-inside text-xs text-gray-600">
          ${o.items ? o.items.map(i => `<li>${i.name} × ${i.qty}</li>`).join('') : 'N/A'}
        </ul>
      </td>
      <td class="p-3 font-black text-amber-950">${formatCurrency(o.amount)}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${o.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
          ${o.status}
        </span>
      </td>
      <td class="p-3">
        <button onclick="deleteHistoricOrder('${o.id}')" class="text-red-600 hover:text-red-800 font-bold text-xs transition">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

function applyFilters() {
  const phoneVal = document.getElementById("filter-phone").value.trim();
  const landmarkVal = document.getElementById("filter-landmark").value;
  const statusVal = document.getElementById("filter-status").value;

  const filtered = allOrders.filter(o => {
    const matchesPhone = phoneVal ? o.phone.includes(phoneVal) : true;
    const matchesLandmark = landmarkVal ? o.campus === landmarkVal : true;
    const matchesStatus = statusVal ? o.status === statusVal : true;
    return matchesPhone && matchesLandmark && matchesStatus;
  });

  renderOrdersTable(filtered);
}

window.deleteHistoricOrder = async function(id) {
  if (!confirm("Are you sure you want to permanently delete this order record? This cannot be undone.")) return;
  try {
    await API.orders.delete(id);
    alert("Record deleted.");
    loadOrdersList();
  } catch (err) {
    alert("Deletion failed: " + err.message);
  }
};
