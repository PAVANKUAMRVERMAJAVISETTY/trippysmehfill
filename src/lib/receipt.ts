/**
 * Receipt generation and order sharing.
 *
 * jsPDF is imported dynamically so it stays out of the main bundle -- most
 * customers never download a receipt, and the library is larger than the rest
 * of the checkout put together.
 */

import { Order } from '../types';
import { paymentLabel, statusLabel } from './orderStatus';

export interface ReceiptBusiness {
  name: string;
  upiId?: string;
}

/** Plain-text summary, used for sharing and as the clipboard fallback. */
export function buildOrderShareText(order: Order, business: ReceiptBusiness): string {
  const lines = [
    `${business.name} — Order ${order.order_number}`,
    '',
    ...order.items.map((i) => `${i.quantity} × ${i.dish_name} — ₹${i.price * i.quantity}`),
    '',
    `Total: ₹${order.total_amount}`,
    `Payment: ${order.payment_method} (${paymentLabel(order)})`,
    `Status: ${statusLabel(order.status)}`,
    `Deliver to: ${order.delivery_address}`
  ];
  return lines.join('\n');
}

/**
 * Shares via the Web Share API where available, otherwise copies to the
 * clipboard. Returns what actually happened so the caller can tell the
 * customer the truth rather than always claiming "Shared!".
 */
export async function shareOrder(
  order: Order,
  business: ReceiptBusiness
): Promise<'shared' | 'copied' | 'unavailable'> {
  const text = buildOrderShareText(order, business);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: `Order ${order.order_number}`, text });
      return 'shared';
    } catch (err: any) {
      // The customer dismissing the sheet is not a failure worth reporting.
      if (err?.name === 'AbortError') return 'shared';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      // fall through
    }
  }

  return 'unavailable';
}

/**
 * Shares an image the customer picked (a UPI payment screenshot) alongside the
 * order reference, so the kitchen can match the transfer to the order.
 *
 * Falls back to sharing just the text when the platform cannot share files --
 * `canShare({ files })` is the only reliable test; feature-detecting
 * `navigator.share` alone throws on desktop Chrome.
 */
export async function sharePaymentScreenshot(
  order: Order,
  business: ReceiptBusiness,
  file: File
): Promise<'shared' | 'unsupported'> {
  const text = `Payment for ${business.name} order ${order.order_number} — ₹${order.total_amount}`;

  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ title: `Payment — ${order.order_number}`, text, files: [file] });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'shared';
    }
  }

  return 'unsupported';
}

/**
 * Builds and downloads a one-page PDF receipt.
 *
 * Laid out in millimetres on A4 so it prints correctly rather than only
 * looking right on screen.
 */
export async function downloadReceiptPdf(order: Order, business: ReceiptBusiness): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const LEFT = 18;
  const RIGHT = 192;
  let y = 22;

  const line = () => {
    doc.setDrawColor(210);
    doc.line(LEFT, y, RIGHT, y);
    y += 6;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(business.name, LEFT, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text('Order Receipt', LEFT, y);
  y += 8;
  doc.setTextColor(0);
  line();

  // --- order meta ---
  const meta: [string, string][] = [
    ['Order ID', order.order_number],
    ['Reference', order.id],
    ['Date', order.created_at || '—'],
    ['Status', statusLabel(order.status)],
    ['Payment', `${order.payment_method} — ${paymentLabel(order)}`]
  ];
  if (order.upi_transaction_id) meta.push(['UPI reference', order.upi_transaction_id]);

  doc.setFontSize(10);
  for (const [label, value] of meta) {
    doc.setTextColor(110);
    doc.text(label, LEFT, y);
    doc.setTextColor(0);
    doc.text(String(value), LEFT + 40, y, { maxWidth: RIGHT - LEFT - 40 });
    y += 6;
  }

  y += 2;
  doc.setTextColor(110);
  doc.text('Deliver to', LEFT, y);
  doc.setTextColor(0);
  const address = [order.customer_name, order.customer_phone, order.delivery_address, order.landmark]
    .filter(Boolean)
    .join(', ');
  const addressLines = doc.splitTextToSize(address, RIGHT - LEFT - 40) as string[];
  doc.text(addressLines, LEFT + 40, y);
  y += addressLines.length * 5 + 4;

  line();

  // --- items ---
  doc.setFont('helvetica', 'bold');
  doc.text('Item', LEFT, y);
  doc.text('Qty', RIGHT - 55, y, { align: 'right' });
  doc.text('Price', RIGHT - 30, y, { align: 'right' });
  doc.text('Amount', RIGHT, y, { align: 'right' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  line();

  for (const item of order.items) {
    const nameLines = doc.splitTextToSize(item.dish_name, 95) as string[];
    doc.text(nameLines, LEFT, y);
    doc.text(String(item.quantity), RIGHT - 55, y, { align: 'right' });
    doc.text(`${item.price}`, RIGHT - 30, y, { align: 'right' });
    doc.text(`${item.price * item.quantity}`, RIGHT, y, { align: 'right' });
    y += Math.max(nameLines.length * 5, 6);

    // Keep long orders on the page rather than writing off the bottom edge.
    if (y > 250) {
      doc.addPage();
      y = 22;
    }
  }

  y += 2;
  line();

  // --- totals ---
  const totals: [string, number, boolean][] = [
    ['Subtotal', order.subtotal, false],
    ['Delivery', order.delivery_fee, false],
    ['Tax', order.tax_amount, false],
    ['Total', order.total_amount, true]
  ];

  for (const [label, amount, bold] of totals) {
    if (!bold && amount === 0 && label === 'Tax') continue;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 10);
    doc.text(label, RIGHT - 45, y, { align: 'right' });
    doc.text(`INR ${amount}`, RIGHT, y, { align: 'right' });
    y += bold ? 8 : 6;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text('Thank you for ordering with us.', LEFT, Math.min(y + 6, 285));

  doc.save(`receipt-${order.order_number.replace(/\W/g, '')}.pdf`);
}
