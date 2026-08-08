/**
 * End-to-end journey suite — customer, admin, kitchen, driver.
 *
 * WHY THIS EXISTS AND WHAT IT DOES NOT PROVE
 * ------------------------------------------
 * The production database blocks every authenticated journey: `profiles` has no
 * table grants, so signup fails with 42501 and nothing downstream can be
 * reached. That is a database fix requiring credentials this environment does
 * not have, so these journeys had never been executed by anyone.
 *
 * This suite runs the REAL application in a REAL browser and intercepts the
 * Supabase network layer, serving fixtures in place of the unreachable
 * database. It therefore proves the APPLICATION behaves correctly -- routing,
 * role gating, rendering, payment-state interpretation, driver isolation in the
 * UI layer -- against known inputs.
 *
 * It does NOT prove the database enforces anything. RLS, grants and triggers are
 * covered separately by supabase/verify/run_migration_checks.sh on a real
 * PostgreSQL. Both halves are needed; neither substitutes for the other.
 */
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4321';
const results = [];
const record = (area, name, pass, detail = '') => {
  results.push({ area, name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${area} · ${name}${detail ? ` — ${detail}` : ''}`);
};

const uid = {
  customerA: '11111111-1111-1111-1111-111111111111',
  customerB: '22222222-2222-2222-2222-222222222222',
  admin:     '33333333-3333-3333-3333-333333333333',
  driverA:   '44444444-4444-4444-4444-444444444444',
  driverB:   '55555555-5555-5555-5555-555555555555'
};

const profileFor = (role, id, name) => ({
  id, email: `${role}@test.local`, full_name: name, phone: '9000000001',
  hostel_address: 'Block A', role, account_status: 'active',
  is_approved: true, is_active: true, wallet_balance: 0, referral_code: 'TRIPPY-TEST-0001'
});

const MENU = [
  { id: 'd1', name: 'Chicken Biryani', description: 'Dum cooked', price: 220, category: 'Biryani',
    image_url: 'https://example.invalid/1.jpg', is_veg: false, is_available: true, is_todays_special: true, display_order: 1 },
  { id: 'd2', name: 'Paneer Tikka', description: 'Char grilled', price: 180, category: 'Veg',
    image_url: 'https://example.invalid/2.jpg', is_veg: true, is_available: true, is_todays_special: false, display_order: 2 }
];

const orderFor = (over = {}) => ({
  id: 'o-1', order_number: '#1005',
  customer_id: uid.customerA, customer_name: 'Customer A', customer_phone: '9000000001',
  delivery_address: 'Block A, Room 104', landmark: null, campus: null,
  items: [{ dish_id: 'd1', dish_name: 'Chicken Biryani', quantity: 2, price: 220, is_veg: false }],
  subtotal: 440, tax_amount: 0, delivery_fee: 0, total_amount: 440,
  payment_method: 'UPI', payment_status: 'pending', upi_transaction_id: null,
  status: 'pending', driver_id: null, driver_name: null, driver_phone: null,
  kitchen_notes: null, rating: null,
  created_at: new Date('2026-08-08T12:00:00Z').toISOString(),
  updated_at: new Date('2026-08-08T12:00:00Z').toISOString(),
  ...over
});

/** Signs a session into the app and serves fixtures for every Supabase call. */
async function signedInPage(browser, { role, id, name, orders = [], device = null }) {
  const ctx = await browser.newContext(
    device ? { ...devices[device] } : { viewport: { width: 1280, height: 900 } }
  );

  const session = {
    access_token: 'test-token', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test-refresh',
    user: { id, aud: 'authenticated', role: 'authenticated', email: `${role}@test.local`,
            app_metadata: {}, user_metadata: { full_name: name }, created_at: new Date(0).toISOString() }
  };
  await ctx.addInitScript(([key, value]) => {
    window.localStorage.setItem(key, value);
  }, ['trippys-auth', JSON.stringify(session)]);

  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|\[vite\]|DevTools|favicon/i.test(t)) return;
    consoleErrors.push(t);
  });
  page.on('pageerror', (e) => consoleErrors.push(`UNCAUGHT: ${e.message}`));

  await page.route('**/auth/v1/**', (r) => {
    const u = r.request().url();
    if (u.includes('/user')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
  });

  await page.route('**/rest/v1/**', (r) => {
    const u = new URL(r.request().url());
    const table = u.pathname.split('/rest/v1/')[1]?.split('?')[0] || '';
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

    if (table === 'profiles') return json([profileFor(role, id, name)]);
    if (table === 'menu_items') return json(MENU);
    if (table === 'orders') return json(orders);
    // A BARE OBJECT, not an array. fetchKitchenSettings() reads this through
    // .limit(1).single(), and PostgREST answers a .single() request with the row
    // itself. Returning [{...}] here made the app read `.is_open` off an array,
    // get undefined, and correctly conclude the kitchen was closed -- so the
    // closed-restaurant modal covered the page and every later click landed on
    // the overlay instead of the control it was aiming at.
    if (table === 'kitchen_settings') return json({
      id: 1, kitchen_name: "Trippy's Mehfill", is_open: true, opening_time: '09:00 AM', closing_time: '11:00 PM',
      min_order_value: 80, free_delivery_above: 300, delivery_charge: 20, tax_percent: 0,
      estimated_delivery_mins: 30, restaurant_upi_id: 'realkitchen@ybl', whatsapp_number: '9000000000',
      closed_banner_message: '', lat: 28.26, lng: 77.08, max_cod_radius_km: 15
    });
    return json([]);
  });

  await page.route('**/realtime/**', (r) => r.abort());

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return { ctx, page, consoleErrors };
}

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
console.log('\n== J1. Customer signed in — menu and cart ==');
{
  const { ctx, page, consoleErrors } = await signedInPage(browser, {
    role: 'customer', id: uid.customerA, name: 'Customer A'
  });
  const body = await page.locator('body').innerText();
  record('customer', 'menu renders dishes from the database', /Chicken Biryani/.test(body));
  record('customer', 'no fabricated customer on screen',
    !/Rahul Sharma|Utfi - Keity|Rakesh Ranjan/.test(body));
  record('customer', 'no console errors while signed in', consoleErrors.length === 0,
    consoleErrors.slice(0, 1).join('') || 'clean');
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n== J2. Payment states render correctly for the customer ==');
{
  const cases = [
    ['COD pending',   { payment_method: 'COD', payment_status: 'pending' },   /Pay on delivery/i,        /Paid\b|Confirmed/i],
    ['UPI pending',   { payment_method: 'UPI', payment_status: 'pending' },   /Pending Verification/i,   /Payment Confirmed/i],
    ['UPI completed', { payment_method: 'UPI', payment_status: 'completed' }, /Payment Confirmed/i,      /Pending Verification/i],
    ['UPI rejected',  { payment_method: 'UPI', payment_status: 'rejected' },  /Payment Rejected/i,       /Confirmed|Paid\b/i],
    // Teammate vocabulary: must normalise on read, never display as unpaid.
    ['UPI "paid" (teammate)', { payment_method: 'UPI', payment_status: 'paid' }, /Payment Confirmed/i, /Pending Verification/i]
  ];
  for (const [label, over, mustShow, mustNotShow] of cases) {
    const { ctx, page } = await signedInPage(browser, {
      role: 'customer', id: uid.customerA, name: 'Customer A',
      orders: [orderFor({ ...over, status: 'pending' })]
    });
    await page.getByRole('button', { name: /my orders|orders/i }).first().click().catch(() => {});
    await page.waitForTimeout(700);
    const body = await page.locator('body').innerText();
    const ok = mustShow.test(body) && !mustNotShow.test(body);
    record('payment', label, ok, ok ? '' : `body did not match (${body.length} chars)`);
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
console.log('\n== J3. Admin — Payment Verification queue ==');
{
  const { ctx, page, consoleErrors } = await signedInPage(browser, {
    role: 'admin', id: uid.admin, name: 'Admin User',
    orders: [orderFor({ payment_method: 'UPI', payment_status: 'pending', upi_transaction_id: 'UTR123456789' }),
             orderFor({ id: 'o-2', order_number: '#1006', payment_method: 'COD', payment_status: 'pending' })]
  });
  const body = await page.locator('body').innerText();
  record('admin', 'admin reaches the admin section', /Dashboard|Live Orders|Payment Verification/i.test(body));

  await page.getByRole('button', { name: /payment verification/i }).first().click().catch(() => {});
  await page.waitForTimeout(700);
  const pv = await page.locator('body').innerText();
  record('admin', 'Payment Verification tab opens', /Payment Verification/i.test(pv));
  record('admin', 'UPI order listed', /#1005/.test(pv));
  record('admin', 'COD order excluded from the queue', !/#1006/.test(pv));
  record('admin', 'transaction reference shown', /UTR123456789/.test(pv));
  record('admin', 'Verify and Reject controls present',
    /Verify Payment/i.test(pv) && /Reject Payment/i.test(pv));
  record('admin', 'no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 1).join('') || 'clean');
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n== J4. Admin authorisation — a customer must not reach admin ==');
{
  const { ctx, page } = await signedInPage(browser, {
    role: 'customer', id: uid.customerB, name: 'Customer B'
  });
  await page.evaluate(() => window.history.pushState({}, '', '/admin'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const body = await page.locator('body').innerText();
  record('security', 'customer cannot see admin data',
    !/Payment Verification|Live Orders|Pending Registrations/i.test(body) || /Admin Access Only|Restricted/i.test(body),
    'guard screen or menu, never the admin console');
  record('security', 'demo role switcher absent in this build', !/Switch Role to Admin/i.test(body));
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n== J5. Kitchen — payment badges ==');
{
  const cases = [
    ['UPI pending → warn',   { payment_method: 'UPI', payment_status: 'pending' },   /Pending Verification/i],
    ['UPI completed → green', { payment_method: 'UPI', payment_status: 'completed' }, /Payment Confirmed/i],
    ['UPI rejected → do not prepare', { payment_method: 'UPI', payment_status: 'rejected' }, /do not prepare/i],
    ['COD → pay on delivery', { payment_method: 'COD', payment_status: 'pending' },   /Pay on delivery/i]
  ];
  for (const [label, over, expected] of cases) {
    const { ctx, page } = await signedInPage(browser, {
      role: 'admin', id: uid.admin, name: 'Admin User',
      orders: [orderFor({ ...over, status: 'pending' })]
    });
    await page.getByRole('button', { name: /^kitchen$/i }).first().click().catch(() => {});
    await page.waitForTimeout(700);
    const body = await page.locator('body').innerText();
    record('kitchen', label, expected.test(body));
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
console.log('\n== J6. Driver isolation — the previously-found PII leak ==');
{
  const aOrder = orderFor({ id: 'oA', order_number: '#2001', status: 'out_for_delivery',
    driver_id: uid.driverA, driver_name: 'Driver A',
    customer_name: 'Alice Anderson', customer_phone: '9111111111', delivery_address: 'Alice Street 1' });
  const bOrder = orderFor({ id: 'oB', order_number: '#2002', status: 'out_for_delivery',
    driver_id: uid.driverB, driver_name: 'Driver B',
    customer_name: 'Bob Brown', customer_phone: '9222222222', delivery_address: 'Bob Street 2' });

  // Driver A sees both rows from the API (RLS lets team members read orders),
  // so the UI filter is what must isolate them.
  const { ctx, page } = await signedInPage(browser, {
    role: 'driver', id: uid.driverA, name: 'Driver A', orders: [aOrder, bOrder]
  });
  // The driver entry point lives inside the account dropdown, so it must be
  // opened first -- clicking the hidden item silently does nothing.
  //
  // Waits on the element becoming visible rather than a fixed delay. A fixed
  // 400ms passed when run alone and failed when the machine was busy, which is
  // the worst kind of test: one that reports a bug that is not there.
  await page.locator('header button').filter({ hasText: /Driver A|DRIVER/i }).first()
    .click().catch(() => {});
  const portal = page.getByRole('button', { name: /driver portal/i }).first();
  await portal.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await portal.click().catch(() => {});
  await page.locator('text=/Driver Portal|Assigned|Deliveries/i').first()
    .waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const body = await page.locator('body').innerText();

  record('security', 'Driver A sees their own order', /#2001|Alice Anderson/.test(body));
  record('security', "Driver A cannot see Driver B's order number", !/#2002/.test(body));
  record('security', "Driver A cannot see Driver B's customer name", !/Bob Brown/.test(body));
  record('security', "Driver A cannot see Driver B's phone", !/9222222222/.test(body));
  record('security', "Driver A cannot see Driver B's address", !/Bob Street 2/.test(body));
  record('integrity', 'no fabricated GPS distance claimed', !/1\.2 km|Live GPS Navigation Active/.test(body));
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n== J7. Signed-in responsive sweep ==');
{
  for (const dev of ['iPhone 13', 'Pixel 5']) {
    const { ctx, page } = await signedInPage(browser, {
      role: 'customer', id: uid.customerA, name: 'Customer A',
      orders: [orderFor()], device: dev
    });
    const { sw, cw } = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth
    }));
    record('responsive', `${dev} signed in — no horizontal overflow`, sw <= cw + 1, `${sw}/${cw}`);
    await ctx.close();
  }
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n===== ${results.length - failed.length}/${results.length} passed =====`);
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach((f) => console.log(`  ${f.area} · ${f.name} — ${f.detail}`));
}
process.exit(failed.length ? 1 : 0);
