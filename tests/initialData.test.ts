import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  initialKitchenSettings,
  initialMenuItems,
  initialInventory,
  initialStaffAndDrivers,
  initialPendingRegistrations,
  initialOrders,
  initialCustomers,
  initialGalleryItems,
  initialFeedback,
  initialBanners
} from '../src/lib/initialData';

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter(value => (seen.has(value) ? true : (seen.add(value), false)));
}

// --- ids --------------------------------------------------------------------

test('every seeded collection uses unique, non-empty ids', () => {
  const collections: [string, { id: string }[]][] = [
    ['menu', initialMenuItems],
    ['inventory', initialInventory],
    ['staff', initialStaffAndDrivers],
    ['pending', initialPendingRegistrations],
    ['orders', initialOrders],
    ['customers', initialCustomers],
    ['gallery', initialGalleryItems],
    ['feedback', initialFeedback],
    ['banners', initialBanners]
  ];

  for (const [name, items] of collections) {
    const ids = items.map(item => item.id);
    assert.ok(ids.every(id => id.length > 0), `${name} has an empty id`);
    assert.deepEqual(duplicates(ids), [], `${name} has duplicate ids`);
  }
});

test('ids are unique across every user collection', () => {
  const ids = [...initialStaffAndDrivers, ...initialPendingRegistrations, ...initialCustomers].map(u => u.id);
  assert.deepEqual(duplicates(ids), []);
});

// --- kitchen settings -------------------------------------------------------

test('kitchen settings use sane money and time values', () => {
  assert.ok(initialKitchenSettings.min_order_value > 0);
  assert.ok(initialKitchenSettings.delivery_charge >= 0);
  assert.ok(initialKitchenSettings.free_delivery_above > initialKitchenSettings.min_order_value);
  assert.ok(initialKitchenSettings.tax_percent >= 0 && initialKitchenSettings.tax_percent <= 100);
  assert.ok(initialKitchenSettings.estimated_delivery_mins > 0);
});

test('kitchen settings carry the contact details the checkout flow needs', () => {
  assert.match(initialKitchenSettings.whatsapp_number, /^\d{10}$/);
  assert.ok(initialKitchenSettings.closed_banner_message.length > 0);
});

test('the seed carries NO payment destination', () => {
  // This assertion is deliberately the inverse of what it used to be. The seed
  // previously shipped a hardcoded VPA, and it was not the restaurant's: the
  // code said 7671018757@ybl while the live kitchen_settings row says
  // 7671018717-2@ybl. Whenever the settings fetch failed, or before it
  // resolved, checkout rendered a QR pointing at that other account -- so a
  // customer could pay real money to the wrong person.
  //
  // An unconfigured kitchen must offer no UPI at all rather than guess a
  // destination. CheckoutView gates the UPI option on this being non-empty.
  assert.equal(
    initialKitchenSettings.restaurant_upi_id, '',
    'the seed must never contain a UPI ID — an empty value disables UPI, a wrong value takes money'
  );
});

// --- menu -------------------------------------------------------------------

