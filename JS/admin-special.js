// ==========================================================
// JS/admin-special.js - DYNAMIC DISH BANNER
// ==========================================================
import { API } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  loadCurrentSpecialBanner();

  const saveBtn = document.getElementById("btn-save-special");
  if (saveBtn) saveBtn.addEventListener("click", saveDailySpecial);
});

async function loadCurrentSpecialBanner() {
  try {
    const specialData = await API.specialDish.get();

    const titleEl = document.getElementById('preview-special-title');
    const offerEl = document.getElementById('preview-special-offer');
    const inputTitle = document.getElementById('input-special-title');
    const inputOffer = document.getElementById('input-special-offer');

    const title = specialData.title || "Special Hyderabadi Keema Khichdi & Dum Biryani Combo!";
    const offer = specialData.offer || specialData.desc || "Freshly Prepared • Authentic Flavors • Fast Campus Delivery";

    if (titleEl) titleEl.innerText = title;
    if (offerEl) offerEl.innerText = offer;

    if (inputTitle) inputTitle.value = specialData.title || "";
    if (inputOffer) inputOffer.value = offer;
  } catch (error) {
    console.error("Failed to load special banner: ", error);
  }
}

async function saveDailySpecial() {
  const newTitle = document.getElementById('input-special-title').value.trim();
  const newOffer = document.getElementById('input-special-offer').value.trim();

  if (!newTitle) return alert("Please enter a Dish Headline!");

  const updatedData = {
    title: newTitle,
    offer: newOffer || "Freshly Prepared • Authentic Flavors • Fast Campus Delivery",
    desc: newOffer || "Freshly Prepared • Authentic Flavors • Fast Campus Delivery"
  };

  try {
    await API.specialDish.update(updatedData);
    alert("🚀 Today's Special Banner updated live on the website!");
    loadCurrentSpecialBanner();
  } catch (error) {
    alert("Database save failed: " + error.message);
  }
}
