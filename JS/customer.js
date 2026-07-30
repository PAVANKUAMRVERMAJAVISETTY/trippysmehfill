// ==========================================================
// JS/customer.js - CUSTOMER SHOPPING CART & PORTAL
// ==========================================================
import { API } from "./api.js";
import { showToast, formatCurrency } from "./common.js";

let cart = [];

async function initCustomerPortal() {
  try {
    const special = await API.specialDish.get();
    const bannerTitle = document.getElementById("banner-title");
    const bannerDesc = document.getElementById("banner-desc");
    if (bannerTitle) bannerTitle.innerText = special.title || "Special Hyderabadi Dum Biryani";
    if (bannerDesc) bannerDesc.innerText = special.desc || "Freshly Cooked Saffron Rice";

    const menuItems = await API.menu.getAll();
    const activeItems = menuItems.filter(i => i.isEnabled !== false);
    
    const grid = document.getElementById("menu-container");
    if (!grid) return;

    grid.innerHTML = activeItems.map(item => {
      const isVeg = item.category === "Veg";
      return `
        <div class="bg-white p-4 rounded-xl shadow-sm border flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start">
              <h3 class="font-bold text-gray-900">${item.name}</h3>
              <span class="font-extrabold text-amber-800">${formatCurrency(item.price)}</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">${item.desc || 'Prepared fresh upon ordering'}</p>
            <span class="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded ${isVeg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              ${isVeg ? '🟢 VEG' : '🔴 NON-VEG'}
            </span>
          </div>
          <button data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" class="btn-add-cart mt-3 w-full bg-amber-100 hover:bg-amber-800 hover:text-white text-amber-900 font-bold py-1.5 rounded-lg text-xs transition">
            + Add to Order
          </button>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".btn-add-cart").forEach(btn => {
      btn.addEventListener("click", () => addToCart(btn.dataset.id, btn.dataset.name, Number(btn.dataset.price)));
    });

    const placeOrderBtn = document.getElementById("btn-place-order");
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener("click", submitCustomerOrder);
    }
  } catch (error) {
    console.error("Failed to load customer portal: ", error);
  }
}

function addToCart(id, name, price) {
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, name, price, qty: 1 });
  renderCart();
  showToast(`${name} added to cart!`);
}

function renderCart() {
  const list = document.getElementById("cart-items");
  const count = document.getElementById("cart-count");
  const totalBillEl = document.getElementById("bill-total");
  const subtotalBillEl = document.getElementById("bill-subtotal");

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const totalBill = cart.reduce((s, i) => s + (i.price * i.qty), 0);

  if (count) count.innerText = `${totalQty} Items`;
  if (totalBillEl) totalBillEl.innerText = formatCurrency(totalBill);
  if (subtotalBillEl) subtotalBillEl.innerText = formatCurrency(totalBill);

  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `<p class="text-gray-400 text-center py-4 text-xs">Your cart is empty. Add items from the menu!</p>`;
    return;
  }

  list.innerHTML = cart.map(i => `
    <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-xs">
      <div>
        <p class="font-bold text-gray-800">${i.name}</p>
        <p class="text-gray-500">${formatCurrency(i.price)} × ${i.qty}</p>
      </div>
      <div class="flex items-center space-x-1">
        <button onclick="updateCartQty('${i.id}', -1)" class="w-5 h-5 bg-gray-200 rounded font-bold text-xs">-</button>
        <span class="text-xs font-bold px-1">${i.qty}</span>
        <button onclick="updateCartQty('${i.id}', 1)" class="w-5 h-5 bg-gray-200 rounded font-bold text-xs">+</button>
      </div>
    </div>
  `).join("");
}

window.updateCartQty = function(itemId, delta) {
  const item = cart.find(c => c.id === itemId);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(c => c.id !== itemId);
  }
  renderCart();
};

async function submitCustomerOrder() {
  const phone = document.getElementById("cust-phone").value.trim();
  const name = document.getElementById("cust-name").value.trim();
  const landmarkSelect = document.getElementById("cust-landmark").value;
  const otherLandmark = document.getElementById("cust-other-landmark") ? document.getElementById("cust-other-landmark").value.trim() : "";
  const address = document.getElementById("cust-address").value.trim();
  const customNotes = document.getElementById("custom-notes") ? document.getElementById("custom-notes").value.trim() : "";

  if (!phone || phone.length < 10) return alert("Please enter a valid 10-digit mobile number.");
  if (!name) return alert("Please enter your full name.");
  if (!address) return alert("Please specify your delivery address.");
  if (cart.length === 0) return alert("Your order cart is empty!");

  const finalLandmark = landmarkSelect === 'Other' ? (otherLandmark || 'Other Area') : landmarkSelect;
  const totalAmount = cart.reduce((s, i) => s + (i.price * i.qty), 0);

  const newOrder = {
    orderId: phone,
    phone,
    name,
    campus: finalLandmark,
    address,
    notes: customNotes || "None",
    items: [...cart],
    amount: totalAmount,
    assignedDriver: "",
    status: "PENDING",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toISOString().split('T')[0]
  };

  try {
    await API.orders.create(newOrder);
    showToast(`Order #${phone} Placed Successfully!`);
    cart = [];
    renderCart();

    document.getElementById("cust-phone").value = "";
    document.getElementById("cust-name").value = "";
    document.getElementById("cust-address").value = "";
    if (document.getElementById("custom-notes")) document.getElementById("custom-notes").value = "";
  } catch (error) {
    alert("Database connection failed. Please try again.");
    console.error(error);
  }
}

initCustomerPortal();
