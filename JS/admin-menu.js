import { supabase } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();

  document.getElementById("btn-save-dish")?.addEventListener("click", saveDish);
  document.getElementById("btn-cancel-edit")?.addEventListener("click", resetForm);
});

async function loadMenu() {
  const container = document.getElementById("admin-menu-list");
  if (!container) return;

  const { data: items, error } = await supabase.from('menu_items').select('*');

  if (error || !items || items.length === 0) {
    container.innerHTML = `<p class="text-gray-400 text-center py-6">No dishes found in database.</p>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="flex justify-between items-center bg-white p-4 rounded-xl border border-amber-100 text-xs md:text-sm">
      <div class="flex items-center space-x-3">
        ${item.image_url ? `<img src="${item.image_url}" class="w-12 h-12 object-cover rounded-lg">` : `<div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center font-bold text-amber-900">🍽️</div>`}
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
}

async function saveDish() {
  const name = document.getElementById("dish-name").value.trim();
  const price = parseFloat(document.getElementById("dish-price").value);
  const desc = document.getElementById("dish-desc")?.value.trim();
  const fileInput = document.getElementById("dish-file");

  if (!name || isNaN(price)) return alert("Please enter valid name & price!");

  let imageUrl = null;

  // Upload photo to 'menu-bucket' if selected
  if (fileInput && fileInput.files[0]) {
    const file = fileInput.files[0];
    const fileName = `${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('menu-bucket')
      .upload(fileName, file);

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from('menu-bucket')
        .getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;
    }
  }

  const { error } = await supabase.from('menu_items').insert([{
    name,
    price,
    description: desc,
    image_url: imageUrl,
    is_available: true
  }]);

  if (error) {
    alert("Error saving dish: " + error.message);
  } else {
    alert("🎉 Dish added with photo!");
    resetForm();
    loadMenu();
  }
}

window.deleteDish = async function(id) {
  if (confirm("Delete this dish?")) {
    await supabase.from('menu_items').delete().eq('id', id);
    loadMenu();
  }
};

function resetForm() {
  document.getElementById("dish-name").value = "";
  document.getElementById("dish-price").value = "";
  if (document.getElementById("dish-desc")) document.getElementById("dish-desc").value = "";
}