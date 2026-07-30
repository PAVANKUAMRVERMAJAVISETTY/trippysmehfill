import { supabase } from './api.js';

let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  loadMenu();
  setupOrderHandler();
});

// 1. Fetch Menu Items from Supabase
async function loadMenu() {
  const container = document.getElementById('menu-container');
  if (!container) return;

  try {
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('*');

    if (error) throw error;

    if (!menuItems || menuItems.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-center col-span-2 py-4">No menu items found in database.</p>`;
      return;
    }

    container.innerHTML = menuItems.map(item => `
      <div class="bg-white p-4 rounded-xl shadow-sm border border-amber-100 flex justify-between items-center">
        <div>
          <h3 class="font-bold text-amber-950">${item.name}</h3>
          <p class="text-xs text-gray-500">${item.description || ''}</p>
          <span class="text-sm font-bold text-amber-800">₹${item.price}</span>
        </div>
        <button onclick="addToCart('${item.id}', '${item.name}', ${item.price})" class="bg-amber-800 hover:bg-amber-900 text-white text-xs px-3 py-2 rounded-lg font-bold">
          + Add
        </button>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading menu:', err);
    container.innerHTML = `<p class="text-red-500 text-center col-span-2 py-4">Failed to load menu: ${err.message}</p>`;
  }
}

// 2. Add Item to Cart
window.addToCart = function(id, name, price) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, price, qty: 1 });
  }
  renderCart();
};

// 3. Render Cart Details
function renderCart() {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const billSubtotal = document.getElementById('bill-subtotal');
  const billTotal = document.getElementById('bill-total');

  let totalItems = 0;
  let totalAmount = 0;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `<p class="text-gray-400 text-center py-4">Your cart is empty. Add items from the menu!</p>`;
  } else {
    cartItemsContainer.innerHTML = cart.map(item => {
      totalItems += item.qty;
      totalAmount += item.price * item.qty;
      return `
        <div class="flex justify-between items-center py-1">
          <span>${item.name} x ${item.qty}</span>
          <span class="font-bold">₹${item.price * item.qty}</span>
        </div>
      `;
    }).join('');
  }

  cartCount.innerText = `${totalItems} Items`;
  billSubtotal.innerText = `₹${totalAmount}`;
  billTotal.innerText = `₹${totalAmount}`;
}

// 4. Place Order in Supabase
function setupOrderHandler() {
  const btn = document.getElementById('btn-place-order');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const phone = document.getElementById('cust-phone').value.trim();
    const name = document.getElementById('cust-name').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const landmark = document.getElementById('cust-landmark').value;
    const notes = document.getElementById('custom-notes').value.trim();

    if (!phone || !name || !address) {
      alert('Please fill in your Phone, Name, and Address before placing an order.');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          customer_name: name,
          customer_phone: phone,
          delivery_address: address,
          landmark: landmark,
          notes: notes,
          items: cart,
          total_amount: totalAmount,
          status: 'pending'
        }]);

      if (error) throw error;

      alert('🎉 Order Placed Successfully!');
      cart = [];
      renderCart();
    } catch (err) {
      alert('Order Failed: ' + err.message);
    }
  });
}