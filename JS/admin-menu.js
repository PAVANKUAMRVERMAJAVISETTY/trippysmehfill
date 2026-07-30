// ==========================================================
// JS/admin-menu.js - MENU MANAGEMENT CONTROLLER
// ==========================================================
import { API } from "./api.js";

const DEFAULT_MENU = [
  { id: 'M1', name: 'Veg Khichdi Katta', price: 150, desc: 'Turmeric ghee-tempered khichdi rice, soft curry & papad.', category: 'Veg' },
  { id: 'M2', name: 'Paneer Biryani (Veg)', price: 190, desc: 'Paneer cubes layered in saffron basmati rice with fried onions.', category: 'Veg' },
  { id: 'M3', name: 'Chicken Keema Katta', price: 170, desc: 'Minced chicken simmered in rich spiced masala over rice.', category: 'Non-Veg' },
  { id: 'M4', name: 'Chicken Dum Biryani', price: 180, desc: 'Slow-cooked on dum with tender chicken, boiled egg & mint.', category: 'Non-Veg' },
  { id: 'M5', name: 'Chicken Fry Piece Biryani', price: 190, desc: 'Golden fried chicken pieces over fragrant basmati rice.', category: 'Non-Veg' },
  { id: 'M6', name: "Trippy's SP Chicken Biryani", price: 220, desc: 'Crispy Chicken-65 masala with boiled egg & smoky dum rice.', category: 'Non-Veg' },
  { id: 'M7', name: 'Chicken 65 Biryani', price: 210, desc: 'Crispy Chicken 65 tossed through smoky rice with curry leaves.', category: 'Non-Veg' }
];

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();

  document.getElementById("btn-save-dish").addEventListener("click", saveDish);
  document.getElementById("btn-cancel-edit").addEventListener("click", resetForm);
  document.getElementById("btn-reset-default-menu").addEventListener("click", seedDefaultMenu);
});

async function loadMenu() {
  const container = document.getElementById("admin-menu-list");
  if (container) container.innerHTML = `<p class="text-gray-400 text-center py-6">Connecting to database...</p>`;
  
  const items = await API.menu.getAll();
  renderMenu(items);
}

function renderMenu(items) {
  const container = document.getElementById("admin-menu-list");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <p class="text-gray-400 text-center py-6">Your menu is currently empty. Click "Restore Default Menu" below or add your first dish above!</p>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const itemEscaped = encodeURIComponent(JSON.stringify(item));
    return `
      <div class="flex flex-wrap justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-sm transition gap-3 text-xs md:text-sm">
        <div class="space-y-1">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-gray-900">${item.name}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${item.category === 'Veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              ${item.category === 'Veg' ? '🟢 Veg' : '🔴 Non-Veg'}
            </span>
            ${item.isEnabled !== false ? 
              `<span class="text-[9px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-bold">Active</span>` : 
              `<span class="text-[9px] bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded font-bold">Hidden</span>`
            }
          </div>
          <p class="text-xs text-gray-500">${item.desc || 'No description provided.'}</p>
          <p class="text-xs font-extrabold text-amber-900">₹${item.price}</p>
        </div>
        <div class="flex space-x-2">
          <button onclick="editDish('${item.id}', '${itemEscaped}')" class="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1.5 rounded-lg text-xs transition">
            📝 Edit
          </button>
          <button onclick="deleteDish('${item.id}')" class="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg text-xs transition">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function saveDish() {
  const name = document.getElementById("dish-name").value.trim();
  const price = parseFloat(document.getElementById("dish-price").value);
  const category = document.getElementById("dish-category").value;
  const isEnabled = document.getElementById("dish-available").value === "true";
  const desc = document.getElementById("dish-desc").value.trim();
  const editId = document.getElementById("edit-item-id").value;

  if (!name || isNaN(price)) {
    alert("Please enter a valid dish name and price!");
    return;
  }

  const itemData = { name, price, category, isEnabled, desc };

  try {
    await API.menu.save(editId || null, itemData);
    alert(editId ? "Dish updated successfully!" : "New dish added to menu!");
    resetForm();
    loadMenu();
  } catch (error) {
    alert("Error saving menu item: " + error.message);
  }
}

window.editDish = function(id, encodedData) {
  const item = JSON.parse(decodeURIComponent(encodedData));
  
  document.getElementById("edit-item-id").value = id;
  document.getElementById("dish-name").value = item.name;
  document.getElementById("dish-price").value = item.price;
  document.getElementById("dish-category").value = item.category;
  document.getElementById("dish-available").value = item.isEnabled !== false ? "true" : "false";
  document.getElementById("dish-desc").value = item.desc || "";

  document.getElementById("form-title").innerText = "📝 Edit Selected Dish";
  document.getElementById("btn-cancel-edit").classList.remove("hidden");
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteDish = async function(id) {
  if (!confirm("Are you sure you want to permanently delete this item?")) return;
  try {
    await API.menu.delete(id);
    alert("Dish removed from menu.");
    loadMenu();
  } catch (error) {
    alert("Deletion failed: " + error.message);
  }
};

async function seedDefaultMenu() {
  if (!confirm("Do you want to restore the default Hyderabadi campus menu items?")) return;
  
  const savePromises = DEFAULT_MENU.map(item => {
    const { id, ...itemData } = item;
    return API.menu.save(id, { ...itemData, isEnabled: true });
  });

  try {
    await Promise.all(savePromises);
    alert("🎉 Default Hyderabadi Menu Restored Successfully!");
    loadMenu();
  } catch (error) {
    alert("Seeding failed: " + error.message);
  }
}

function resetForm() {
  document.getElementById("edit-item-id").value = "";
  document.getElementById("dish-name").value = "";
  document.getElementById("dish-price").value = "";
  document.getElementById("dish-category").value = "Non-Veg";
  document.getElementById("dish-available").value = "true";
  document.getElementById("dish-desc").value = "";

  document.getElementById("form-title").innerText = "➕ Add New Dish to Menu";
  document.getElementById("btn-cancel-edit").classList.add("hidden");
}
