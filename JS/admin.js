import { supabase } from './api.js';
import { AuthGuard } from './auth.js';

// Verify Admin Session
AuthGuard.checkSession();

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  loadAdminCustomers();
});

// Render & Action Handlers for Customers List
async function loadAdminCustomers() {
  const grid = document.getElementById('customers-list-grid');
  if (!grid) return;

  const { data: customers, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer');

  if (error || !customers) {
    grid.innerHTML = `<p class="text-red-500 text-xs col-span-full text-center">Failed to load customers: ${error ? error.message : 'No data'}</p>`;
    return;
  }

  const cxCountEl = document.getElementById('cx-count');
  if (cxCountEl) cxCountEl.innerText = `${customers.length} Customers`;

  if (customers.length === 0) {
    grid.innerHTML = `<p class="text-gray-400 text-xs col-span-full text-center py-4">No registered customers found.</p>`;
    return;
  }

  grid.innerHTML = customers.map(c => `
    <div class="bg-amber-50/40 p-4 rounded-xl border border-amber-100 flex flex-col justify-between space-y-3">
      <div>
        <div class="flex justify-between items-start">
          <h4 class="font-extrabold text-gray-900 text-sm">${c.full_name}</h4>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.is_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${c.is_approved ? 'Active' : 'Disabled'}
          </span>
        </div>
        <p class="text-xs text-gray-500 mt-1">${c.email}</p>
        <p class="text-xs text-gray-600 font-semibold">${c.phone}</p>
        <p class="text-[11px] text-amber-900/80 mt-1 truncate">📍 ${c.hostel_address || 'No address'}</p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2 pt-2 border-t border-amber-200/50">
        <button onclick="toggleCustomerStatus('${c.id}', ${!c.is_approved})" class="flex-1 text-[11px] font-bold py-1.5 rounded-lg border border-amber-700 text-amber-900 hover:bg-amber-100">
          ${c.is_approved ? 'Deactivate' : 'Activate'}
        </button>
        <button onclick="deleteCustomerAccount('${c.id}')" class="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

// Toggle Customer Active/Inactive
window.toggleCustomerStatus = async function(userId, newStatus) {
  const { error } = await supabase.from('profiles').update({ is_approved: newStatus }).eq('id', userId);
  if (error) {
    alert("Error updating status: " + error.message);
  } else {
    loadAdminCustomers();
  }
};

// Delete Customer Account
window.deleteCustomerAccount = async function(userId) {
  if (confirm("Are you sure you want to delete this customer account?")) {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      alert("Error deleting account: " + error.message);
    } else {
      loadAdminCustomers();
    }
  }
};