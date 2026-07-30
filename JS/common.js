// ==========================================================
// JS/common.js - UI UTILITIES & AUDIO ALERTS
// ==========================================================
export function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-5 right-5 z-50 text-white font-bold px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-0 ${
    type === "error" ? "bg-red-600" : "bg-green-700"
  }`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function playOrderChime() {
  try {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.play();
  } catch (e) {
    console.log("Audio alert muted");
  }
}

export function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}
