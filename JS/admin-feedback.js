// ==========================================================
// JS/admin-feedback.js - FEEDBACK LOG CONTROLLER
// ==========================================================
import { API } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  loadFeedbackRegistry();
});

async function loadFeedbackRegistry() {
  const container = document.getElementById("feedback-log-container");
  if (!container) return;

  try {
    const list = await API.feedback.getAll();

    if (list.length === 0) {
      container.innerHTML = `<p class="text-gray-400 text-center py-6 col-span-2 font-bold">No feedback logs found in cloud database.</p>`;
      return;
    }

    // Sort newest ratings first
    const sorted = list.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

    container.innerHTML = sorted.map(f => `
      <div class="bg-white p-5 rounded-2xl shadow border border-amber-100 space-y-2 text-xs md:text-sm">
        <div class="flex justify-between items-center font-bold border-b pb-2 border-gray-100">
          <span class="text-amber-950 font-black">Order #${f.orderId || 'Direct'}</span>
          <span class="text-yellow-500 text-lg">${"★".repeat(f.rating)}${"☆".repeat(5 - f.rating)}</span>
        </div>
        <p class="text-gray-600 font-semibold italic">"${f.comment || 'No comment left'}"</p>
        <p class="text-[10px] text-gray-400 text-right">Submitted: ${f.submittedAt ? f.submittedAt.split('T')[0] : 'N/A'}</p>
      </div>
    `).join("");

  } catch (error) {
    console.error("Failed to load feedback logs:", error);
    container.innerHTML = `<p class="text-red-600 font-bold text-center col-span-2">Database lookup failed.</p>`;
  }
}
