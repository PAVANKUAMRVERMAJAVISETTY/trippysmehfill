import { supabase } from './api.js';
import './style.css';

let kitchenCoords = { lat: 28.2631, lng: 77.0833, maxRadius: 15 };
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  initKitchenSettings();
  loadMenu();
  setupOrderHandler();
});

// 1. Fetch kitchen coordinates from Supabase
async function initKitchenSettings() {
  try {
    const { data } = await supabase.from('kitchen_settings').select('*').single();
    if (data) {
      kitchenCoords = {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        maxRadius: parseFloat(data.max_cod_radius_km)
      };
    }
  } catch (err) {
    console.log("Using default kitchen coordinates");
  }
}

// 2. Haversine Distance Calculator (in KM)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// 3. Direct UPI Payment Intent Handler (Opens Google Pay / PhonePe / Paytm)
window.payOnlineUPI = function(amount, orderId) {
  const upiId = "7671018717-2@ybl";
  const name = "Trippys Mehfill";
  
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Order #' + (orderId || 'TM'))}`;
  window.location.href = upiUrl;
};

// 4. Capture Live Customer Location & Verify Distance
window.verifyDeliveryDistance = function() {
  const statusBox = document.getElementById('location-status');
  if (!statusBox) return;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        
        const distKm = calculateDistance(userLat, userLng, kitchenCoords.lat, kitchenCoords.lng);
        const distFormatted = distKm.toFixed(1);

        const btnCod = document.getElementById('btn-cod');

        if (distKm <= kitchenCoords.maxRadius) {
          statusBox.innerHTML = `
            <div class="text-green-700 bg-green-50 p-2 rounded-lg text-xs font-bold">
              Live location captured ✓ (${distFormatted} km from kitchen)
            </div>`;
          if (btnCod) btnCod.disabled = false;
        } else {
          statusBox.innerHTML = `
            <div class="text-red-600 bg-red-50 p-2 rounded-lg text-xs font-bold">
              ⚠️ You are ${distFormatted} km away (outside the ${kitchenCoords.maxRadius} km COD zone). Please pay online.
            </div>`;
          if (btnCod) btnCod.disabled = true;
        }
      },
      (err) => {
        statusBox.innerHTML = `<span class="text-red-500 text-xs">GPS error: ${err.message}</span>`;
      }
    );
  }
};

// 5. Load Menu Items from Supabase
async function loadMenu() {
  const container = document.getElementById('menu-container');
  if (!container) return;

  try {
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true);

    if (error) throw error;

    if (!menuItems || menuItems.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-center col-span-2 py-4">No menu items available right now.</p>`;
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

// 6. Add Item to Cart
window.addToCart = function(id, name, price) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, price, qty: 1 });
  }
  renderCart();
};

// 7. Render Cart Details
function renderCart() {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const billSubtotal = document.getElementById('bill-subtotal');
  const billTotal = document.getElementById('bill-total');

  let totalItems = 0;
  let totalAmount = 0;

  if (!cartItemsContainer) return;

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

  if (cartCount) cartCount.innerText = `${totalItems} Items`;
  if (billSubtotal) billSubtotal.innerText = `₹${totalAmount}`;
  if (billTotal) billTotal.innerText = `₹${totalAmount}`;
}

// 8. Setup Order Placement Handler
function setupOrderHandler() {
  const btn = document.getElementById('btn-place-order');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const phone = document.getElementById('cust-phone')?.value.trim();
    const name = document.getElementById('cust-name')?.value.trim();
    const address = document.getElementById('cust-address')?.value.trim();
    const landmark = document.getElementById('cust-landmark')?.value;
    const notes = document.getElementById('custom-notes')?.value.trim();

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