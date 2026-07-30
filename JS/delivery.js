// ==========================================================
// JS/delivery.js - DELIVERY DRIVER DISPATCH QUEUE
// ==========================================================
import { db, auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { API } from "./api.js";
import { showToast, formatCurrency } from "./common.js";
import { triggerWhatsAppFeedback } from "./whatsapp.js";

let currentDriver = null;

document.getElementById("btn-driver-login")?.addEventListener("click", async () => {
  const inputUserId = document.getElementById("delivery-username")?.value.trim();
  const inputPass = document.getElementById("delivery-pass")?.value.trim();

  if (!inputUserId || !inputPass) return alert("Please enter User ID and Password!");

  try {
    let email = inputUserId;
    if (!email.includes("@")) {
      email = `${email.toLowerCase()}@trippysmehfill.com`;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, inputPass);
    const user = userCredential.user;

    const userDocRef = doc(db, "staff", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const match = userDoc.data();
      const role = (match.role || "").toLowerCase().trim();

      if (role === "driver" || role === "delivery boy") {
        currentDriver = match;
        document.getElementById("delivery-login-box")?.classList.add("hidden");
        document.getElementById("delivery-main-content")?.classList.remove("hidden");
        
        if (document.getElementById("driver-welcome-name")) {
          document.getElementById("driver-welcome-name").innerText = `Welcome, ${match.name}`;
        }
        showToast(`Logged in as ${match.name}!`);
        loadDriverOrders();
      } else {
        alert("Access Denied: Account role mismatch.");
      }
    } else {
      alert("Database lookup failed.");
    }
  } catch (error) {
    console.error("Driver Auth Error:", error.message);
    alert(`Authentication Failed: ${error.message}`);
  }
});

async function loadDriverOrders() {
  if (!currentDriver) return;

  const container = document.getElementById("driver-assigned-cards");
  if (!container) return;

  container.innerHTML = `<p class="col-span-2 text-amber-800 text-center py-4 font-bold">🔍 Fetching active deliveries...</p>`;

  API.orders.subscribe((orders) => {
    const driverOrders = orders.filter(o => o.assignedDriver === currentDriver.name);
    const pendingDeliveries = driverOrders.filter(o => o.status === "OUT FOR DELIVERY" || o.status === "Out For Delivery");
    const completedDeliveries = driverOrders.filter(o => o.status === "DELIVERED");

    const totalCashCollected = completedDeliveries.reduce((sum, o) => sum + (o.amount || 0), 0);

    if (document.getElementById("driver-total-cash")) {
      document.getElementById("driver-total-cash").innerText = formatCurrency(totalCashCollected);
    }

    if (pendingDeliveries.length === 0) {
      container.innerHTML = `<div class="col-span-2 bg-white p-6 rounded-xl text-center text-gray-400 border">No active deliveries assigned right now!</div>`;
      return;
    }

    container.innerHTML = pendingDeliveries.map(o => `
      <div class="bg-white p-4 rounded-xl shadow border space-y-3 border-l-4 border-amber-800 text-xs md:text-sm">
        <div class="flex justify-between items-start border-b pb-2">
          <div>
            <span class="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs">#${o.orderId || o.phone}</span>
            <h3 class="font-bold text-base mt-1 text-gray-900">${o.name}</h3>
            <p class="text-xs text-amber-900 font-bold mt-0.5">📱 Mobile: ${o.phone}</p>
          </div>
          <span class="text-xs text-gray-400 font-semibold">${o.time || ''}</span>
        </div>

        <div class="text-xs space-y-1 text-gray-700">
          <p><b>Campus:</b> ${o.campus || 'N/A'}</p>
          <p><b>Address:</b> ${o.address || 'N/A'}</p>
          <p><b>Items:</b> ${o.items ? o.items.map(i => `${i.name} (x${i.qty})`).join(', ') : 'N/A'}</p>
        </div>

        <div class="p-2 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
          <span class="text-xs font-bold text-green-900">Collect Cash (COD):</span>
          <span class="text-lg font-black text-green-700">${formatCurrency(o.amount)}</span>
        </div>

        <button data-id="${o.id}" data-phone="${o.phone}" data-name="${o.name}" class="btn-complete-delivery w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg text-xs transition">
          ✔ Mark Delivered & Send WhatsApp Rating
        </button>
      </div>
    `).join("");

    document.querySelectorAll(".btn-complete-delivery").forEach(btn => {
      btn.addEventListener("click", async () => {
        const firebaseId = btn.dataset.id;
        const phone = btn.dataset.phone;
        const name = btn.dataset.name;

        if (confirm("Mark order as DELIVERED and Cash Collected?")) {
          try {
            await API.orders.update(firebaseId, { status: "DELIVERED", deliveredAt: new Date().toISOString() });
            showToast("✔ Delivery Completed!");
            triggerWhatsAppFeedback(phone, name, firebaseId);
          } catch (err) {
            alert("Status update failed.");
          }
        }
      });
    });
  });
}
