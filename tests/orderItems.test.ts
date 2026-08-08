import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrderItems } from '../src/services/supabase/orders';

// Line items live in the `orders.items` jsonb column on the production
// database. jsonb is schemaless, so anything can be in there: a row written by
// a different client, an older build, or hand-edited in the SQL editor. These
// tests pin the parser's contract -- it must always hand back an OrderItem[],
// never throw, so one malformed row cannot take down an entire order list.

test('reads a well-formed jsonb array', () => {
  const items = parseOrderItems([
    { dish_id: 'd1', dish_name: 'Chicken Biryani', quantity: 2, price: 220, is_veg: false },
    { dish_id: 'd2', dish_name: 'Gulab Jamun', quantity: 1, price: 60, is_veg: true }
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0].dish_name, 'Chicken Biryani');
  assert.equal(items[0].quantity, 2);
  assert.equal(items[0].price, 220);
  assert.equal(items[1].is_veg, true);
});

test('parses a jsonb column that came back as a JSON string', () => {
  // Some drivers and some column types hand jsonb back as text.
  const items = parseOrderItems('[{"dish_id":"d1","dish_name":"Paneer Tikka","quantity":3,"price":180}]');
  assert.equal(items.length, 1);
  assert.equal(items[0].dish_name, 'Paneer Tikka');
  assert.equal(items[0].quantity, 3);
});

test('returns an empty list rather than throwing on malformed input', () => {
  for (const bad of [null, undefined, '', 'not json at all', '{broken', 42, true, {}, { items: [] }]) {
    const result = parseOrderItems(bad as any);
    assert.ok(Array.isArray(result), `should return an array for: ${JSON.stringify(bad)}`);
    assert.equal(result.length, 0, `should be empty for: ${JSON.stringify(bad)}`);
  }
});

test('an object is not mistaken for a one-item list', () => {
  // A single item stored unwrapped would otherwise be spread into characters.
  assert.deepEqual(parseOrderItems({ dish_name: 'Lone Dish', quantity: 1, price: 10 }), []);
});

test('accepts the alternative field names another client may have written', () => {
  // The teammate's checkout writes `items` with `id`/`name` in some paths.
  const items = parseOrderItems([{ id: 'x1', name: 'Veg Roll', quantity: 2, price: 90 }]);
  assert.equal(items[0].dish_id, 'x1');
  assert.equal(items[0].dish_name, 'Veg Roll');
});

test('coerces numeric fields that arrived as strings', () => {
  const items = parseOrderItems([{ dish_id: 'd1', dish_name: 'Tea', quantity: '4', price: '12.50' }]);
  assert.equal(items[0].quantity, 4);
  assert.equal(items[0].price, 12.5);
  assert.equal(typeof items[0].quantity, 'number');
  assert.equal(typeof items[0].price, 'number');
});

test('missing fields degrade to safe defaults instead of NaN or undefined', () => {
  const items = parseOrderItems([{}]);
  assert.equal(items[0].dish_id, '');
  assert.equal(items[0].dish_name, '');
  assert.equal(items[0].quantity, 0);
  assert.equal(items[0].price, 0);
  assert.ok(!Number.isNaN(items[0].quantity));
  assert.ok(!Number.isNaN(items[0].price));
});

test('an empty array stays empty', () => {
  assert.deepEqual(parseOrderItems([]), []);
});

test('order totals computed from parsed items match the stored line values', () => {
  // What MyOrdersView and the receipt do: sum quantity x price.
  const items = parseOrderItems([
    { dish_id: 'a', dish_name: 'A', quantity: 2, price: 220 },
    { dish_id: 'b', dish_name: 'B', quantity: 1, price: 60 }
  ]);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  assert.equal(subtotal, 500);
});
