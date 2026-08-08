/**
 * Checkout rules, kept free of React and Supabase imports so the same functions
 * run in the UI and in tests.
 *
 * Nothing here talks to the network. Deciding whether an order *may* be placed
 * is separate from placing it, so the "can I submit?" question has one answer
 * used by both the button's disabled state and the submit handler.
 */

import { validateFullName, validatePhone, validateAddress, ValidationResult } from './validation';
import { PaymentMethod } from '../types';

/** The payment options a customer can actually choose at checkout. */
export const CHECKOUT_PAYMENT_METHODS: PaymentMethod[] = ['COD', 'UPI'];

export interface CheckoutInput {
  fullName: string;
  phone: string;
  address: string;
  paymentMethod: PaymentMethod | null;
  /** Number of distinct lines in the cart. */
  cartCount: number;
  subtotal: number;
  minOrderValue: number;
}

const fail = (message: string): ValidationResult => ({ valid: false, message });
const ok: ValidationResult = { valid: true, message: '' };

/**
 * Every condition that must hold before an order is written.
 *
 * Order matters: the cart is checked first because an empty cart makes the
 * remaining messages irrelevant, and the customer should be told the useful
 * thing rather than the first field that happens to be blank.
 */
export function validateCheckout(input: CheckoutInput): ValidationResult {
  if (input.cartCount <= 0) {
    return fail('Your cart is empty. Add items from the menu before checking out.');
  }

  const name = validateFullName(input.fullName);
  if (!name.valid) return name;

  const phone = validatePhone(input.phone);
  if (!phone.valid) return phone;

  const address = validateAddress(input.address);
  if (!address.valid) return address;

  if (!input.paymentMethod || !CHECKOUT_PAYMENT_METHODS.includes(input.paymentMethod)) {
    return fail('Please select a payment method.');
  }

  if (input.subtotal < input.minOrderValue) {
    const short = input.minOrderValue - input.subtotal;
    return fail(`Minimum order value is ₹${input.minOrderValue}. Add ₹${short} more to continue.`);
  }

  return ok;
}

/**
 * Next display number in the `#1005`, `#1006`, ... series.
 *
 * This is a label, not an identity: the row's primary key comes from the
 * database. Two customers checking out in the same second can derive the same
 * label, which is cosmetic -- their orders are still distinct rows.
 */
export function nextOrderNumber(existingOrderNumbers: string[]): string {
  const seen = existingOrderNumbers
    .map((n) => {
      const match = String(n ?? '').match(/\d+/);
      return match ? parseInt(match[0], 10) : NaN;
    })
    .filter((n) => Number.isFinite(n));

  const highest = seen.length > 0 ? Math.max(...seen) : 1000;
  return `#${Math.max(highest + 1, 1005)}`;
}

/**
 * Delivery window shown on the confirmation, as a clock time rather than a
 * duration -- "by 7:45 pm" survives the customer leaving the screen and coming
 * back, where "in 30 mins" quietly becomes a lie.
 */
export function estimatedDeliveryLabel(placedAt: Date, estimatedMins: number): string {
  const eta = new Date(placedAt.getTime() + estimatedMins * 60_000);
  const time = eta.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${estimatedMins} mins (by ${time})`;
}

/**
 * The `upi://pay` URI encoded into the QR. Amount is fixed to two decimals
 * because UPI apps reject a malformed `am` parameter rather than ignoring it.
 */
export function buildUpiPaymentUri(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  orderNumber: string;
}): string {
  const query = new URLSearchParams({
    pa: params.upiId,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    cu: 'INR',
    tn: `Order ${params.orderNumber}`
  });
  return `upi://pay?${query.toString()}`;
}
