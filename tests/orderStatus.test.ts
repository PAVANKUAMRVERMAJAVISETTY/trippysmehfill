import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toTrackingStage,
  trackingStageIndex,
  canCustomerCancel,
  isCurrentOrder,
  statusLabel,
  statusToastCopy,
  paymentLabel,
  paymentNote,
  paymentTone,
  paymentToastCopy,
  awaitsPaymentVerification,
  buildTrackingTimeline,
  normalizePaymentStatus,
  PAYMENT_STATUS_VALUES,
  TRACKING_STAGES
} from '../src/lib/orderStatus';
import { buildOrderShareText } from '../src/lib/receipt';
import { Order, OrderStatus } from '../src/types';

const EVERY_STATUS: OrderStatus[] = [
  'pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled',
  'cooking', 'assigned', 'out_for_delivery'
];

// --- stage mapping ----------------------------------------------------------

test('maps every status to a stage, including the legacy vocabulary', () => {
  for (const status of EVERY_STATUS) {
    assert.ok(toTrackingStage(status), `no stage for: ${status}`);
  }
});

test('legacy statuses collapse onto their Phase 2 equivalents', () => {
  assert.equal(toTrackingStage('cooking'), 'preparing');
  assert.equal(toTrackingStage('assigned'), 'out_for_delivery');
  assert.equal(toTrackingStage('ready'), 'out_for_delivery');
});

test('every non-cancelled status resolves to a real timeline index', () => {
  for (const status of EVERY_STATUS) {
    const index = trackingStageIndex(status);
    if (status === 'cancelled') {
      assert.equal(index, -1);
    } else {
      assert.ok(index >= 0 && index < TRACKING_STAGES.length, `bad index for ${status}: ${index}`);
    }
  }
});

test('the timeline moves forward and never backward through the lifecycle', () => {
  const lifecycle: OrderStatus[] = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
  const indices = lifecycle.map(trackingStageIndex);
  for (let i = 1; i < indices.length; i++) {
    assert.ok(indices[i] > indices[i - 1], `${lifecycle[i]} did not advance past ${lifecycle[i - 1]}`);
  }
});

// --- cancellation -----------------------------------------------------------

