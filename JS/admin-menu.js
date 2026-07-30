import { supabase } from "./api.js";
import { showToast } from "./common.js";

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();

  const saveBtn = document.getElementById("btn-save-dish");
  saveBtn?.addEventListener("click", saveDish);
  // optional cancel button may not exist in UI
  document.getElementById("btn-cancel-edit")?.addEventListener("click", resetForm);
});

async function loadMenu() {
  const container = document.getElementById("admin-menu-list");
  if (!container) return;

  container.innerHTML = `<p class="text-gray-400 text-center py-6">Loading menu items...</p>`;

  try {
    const { data: items, error } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });

    if (error || !items || items.length === 0) {
      container.innerHTML = `<p class="text-gray-400 text-center py-6">No dishes found in database.</p>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="flex justify-between items-center bg-white p-4 rounded-xl border border-amber-100 text-xs md:text-sm">
        <div class="flex items-center space-x-3">
          ${item.image_url ? `<img src="${item.image_url}" class="w-12 h-12 object-cover rounded-lg" alt="${item.name}">` : `<div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center font-bold text-amber-700">NO</div>`}
          <div>
            <span class="font-bold text-gray-900">${item.name}</span>
            <p class="text-xs text-gray-500">${item.description || ''}</p>
            <p class="text-xs font-extrabold text-amber-900">₹${item.price}</p>
          </div>
        </div>
        <div class="flex space-x-2">
          <button onclick="deleteDish('${item.id}')" class="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg text-xs">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Load menu failed', err);
    container.innerHTML = `<p class="text-gray-400 text-center py-6">Failed to load menu items.</p>`;
    showToast('Failed to load menu items', 'error');
  }
}

async function saveDish() {
  const saveBtn = document.getElementById("btn-save-dish");
  const nameEl = document.getElementById("dish-name");
  const priceEl = document.getElementById("dish-price");
  const descEl = document.getElementById("dish-desc");
  const fileInput = document.getElementById("dish-file");

  if (!nameEl || !priceEl) return showToast('Form fields missing', 'error');

  const name = nameEl.value.trim();
  const price = parseFloat(priceEl.value);
  const desc = descEl ? descEl.value.trim() : '';

  if (!name || isNaN(price)) return showToast('Please enter a valid name and price', 'error');

  let imageUrl = null;

  try {
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const fileName = `${Date.now()}_${file.name}`;

      // Disable save button during upload
      if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = 'Uploading...'; }

      const { error: uploadError } = await supabase.storage.from('menu-bucket').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('menu-bucket').getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from('menu_items').insert([{
      name,
      price,
      description: desc,
      image_url: imageUrl,
      is_available: true
    }]);

    if (error) throw error;

    showToast('Dish added successfully');
    resetForm();
    loadMenu();
  } catch (err) {
    console.error('Save dish failed', err);
    showToast('Failed to save dish: ' + (err.message || err), 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = '💾 Save Dish to Supabase Menu'; }
  }
}

window.deleteDish = async function(id) {
  if (!confirm('Delete this dish?')) return;
  try {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
    showToast('Dish deleted');
    loadMenu();
  } catch (err) {
    console.error('Delete dish failed', err);
    showToast('Delete failed', 'error');
  }
};

function resetForm() {
  const name = document.getElementById("dish-name");
  const price = document.getElementById("dish-price");
  const desc = document.getElementById("dish-desc");
  const fileInput = document.getElementById("dish-file");
  if (name) name.value = '';
  if (price) price.value = '';
  if (desc) desc.value = '';
  if (fileInput) fileInput.value = '';
}
