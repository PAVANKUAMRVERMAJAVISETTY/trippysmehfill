import { rupees } from "@/lib/session";

function normalise(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${normalise(phone)}?text=${encodeURIComponent(message)}`;
}

export type ReceiptOrder = {
  order_no: number;
  customer_name: string;
  items: { name: string; qty: number }[];
  subtotal?: number | null;
  delivery_fee?: number | null;
  tax?: number | null;
  total: number;
  eta_minutes?: number | null;
  payment_ref?: string | null;
};

/** Trigger 1 — payment success receipt. */
export function paymentReceiptMessage(o: ReceiptOrder) {
  const items = (o.items ?? []).map((i) => `• ${i.name} × ${i.qty}`).join("\n");
  return [
    `*Trippy's Mehfill — Hyderabad's Cloud Kitchen*`,
    ``,
    `Hello ${o.customer_name}, your payment is confirmed. 🎉`,
    `Order *#${o.order_no}*`,
    ``,
    items,
    ``,
    `Item total: ${rupees(Number(o.subtotal ?? o.total))}`,
    `Delivery: ${rupees(Number(o.delivery_fee ?? 0))}`,
    `Taxes: ${rupees(Number(o.tax ?? 0))}`,
    `*Paid: ${rupees(Number(o.total))}*`,
    o.payment_ref ? `UPI Ref: ${o.payment_ref}` : ``,
    ``,
    `Estimated delivery: ${o.eta_minutes ?? 35} minutes.`,
    `Thank you for ordering with us!`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Trigger 2 — delivered thank-you + feedback link. */
export function deliveredMessage(o: { order_no: number; customer_name: string }, feedbackLink: string) {
  return [
    `*Trippy's Mehfill*`,
    ``,
    `Hello ${o.customer_name}, order #${o.order_no} has been delivered. 🙏`,
    `We hope every bite was memorable.`,
    ``,
    `Please rate your experience here:`,
    feedbackLink,
  ].join("\n");
}