test('menu items are priced, categorised and illustrated', () => {
  for (const item of initialMenuItems) {
    assert.ok(item.name.trim().length > 0, `${item.id} has no name`);
    assert.ok(item.price > 0, `${item.id} is not priced`);
    assert.ok(item.category.trim().length > 0, `${item.id} has no category`);
    assert.match(item.image_url, /^https?:\/\//, `${item.id} has no image`);
    assert.equal(typeof item.is_veg, 'boolean');
    assert.equal(typeof item.is_available, 'boolean');
  }
});

test("today's specials are a non-empty subset of the menu", () => {
  const specials = initialMenuItems.filter(item => item.is_todays_special);
  assert.ok(specials.length > 0);
  assert.ok(specials.length < initialMenuItems.length);
});

test('display order values are unique where present', () => {
  const orders = initialMenuItems
    .map(item => item.display_order)
    .filter((value): value is number => value !== undefined)
    .map(String);
  assert.deepEqual(duplicates(orders), []);
});

// --- inventory --------------------------------------------------------------

test('inventory stock sits above its low-stock threshold', () => {
  for (const item of initialInventory) {
    assert.ok(item.low_alert_threshold > 0, `${item.item_name} has no threshold`);
    assert.ok(item.quantity > item.low_alert_threshold, `${item.item_name} seeds as low stock`);
    assert.ok(['kg', 'pcs', 'L'].includes(item.unit), `${item.item_name} has unit ${item.unit}`);
  }
});

// --- users ------------------------------------------------------------------

test('staff seed contains at least one approved, active admin and a driver', () => {
  const admins = initialStaffAndDrivers.filter(u => u.role === 'admin');
  assert.ok(admins.length > 0);
  assert.ok(admins.every(u => u.is_approved && u.is_active));
  assert.ok(initialStaffAndDrivers.some(u => u.role === 'driver'));
  assert.ok(initialStaffAndDrivers.every(u => u.role !== 'customer'));
});

test('every seeded user has a plausible email and phone', () => {
  for (const user of [...initialStaffAndDrivers, ...initialPendingRegistrations, ...initialCustomers]) {
    assert.match(user.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, `${user.id} has a bad email`);
    assert.match(user.phone, /^\d{10}$/, `${user.id} has a bad phone`);
    assert.ok(user.full_name.trim().length > 0, `${user.id} has no name`);
  }
});

test('pending registrations are not approved yet and are customers', () => {
  for (const user of initialPendingRegistrations) {
    assert.equal(user.is_approved, false);
    assert.equal(user.role, 'customer');
  }
});

// --- orders -----------------------------------------------------------------

test('order totals equal subtotal plus tax and delivery', () => {
  for (const order of initialOrders) {
    assert.equal(
      order.total_amount,
      order.subtotal + order.tax_amount + order.delivery_fee,
      `${order.order_number} does not add up`
    );
  }
});

test('order subtotals match their line items', () => {
  for (const order of initialOrders) {
    const lineTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    assert.equal(lineTotal, order.subtotal, `${order.order_number} line items do not match subtotal`);
  }
});

test('orders carry at least one positively-priced item', () => {
  for (const order of initialOrders) {
    assert.ok(order.items.length > 0, `${order.order_number} has no items`);
    for (const item of order.items) {
      assert.ok(item.quantity > 0);
      assert.ok(item.price > 0);
      assert.ok(item.dish_name.trim().length > 0);
    }
  }
});

test('orders use known statuses, payment methods and unique order numbers', () => {
  const statuses = ['pending', 'cooking', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'];
  const methods = ['COD', 'UPI', 'Card', 'Razorpay'];
  const paymentStatuses = ['pending', 'completed', 'failed', 'refunded'];

  for (const order of initialOrders) {
    assert.ok(statuses.includes(order.status), `${order.order_number}: ${order.status}`);
    assert.ok(methods.includes(order.payment_method), `${order.order_number}: ${order.payment_method}`);
    assert.ok(paymentStatuses.includes(order.payment_status));
    assert.ok(order.created_at.length > 0);
  }

  assert.deepEqual(duplicates(initialOrders.map(o => o.order_number)), []);
});

test('order ratings, when present, are on the one-to-five scale', () => {
  for (const order of initialOrders) {
    if (order.rating !== undefined) {
      assert.ok(order.rating >= 1 && order.rating <= 5, `${order.order_number}: ${order.rating}`);
    }
  }
});

// --- feedback, gallery and banners -----------------------------------------

test('feedback ratings are on the one-to-five scale', () => {
  for (const entry of initialFeedback) {
    for (const rating of [entry.food_rating, entry.taste_rating, entry.packing_rating, entry.delivery_rating]) {
      assert.ok(rating >= 1 && rating <= 5, `${entry.id}: ${rating}`);
    }
    assert.ok(entry.customer_name.trim().length > 0);
  }
});

test('gallery items and banners point at real image urls', () => {
  for (const item of initialGalleryItems) {
    assert.match(item.image_url, /^https?:\/\//, `${item.id} has no image`);
    assert.ok(item.title.trim().length > 0);
  }
  for (const banner of initialBanners) {
    assert.match(banner.poster_url, /^https?:\/\//, `${banner.id} has no poster`);
    assert.ok(banner.title.trim().length > 0);
  }
});

test('at least one promotional banner is active', () => {
  assert.ok(initialBanners.some(banner => banner.is_active));
});
