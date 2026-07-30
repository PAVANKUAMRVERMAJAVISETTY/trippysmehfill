import { supabase } from './api.js';
import { showToast } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
  loadPendingRegistrations();
  loadApprovedCustomers();
});

// 1. Fetch & Render Pending Registrations
async function loadPendingRegistrations() {
  const grid = document.getElementById('pending-registrations-grid');
  if (!grid) return;
  grid.innerHTML = `<p class="text-gray-400 text-xs text-center col-span-full py-4">Loading pending registrations...</p>`;

  try {
    const { data: pending, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .eq('is_approved', false);

    if (error) throw error;

    if (!pending || pending.length === 0) {
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
          <button data-id="${c.id}" class="approve-btn flex-1 bg-swiggy hover:bg-orange-600 text-white font-bold py-1.5 rounded-lg text-xs">Approve</button>
          <button data-id="${c.id}" class="reject-btn bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs">Reject</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners for dynamically created buttons
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        btn.disabled = true;
        try {
          await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
          showToast('Customer approved');
          loadPendingRegistrations();
          loadApprovedCustomers();
        } catch (err) {
          console.error('Approve error', err);
          showToast('Approve failed', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        if (!confirm('Reject and delete this registration?')) return;
        btn.disabled = true;
        try {
          await supabase.from('profiles').delete().eq('id', id);
          showToast('Registration rejected and deleted');
          loadPendingRegistrations();
        } catch (err) {
          console.error('Reject error', err);
          showToast('Reject failed', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });

  } catch (err) {
    console.error('Load pending registrations failed:', err);
    grid.innerHTML = `<p class="text-gray-400 text-xs col-span-full text-center py-4">Failed to load pending registrations.</p>`;
    showToast('Failed to load pending registrations', 'error');
  }
}

// 2. Fetch & Render Approved Customers
async function loadApprovedCustomers() {
  const grid = document.getElementById('customers-list-grid');
  if (!grid) return;
  grid.innerHTML = `<p class="text-gray-400 text-xs text-center col-span-full py-4">Loading customer records...</p>`;

  try {
    const { data: customers, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .eq('is_approved', true);

    if (error) throw error;

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
          <button data-id="${c.id}" class="deactivate-btn flex-1 text-xs border border-gray-300 rounded-lg py-1 font-semibold">Deactivate</button>
          <button data-id="${c.id}" class="delete-customer-btn bg-red-600 text-white text-xs px-3 py-1 rounded-lg font-bold">Delete</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.deactivate-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        btn.disabled = true;
        try {
          await supabase.from('profiles').update({ is_approved: false }).eq('id', id);
          showToast('Customer deactivated');
          loadApprovedCustomers();
        } catch (err) {
          console.error('Deactivate error', err);
          showToast('Deactivate failed', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });

    document.querySelectorAll('.delete-customer-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        if (!confirm('Permanently delete this customer account?')) return;
        btn.disabled = true;
        try {
          await supabase.from('profiles').delete().eq('id', id);
          showToast('Customer deleted');
          loadApprovedCustomers();
        } catch (err) {
          console.error('Delete customer error', err);
          showToast('Delete failed', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });

  } catch (err) {
    console.error('Load approved customers failed:', err);
    grid.innerHTML = `<p class="text-gray-400 text-xs col-span-full text-center py-4">Failed to load customer records.</p>`;
    showToast('Failed to load customer records', 'error');
  }
}
