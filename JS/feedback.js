// ==========================================================
// JS/feedback.js - CUSTOMER RATING FORM
// ==========================================================
import { API } from "./api.js";
import { showToast } from "./common.js";

let selectedRating = 5;

document.querySelectorAll("#star-rating span").forEach(star => {
  star.addEventListener("click", (e) => {
    selectedRating = Number(e.target.dataset.star);
    showToast(`Selected ${selectedRating} Stars`);
    
    // Visually fill stars
    document.querySelectorAll("#star-rating span").forEach(s => {
      const starVal = Number(s.dataset.star);
      s.innerText = starVal <= selectedRating ? "★" : "☆";
    });
  });
});

document.getElementById("btn-submit-feedback")?.addEventListener("click", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("order") || "Direct";
  const comment = document.getElementById("feedback-comments") ? document.getElementById("feedback-comments").value.trim() : "";

  try {
    await API.feedback.create({
      orderId,
      rating: selectedRating,
      comment: comment || "No comments"
    });

    alert("🎉 Thank you for your feedback! Hope to feed you again soon!");
    window.location.href = "../index.html";
  } catch (err) {
    alert("Feedback submission failed: " + err.message);
  }
});
