/**
 * Regression proof for BUG-17: admin "Mark Delivered" wrote 'assigned'.
 *
 * Drives the real admin UI in a real browser, selects a driver (the condition
 * that triggered the bug), clicks each status button, and asserts on the actual
 * PATCH payload sent to Supabase. Asserting the request body rather than the
 * on-screen text matters: the old bug rendered "Delivered" optimistically while
 * writing 'assigned', so the UI looked right and the database was wrong.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4321';
const results = [];
const record = (n, pass, d = '') => { results.push({ n, pass }); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`); };

const ADMIN = '33333333-3333-3333-3333-333333333333';
const DRIVER = '44444444-4444-4444-4444-444444444444';

const order = {
  id: 'o-status', order_number: '#3001',
  customer_id: 'c1', customer_name: 'Status Test', customer_phone: '9000000001',
  delivery_address: 'Block A', landmark: null, campus: null,
  items: [{ dish_id: 'd1', dish_name: 'Biryani', quantity: 1, price: 240 }],
  subtotal: 240, tax_amount: 0, delivery_fee: 0, total_amount: 240,
  payment_method: 'COD', payment_status: 'pending', upi_transaction_id: null,
  status: 'pending', driver_id: null, driver_name: null, driver_phone: null,
  kitchen_notes: null, rating: null,
  created_at: new Date('2026-08-08T10:00:00Z').toISOString()
};

const profiles = [
  { id: ADMIN,  email: 'admin@t.local',  full_name: 'Admin User', phone: '9000000002', role: 'admin',  is_approved: true, is_active: true },
  { id: DRIVER, email: 'driver@t.local', full_name: 'Driver A',   phone: '9000000003', role: 'driver', is_approved: true, is_active: true }
];

const browser = await chromium.launch();
const patches = [];

const session = {
  access_token: 't', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
  user: { id: ADMIN, aud: 'authenticated', role: 'authenticated', email: 'admin@t.local',
          app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() }
};

const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), ['trippys-auth', JSON.stringify(session)]);
const page = await ctx.newPage();

await page.route('**/auth/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) }));
await page.route('**/realtime/**', r => r.abort());
await page.route('**/rest/v1/**', async (r) => {
  const req = r.request();
  const table = new URL(req.url()).pathname.split('/rest/v1/')[1]?.split('?')[0] || '';
  const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

  if (req.method() === 'PATCH' && table === 'orders') {
    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch {}
    patches.push(body);
    return json([{ ...order, ...body }]);
  }
  if (table === 'profiles') {
    // AuthContext loads the signed-in profile with .eq('id', …).maybeSingle().
    // Returning both rows makes maybeSingle error out, the user never resolves
    // as admin, and the admin section never renders -- so honour the filter.
    const url = new URL(req.url());
    const idFilter = url.searchParams.get('id');
    if (idFilter) {
      const wanted = idFilter.replace('eq.', '');
      return json(profiles.filter(p => p.id === wanted));
    }
    return json(profiles);
  }
  if (table === 'orders') return json([order]);
  if (table === 'menu_items') return json([]);
  // A BARE OBJECT, not an array: fetchKitchenSettings() reads this through
  // .limit(1).single(), and PostgREST answers .single() with the row itself.
  // An array here makes `.is_open` read as undefined, the app correctly treats
  // the kitchen as closed, and the closed-restaurant modal then covers the page
  // so every later click lands on the overlay instead of its target.
  if (table === 'kitchen_settings') return json({ id: 1, kitchen_name: "Trippy's", is_open: true,
    opening_time: '09:00 AM', closing_time: '11:00 PM', min_order_value: 80, free_delivery_above: 300,
    delivery_charge: 20, tax_percent: 0, estimated_delivery_mins: 30, restaurant_upi_id: 'real@ybl',
    whatsapp_number: '9000000000', closed_banner_message: '', lat: 28.26, lng: 77.08, max_cod_radius_km: 15 });
  return json([]);
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.getByRole('button', { name: /live orders/i }).first().click().catch(() => {});
await page.waitForTimeout(1500);

const onLiveOrders = (await page.locator('body').innerText()).includes('#3001');
record('admin reaches Live Orders with the order visible', onLiveOrders);

// Select a driver -- this is what triggered the bug.
const select = page.locator('select').first();
const hasSelect = await select.count() > 0;
if (hasSelect) {
  await select.selectOption({ index: 1 }).catch(() => {});
  await page.waitForTimeout(300);
}
record('a driver can be selected (the bug condition)', hasSelect);

// Each button must write the status it is labelled with.
const cases = [
  [/mark delivered/i,     'delivered'],
  [/out for delivery/i,   'out_for_delivery'],
  [/cook in kitchen/i,    'cooking']
];

// Each button is tested in a FRESH page. The admin card hides the remaining
// actions once a status is set, so clicking them in sequence on one page tests
// only the first -- which is how the original bug survived review.
for (const [label, expected] of cases) {
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await c2.addInitScript(([k, v]) => window.localStorage.setItem(k, v), ['trippys-auth', JSON.stringify(session)]);
  const p2 = await c2.newPage();
  const sent = [];

  await p2.route('**/auth/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) }));
  await p2.route('**/realtime/**', r => r.abort());
  await p2.route('**/rest/v1/**', (r) => {
    const req = r.request();
    const url = new URL(req.url());
    const table = url.pathname.split('/rest/v1/')[1]?.split('?')[0] || '';
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (req.method() === 'PATCH' && table === 'orders') {
      let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch {}
      sent.push(body); return json([{ ...order, ...body }]);
    }
    if (table === 'profiles') {
      const f = url.searchParams.get('id');
      return json(f ? profiles.filter(x => x.id === f.replace('eq.', '')) : profiles);
    }
    if (table === 'orders') return json([order]);
    // Bare object, for the same .single() reason as the mock above.
    if (table === 'kitchen_settings') return json({ id: 1, kitchen_name: "Trippy's", is_open: true,
      opening_time: '09:00 AM', closing_time: '11:00 PM', min_order_value: 80, free_delivery_above: 300,
      delivery_charge: 20, tax_percent: 0, estimated_delivery_mins: 30, restaurant_upi_id: 'real@ybl',
      whatsapp_number: '9000000000', closed_banner_message: '', lat: 28.26, lng: 77.08, max_cod_radius_km: 15 });
    return json([]);
  });

  await p2.goto(BASE, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(1200);
  await p2.getByRole('button', { name: /live orders/i }).first().click().catch(() => {});
  await p2.waitForTimeout(1500);
  await p2.locator('select').first().selectOption({ index: 1 }).catch(() => {});
  await p2.waitForTimeout(300);

  const btn = p2.getByRole('button', { name: label }).first();
  if (await btn.count() === 0) {
    record(`"${label.source}" present`, false, 'not found');
  } else {
    await btn.click().catch(() => {});
    await p2.waitForTimeout(900);
    const wrote = sent.map(x => x.status).filter(Boolean);
    record(`"${label.source}" writes status=${expected}`, wrote.includes(expected), `sent ${JSON.stringify(wrote)}`);
    if (expected === 'delivered') {
      record('Mark Delivered does NOT write "assigned" (BUG-17)',
        !wrote.includes('assigned'), `sent ${JSON.stringify(wrote)}`);
    }
  }
  await c2.close();
}

await ctx.close();
await browser.close();

const failed = results.filter(r => !r.pass);
console.log(`\n===== ${results.length - failed.length}/${results.length} passed =====`);
process.exit(failed.length ? 1 : 0);
