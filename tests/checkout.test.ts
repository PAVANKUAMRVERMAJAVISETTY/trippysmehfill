import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCheckout,
  nextOrderNumber,
  estimatedDeliveryLabel,
  buildUpiPaymentUri,
  CHECKOUT_PAYMENT_METHODS
} from '../src/lib/checkout';

// A checkout that should always pass, so each test can break exactly one thing.
const valid = {
  fullName: 'Asha Menon',
  phone: '9876543210',
  address: 'Block A, Room 104, GLS Campus',
  paymentMethod: 'COD' as const,
  cartCount: 2,
  subtotal: 250,
  minOrderValue: 80
};

// --- validateCheckout -------------------------------------------------------

test('accepts a complete checkout', () => {
  assert.equal(validateCheckout(valid).valid, true);
});

test('rejects an empty cart before complaining about anything else', () => {
  const result = validateCheckout({
    ...valid,
    cartCount: 0,
    fullName: '',
    phone: '',
    address: '',
    paymentMethod: null
  });
  assert.equal(result.valid, false);
  assert.match(result.message, /cart is empty/i);
});

test('requires a name', () => {
  for (const fullName of ['', '   ', 'A', '12345', '<script>alert(1)</script>']) {
    assert.equal(validateCheckout({ ...valid, fullName }).valid, false, `should reject name: ${fullName}`);
  }
});

test('requires a valid 10-digit phone', () => {
  for (const phone of ['', '123', '12345678901', 'abcdefghij', '1234567890']) {
    assert.equal(validateCheckout({ ...valid, phone }).valid, false, `should reject phone: ${phone}`);
  }
  assert.equal(validateCheckout({ ...valid, phone: '9876543210' }).valid, true);
});

test('requires a delivery address', () => {
  for (const address of ['', '   ', 'a']) {
    assert.equal(validateCheckout({ ...valid, address }).valid, false, `should reject address: ${address}`);
  }
});

test('requires a payment method the checkout actually offers', () => {
  const missing = validateCheckout({ ...valid, paymentMethod: null });
  assert.equal(missing.valid, false);
  assert.equal(missing.message, 'Please select a payment method.');
  // Card and Razorpay exist in the type but are not offered at checkout.
  assert.equal(validateCheckout({ ...valid, paymentMethod: 'Card' }).valid, false);
  assert.equal(validateCheckout({ ...valid, paymentMethod: 'Razorpay' }).valid, false);
  for (const paymentMethod of CHECKOUT_PAYMENT_METHODS) {
    assert.equal(validateCheckout({ ...valid, paymentMethod }).valid, true, `should accept: ${paymentMethod}`);
  }
});

test('enforces the minimum order value and says how much is missing', () => {
  const result = validateCheckout({ ...valid, subtotal: 50, minOrderValue: 80 });
  assert.equal(result.valid, false);
  assert.match(result.message, /30/);
});

test('treats a subtotal exactly at the minimum as acceptable', () => {
  assert.equal(validateCheckout({ ...valid, subtotal: 80, minOrderValue: 80 }).valid, true);
});

// --- nextOrderNumber --------------------------------------------------------

test('starts the series at #1005 when there are no orders', () => {
  assert.equal(nextOrderNumber([]), '#1005');
});

test('continues from the highest existing number', () => {
  assert.equal(nextOrderNumber(['#1005', '#1007', '#1006']), '#1008');
});

test('ignores unparseable order numbers rather than producing NaN', () => {
  assert.equal(nextOrderNumber(['', 'draft', '#1009']), '#1010');
  assert.equal(nextOrderNumber(['', 'draft']), '#1005');
  assert.equal(nextOrderNumber([undefined as any, null as any]), '#1005');
});

// --- estimatedDeliveryLabel -------------------------------------------------

test('states the delivery window as a clock time, not just a duration', () => {
  const placed = new Date('2026-08-07T12:00:00');
  const label = estimatedDeliveryLabel(placed, 30);
  assert.match(label, /30 mins/);
  assert.match(label, /12:30/);
});

// --- buildUpiPaymentUri -----------------------------------------------------

test('builds a upi:// uri with a two-decimal amount', () => {
  const uri = buildUpiPaymentUri({
    upiId: '7671018757@ybl',
    payeeName: "Trippy's Mehfill",
    amount: 250,
    orderNumber: '#1005'
  });
  assert.ok(uri.startsWith('upi://pay?'));
  assert.match(uri, /am=250\.00/);
  assert.match(uri, /cu=INR/);
  assert.match(uri, /pa=7671018757%40ybl/);
});

test('encodes a payee name containing an apostrophe and spaces', () => {
  const uri = buildUpiPaymentUri({
    upiId: 'x@ybl',
    payeeName: "Trippy's Mehfill",
    amount: 99.5,
    orderNumber: '#1006'
  });
  assert.ok(!uri.includes(' '), 'uri must not contain raw spaces');
  assert.match(uri, /am=99\.50/);
});
