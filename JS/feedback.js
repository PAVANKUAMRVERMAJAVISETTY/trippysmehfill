import { supabase } from "./api.js";

let selectedRating = 5;

document.querySelectorAll("#star-rating span").forEach(star => {
  star.addEventListener("click", (e) => {
    selectedRating = Number(e.target.dataset.star);
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
    const { error } = await supabase.from('feedback').insert([{
      order_id: orderId,
      rating: selectedRating,
      comment: comment || "No comments"
    }]);

    if (error) throw error;

    alert("🎉 Thank you for your feedback!");
    window.location.href = "/index.html";
  } catch (err) {
    alert("Feedback submission failed: " + err.message);
  }
});