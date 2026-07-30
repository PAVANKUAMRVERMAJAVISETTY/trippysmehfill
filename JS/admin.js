import { supabase } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  loadPendingRegistrations();
  loadApprovedCustomers();
});

// 1. Fetch & Render Pending Registrations
async function loadPendingRegistrations() {
  const grid = document.getElementById('pending-registrations-grid');
  if (!grid) return;

  const { data: pending, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .eq('is_approved', false);

  if (error || !pending || pending.length === 0) {
    grid.innerHTML = `<p class="text-gray-400 text-xs col-span-full text-center py-4">No registrations waiting for approval.</p>`;
    return;
  }

  grid.innerHTML = pending.map(c => `
    <div class="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2">
      <h4 class="font-extrabold text-gray-900 text-sm">${c.full_name}</h4>
      <p class="text-xs text-gray-600">${c.email} • ${c.phone}</p>
      <p class="text-xs text-gray-600">📍 Address: ${c.hostel_address || 'N/A'}</p>
      <p class="text-[10px] text-gray-400">Metadata: GPS (${c.live_lat || 'N/A'}, ${c.live_lng || 'N/A'}) | IP: ${c.ip_address || 'N/A'}</p>
      
      <div class="flex gap-2 pt-2 border-t border-amber-200">
        <button onclick="approveRegistration('${c.id}')" class="flex-1 bg-swiggy hover:bg-orange-600 text-white font-bold py-1.5 rounded-lg text-xs">
          Approve
        </button>
        <button onclick="rejectRegistration('${c.id}')" class="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs">
          Reject
        </button>
      </div>
    </div>
  `).join('');
}

// 2. Fetch & Render Approved Customers
async function loadApprovedCustomers() {
  const grid = document.getElementById('customers-list-grid');
  if (!grid) return;

  const { data: customers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .eq('is_approved', true);

  const cxCount = document.getElementById('cx-count');
  if (cxCount) cxCount.innerText = `${customers ? customers.length : 0} Customers`;

  if (!customers || customers.length === 0) {
    grid.innerHTML = `<p class="text-gray-400 text-xs col-span-full text-center py-4">No active customer profiles.</p>`;
    return;
  }

  grid.innerHTML = customers.map(c => `
    <div class="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
      <h4 class="font-extrabold text-gray-900 text-sm">${c.full_name}</h4>
      <p class="text-xs text-gray-500">${c.email} • ${c.phone}</p>
      <div class="flex gap-2 pt-2 border-t border-gray-100">
        <button onclick="toggleCustomerStatus('${c.id}', false)" class="flex-1 text-xs border border-gray-300 rounded-lg py-1 font-semibold">
          Deactivate
        </button>
        <button onclick="deleteCustomerAccount('${c.id}')" class="bg-red-600 text-white text-xs px-3 py-1 rounded-lg font-bold">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

// Actions
window.approveRegistration = async function(id) {
  await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
  alert("🎉 Customer approved successfully!");
  loadPendingRegistrations();
  loadApprovedCustomers();
};

window.rejectRegistration = async function(id) {
  if (confirm("Reject and delete this registration?")) {
    await supabase.from('profiles').delete().eq('id', id);
    loadPendingRegistrations();
  }
};

window.toggleCustomerStatus = async function(id, status) {
  await supabase.from('profiles').update({ is_approved: status }).eq('id', id);
  loadApprovedCustomers();
};

window.deleteCustomerAccount = async function(id) {
  if (confirm("Permanently delete this customer account?")) {
    await supabase.from('profiles').delete().eq('id', id);
    loadApprovedCustomers();
  }
};