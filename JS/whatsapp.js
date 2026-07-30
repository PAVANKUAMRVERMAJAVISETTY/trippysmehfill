// ==========================================================
// JS/whatsapp.js - WHATSAPP FEEDBACK ROUTER
// ==========================================================
export function triggerWhatsAppFeedback(phone, customerName, orderId) {
  try {
    const domain = window.location.origin;
    const feedbackUrl = `${domain}/Pages/feedback.html?order=${orderId}`;

    const message = `Hi ${customerName}! 🍗 Thank you for ordering from Trippy's Mehfill ❤️ Hope you enjoyed your delicious meal! Please rate your experience with us here: ${feedbackUrl}`;

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  } catch (error) {
    console.error("WhatsApp trigger failed: ", error);
  }
}