test('a customer may cancel only before the kitchen starts cooking', () => {
  assert.equal(canCustomerCancel({ status: 'pending' }), true);
  assert.equal(canCustomerCancel({ status: 'accepted' }), true);
  for (const status of ['preparing', 'cooking', 'ready', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'] as OrderStatus[]) {
    assert.equal(canCustomerCancel({ status }), false, `should not be cancellable: ${status}`);
  }
});

// --- current vs previous ----------------------------------------------------

test('delivered and cancelled orders are previous, everything else is current', () => {
  assert.equal(isCurrentOrder({ status: 'delivered' }), false);
  assert.equal(isCurrentOrder({ status: 'cancelled' }), false);
  for (const status of ['pending', 'accepted', 'preparing', 'cooking', 'ready', 'assigned', 'out_for_delivery'] as OrderStatus[]) {
    assert.equal(isCurrentOrder({ status }), true, `should be current: ${status}`);
  }
});

// --- labels -----------------------------------------------------------------

test('every status has a human label', () => {
  for (const status of EVERY_STATUS) {
    assert.ok(statusLabel(status).length > 0, `no label for: ${status}`);
  }
  assert.equal(statusLabel('cancelled'), 'Cancelled');
  assert.equal(statusLabel('cooking'), 'Preparing');
});

test('placing an order raises no toast, but every later stage does', () => {
  assert.equal(statusToastCopy('pending'), null);
  for (const status of ['accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'] as OrderStatus[]) {
    assert.ok(statusToastCopy(status), `expected toast copy for: ${status}`);
  }
});

test('payment label distinguishes cash on delivery from an unconfirmed transfer', () => {
  assert.equal(paymentLabel({ payment_method: 'COD', payment_status: 'pending' }), 'Pay on delivery');
  // A UPI order stays pending until an admin verifies the transfer -- pressing
  // "I've Paid" records a claim, it never settles anything.
  assert.equal(paymentLabel({ payment_method: 'UPI', payment_status: 'pending' }), 'Pending Verification');
  assert.equal(paymentLabel({ payment_method: 'UPI', payment_status: 'completed' }), 'Payment Confirmed');
  assert.equal(paymentLabel({ payment_method: 'COD', payment_status: 'completed' }), 'Paid');
  assert.equal(paymentLabel({ payment_method: 'COD', payment_status: 'refunded' }), 'Refunded');
});

// --- payment status vocabulary ----------------------------------------------

test('the canonical vocabulary is exactly what the database will accept', () => {
  // Migration 0007: payment_status IN ('pending','completed','failed','refunded','rejected')
  assert.deepEqual(
    [...PAYMENT_STATUS_VALUES].sort(),
    ['completed', 'failed', 'pending', 'refunded', 'rejected']
  );
});

test('canonical values pass through normalisation unchanged', () => {
  for (const value of PAYMENT_STATUS_VALUES) {
    assert.equal(normalizePaymentStatus(value), value);
  }
});

test("another client's vocabulary is translated, not dropped", () => {
  // A parallel build settles UPI payments as 'paid' and holds them at
  // 'pending_verification'. Those rows must read correctly here.
  assert.equal(normalizePaymentStatus('paid'), 'completed');
  assert.equal(normalizePaymentStatus('pending_verification'), 'pending');
});

test('a verified payment never reads as unpaid after normalisation', () => {
  // The failure that matters most: showing a paying customer "Pending
  // Verification" when the restaurant already confirmed their transfer.
  for (const settled of ['paid', 'completed', 'success', 'successful', 'complete']) {
    assert.equal(normalizePaymentStatus(settled), 'completed', `${settled} should read as settled`);
  }
});

test('casing and stray whitespace do not defeat normalisation', () => {
  assert.equal(normalizePaymentStatus('  PAID  '), 'completed');
  assert.equal(normalizePaymentStatus('Pending_Verification'), 'pending');
  assert.equal(normalizePaymentStatus('COMPLETED'), 'completed');
});

test('an unrecognised value falls back to pending, never to completed', () => {
  // Safe direction: an unreadable status shows as awaiting review so a human
  // looks at it. Defaulting to 'completed' would let a bad value mark an order
  // paid on its own.
  for (const junk of ['', '   ', 'weird', 'settled?', null, undefined, 42, {}, [], true]) {
    assert.equal(
      normalizePaymentStatus(junk as any), 'pending',
      `unrecognised input should be pending: ${JSON.stringify(junk)}`
    );
  }
});

test('normalisation output is always renderable by the presentation helpers', () => {
  const inputs = ['paid', 'pending_verification', 'declined', 'refund', 'nonsense', null, 7];
  for (const raw of inputs) {
    const status = normalizePaymentStatus(raw as any);
    for (const payment_method of ['COD', 'UPI'] as const) {
      const order = { payment_method, payment_status: status };
      assert.ok(paymentLabel(order).length > 0, `no label for ${raw}`);
      assert.ok(['success', 'pending', 'error', 'neutral'].includes(paymentTone(order)));
    }
  }
});

// --- Phase 3: admin payment verification ------------------------------------

test('a rejected payment says so, and never reads as paid', () => {
  const rejected = { payment_method: 'UPI', payment_status: 'rejected' } as const;
  assert.equal(paymentLabel(rejected), 'Payment Rejected');
  assert.doesNotMatch(paymentLabel(rejected), /paid|confirmed/i);
  assert.equal(paymentTone(rejected), 'error');
});

test('a rejection tells the customer what to do next', () => {
  assert.equal(
    paymentNote({ payment_method: 'UPI', payment_status: 'rejected' }),
    'Please contact the restaurant.'
  );
  // A settled or cash payment needs no instruction.
  assert.equal(paymentNote({ payment_method: 'UPI', payment_status: 'completed' }), null);
  assert.equal(paymentNote({ payment_method: 'COD', payment_status: 'pending' }), null);
});

test('payment tone separates settled, waiting and refused', () => {
  assert.equal(paymentTone({ payment_method: 'UPI', payment_status: 'completed' }), 'success');
  assert.equal(paymentTone({ payment_method: 'UPI', payment_status: 'pending' }), 'pending');
  assert.equal(paymentTone({ payment_method: 'UPI', payment_status: 'failed' }), 'error');
  assert.equal(paymentTone({ payment_method: 'COD', payment_status: 'pending' }), 'neutral');
});

test('only a settled payment raises a toast', () => {
  // Nothing has been decided yet, so there is no news to announce.
  assert.equal(paymentToastCopy('pending'), null);

  assert.equal(paymentToastCopy('completed')?.title, 'Payment received and verified.');
  assert.equal(paymentToastCopy('completed')?.tone, 'success');

  assert.equal(paymentToastCopy('rejected')?.title, 'Payment rejected.');
  assert.equal(paymentToastCopy('rejected')?.description, 'Please contact the restaurant.');
  assert.equal(paymentToastCopy('rejected')?.tone, 'error');
});

test('awaitsPaymentVerification is true only for an unsettled transfer', () => {
  assert.equal(awaitsPaymentVerification({ payment_method: 'UPI', payment_status: 'pending' }), true);
  assert.equal(awaitsPaymentVerification({ payment_method: 'UPI', payment_status: 'completed' }), false);
  assert.equal(awaitsPaymentVerification({ payment_method: 'UPI', payment_status: 'rejected' }), false);
  // Cash has nothing to verify.
  assert.equal(awaitsPaymentVerification({ payment_method: 'COD', payment_status: 'pending' }), false);
});

// --- tracking timeline ------------------------------------------------------

const labelsOf = (order: Parameters<typeof buildTrackingTimeline>[0]) =>
  buildTrackingTimeline(order).map(s => s.label);

const stepFor = (order: Parameters<typeof buildTrackingTimeline>[0], key: string) =>
  buildTrackingTimeline(order).find(s => s.key === key);

test('a UPI order shows the payment steps in the specified order', () => {
  assert.deepEqual(
    labelsOf({ payment_method: 'UPI', payment_status: 'pending', status: 'pending' }),
    ['Order Placed', 'Payment Pending', 'Payment Confirmed', 'Preparing', 'Out for Delivery', 'Delivered']
  );
});

test('a cash order has no payment steps to wait through', () => {
  const labels = labelsOf({ payment_method: 'COD', payment_status: 'pending', status: 'pending' });
  assert.deepEqual(labels, ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered']);
  assert.ok(!labels.some(l => l.startsWith('Payment')), 'cash should not show a payment wait');
});

test('the payment steps advance only when an admin settles the transfer', () => {
  const waiting = { payment_method: 'UPI', payment_status: 'pending', status: 'pending' } as const;
  assert.equal(stepFor(waiting, 'payment_pending')?.state, 'current');
  assert.equal(stepFor(waiting, 'payment_confirmed')?.state, 'upcoming');

  const verified = { payment_method: 'UPI', payment_status: 'completed', status: 'pending' } as const;
  assert.equal(stepFor(verified, 'payment_pending')?.state, 'done');
  assert.equal(stepFor(verified, 'payment_confirmed')?.state, 'done');
});

test('a rejected payment marks its step failed and renames it', () => {
  const rejected = { payment_method: 'UPI', payment_status: 'rejected', status: 'pending' } as const;
  const step = stepFor(rejected, 'payment_confirmed');
  assert.equal(step?.state, 'failed');
  assert.equal(step?.label, 'Payment Rejected');
  assert.equal(step?.blurb, 'Please contact the restaurant.');
  // The kitchen steps survive: the order still exists and can still be paid for.
  assert.ok(labelsOf(rejected).includes('Delivered'));
});

test('the timeline tracks the kitchen through the lifecycle', () => {
  const at = (status: OrderStatus) =>
    buildTrackingTimeline({ payment_method: 'COD', payment_status: 'pending', status });

  assert.equal(at('preparing').find(s => s.key === 'preparing')?.state, 'current');
  assert.equal(at('out_for_delivery').find(s => s.key === 'preparing')?.state, 'done');
  assert.equal(at('out_for_delivery').find(s => s.key === 'out_for_delivery')?.state, 'current');
  assert.equal(at('delivered').find(s => s.key === 'delivered')?.state, 'current');
  assert.equal(at('delivered').find(s => s.key === 'out_for_delivery')?.state, 'done');
});

test('an accepted order reads as the kitchen having started', () => {
  const accepted = buildTrackingTimeline({
    payment_method: 'COD', payment_status: 'pending', status: 'accepted'
  });
  const preparing = accepted.find(s => s.key === 'preparing');
  assert.equal(preparing?.state, 'current');
  assert.match(preparing?.blurb ?? '', /accepted/i);
});

test('a cancelled order ends the timeline rather than pretending to progress', () => {
  const steps = buildTrackingTimeline({
    payment_method: 'UPI', payment_status: 'pending', status: 'cancelled'
  });
  const last = steps[steps.length - 1];
  assert.equal(last.key, 'cancelled');
  assert.equal(last.state, 'failed');
  // Nothing after "Order Placed" should claim to have happened.
  for (const step of steps.slice(1, -1)) {
    assert.notEqual(step.state, 'done', `${step.label} should not read as completed on a cancelled order`);
  }
});

test('every timeline step carries a state the renderer knows how to draw', () => {
  const known = new Set(['done', 'current', 'upcoming', 'failed']);
  const methods = ['COD', 'UPI'] as const;
  const payments = ['pending', 'completed', 'rejected', 'failed', 'refunded'] as const;

  for (const payment_method of methods) {
    for (const payment_status of payments) {
      for (const status of EVERY_STATUS) {
        for (const step of buildTrackingTimeline({ payment_method, payment_status, status })) {
          assert.ok(known.has(step.state), `bad state ${step.state} for ${payment_method}/${payment_status}/${status}`);
          assert.ok(step.label.length > 0, 'every step needs a label');
          assert.ok(step.blurb.length > 0, 'every step needs a blurb');
        }
      }
    }
  }
});

// --- share text -------------------------------------------------------------

const order: Order = {
  id: 'abc-123',
  order_number: '#1007',
  customer_id: 'cust-1',
  customer_name: 'Asha Menon',
  customer_phone: '9876543210',
  delivery_address: 'Block A, Room 104',
  items: [
    { dish_id: 'd1', dish_name: 'Chicken Biryani', quantity: 2, price: 220 },
    { dish_id: 'd2', dish_name: 'Gulab Jamun', quantity: 1, price: 60 }
  ],
  subtotal: 500,
  tax_amount: 0,
  delivery_fee: 0,
  total_amount: 500,
  payment_method: 'COD',
  payment_status: 'pending',
  status: 'preparing',
  created_at: '2026-08-07'
};

test('share text names the order, its items and what is owed', () => {
  const text = buildOrderShareText(order, { name: "Trippy's Mehfill" });
  assert.match(text, /#1007/);
  assert.match(text, /2 × Chicken Biryani — ₹440/);
  assert.match(text, /1 × Gulab Jamun — ₹60/);
  assert.match(text, /Total: ₹500/);
  assert.match(text, /Pay on delivery/);
  assert.match(text, /Preparing/);
});

// --- admin status transitions -----------------------------------------------

test('every status an admin can set is one the timeline can render', () => {
  // The admin panel offers Cooking, Out for Delivery, Delivered and Cancelled.
  // "Mark Delivered" silently wrote 'assigned' whenever a driver was selected,
  // because assignDriver hardcoded the status and overrode the caller. These
  // assertions pin the set the admin can produce so a regression is caught here
  // rather than by an admin wondering why the button does nothing.
  const adminSettable: OrderStatus[] = ['cooking', 'out_for_delivery', 'delivered', 'cancelled', 'assigned'];

  for (const status of adminSettable) {
    assert.ok(statusLabel(status).length > 0, `no label for ${status}`);
    const steps = buildTrackingTimeline({ payment_method: 'COD', payment_status: 'pending', status });
    assert.ok(steps.length > 0, `no timeline for ${status}`);
  }
});

test('delivered is a terminal state the customer sees as complete', () => {
  assert.equal(statusLabel('delivered'), 'Delivered');
  assert.equal(isCurrentOrder({ status: 'delivered' }), false);

  const steps = buildTrackingTimeline({ payment_method: 'COD', payment_status: 'pending', status: 'delivered' });
  const delivered = steps.find(s => s.key === 'delivered');
  assert.equal(delivered?.state, 'current', 'Delivered should be the active step, not upcoming');
  assert.equal(steps.find(s => s.key === 'out_for_delivery')?.state, 'done');
});

test("'assigned' and 'delivered' are distinct — one must not stand in for the other", () => {
  // The exact confusion the bug caused.
  assert.notEqual(statusLabel('assigned'), statusLabel('delivered'));
  assert.equal(isCurrentOrder({ status: 'assigned' }), true);
  assert.equal(isCurrentOrder({ status: 'delivered' }), false);
});
