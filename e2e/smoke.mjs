/**
 * Real-browser smoke suite.
 *
 * Run against a dev server:  npx vite --port 4321  then  node e2e/smoke.mjs
 *
 * This exists because the project had no browser tooling at all, so every
 * claim about rendering, routes, console errors and responsive layout was
 * unverifiable. It does not need a working database: it checks that the
 * application renders, that no route blanks or throws, and that no viewport
 * scrolls sideways.
 */
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4321';
const results = [];
const record = (area, name, pass, detail = '') => {
  results.push({ area, name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${area} · ${name}${detail ? ` — ${detail}` : ''}`);
};

// Noise we do not control: Supabase auth errors caused by the known missing
// grant, and Vite's dev-only HMR chatter. Everything else is a real defect.
const IGNORED = [
  /permission denied for table profiles/i,
  /42501/,
  /\[vite\]/i,
  /Download the React DevTools/i,
  /favicon/i,
  /Supabase\] Authentication is disabled/i,
  // Unprovisioned optional tables. The app now degrades to an empty list
  // instead of throwing (see services/supabase/optionalTable.ts), but the
  // browser still logs the 404 for the request itself. The request is
  // legitimate and the response is handled.
  /Failed to load resource.*40[41]/i,
  /Failed to load resource: the server responded with a status of 40[41]/i
];
const isRealError = (t) => !IGNORED.some((r) => r.test(t));

const VIEWPORTS = [
  ['mobile-320', 320, 640],
  ['mobile-375', 375, 667],
  ['mobile-390', 390, 844],
  ['mobile-430', 430, 932],
  ['tablet-768', 768, 1024],
  ['laptop-1024', 1024, 768],
  ['desktop-1280', 1280, 800],
  ['desktop-1440', 1440, 900]
];

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
console.log('\n== A. Landing page renders, no console errors ==');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && isRealError(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`UNCAUGHT: ${e.message}`));

  const resp = await page.goto(BASE, { waitUntil: 'networkidle' });
  record('landing', 'HTTP 200', resp.status() === 200, `status ${resp.status()}`);

  const bodyText = (await page.locator('body').innerText()).trim();
  record('landing', 'page is not blank', bodyText.length > 100, `${bodyText.length} chars rendered`);

  const rootChildren = await page.locator('#root > *').count();
  record('landing', 'React mounted', rootChildren > 0, `${rootChildren} root children`);

  record('landing', 'no uncaught console errors', errors.length === 0,
    errors.length ? errors.slice(0, 2).join(' | ') : 'clean');

  // Menu should come from the live database (menu_items is readable).
  const hasMenu = await page.getByText(/biryani|menu|order/i).first().isVisible().catch(() => false);
  record('landing', 'menu content rendered', hasMenu);

  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n== B. No horizontal overflow at any viewport ==');
{
  for (const [name, w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth
    }));
    // 1px tolerance for sub-pixel rounding.
    record('responsive', name, scrollW <= clientW + 1, `scroll ${scrollW} vs client ${clientW}`);
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
console.log('\n== C. Real devices ==');
{
  for (const dev of ['iPhone 13', 'Pixel 5', 'iPad (gen 7)']) {
    const ctx = await browser.newContext({ ...devices[dev] });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth
    }));
    const text = (await page.locator('body').innerText()).trim();
    record('device', dev, scrollW <= clientW + 1 && text.length > 100 && errors.length === 0,
      `scroll ${scrollW}/${clientW}, ${text.length} chars, ${errors.length} errors`);
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
console.log('\n== D. Tap targets on mobile ==');
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const small = await page.evaluate(() => {
    const bad = [];
    for (const b of document.querySelectorAll('button, a[href]')) {
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;          // hidden
      if (r.height < 32 && (b.textContent || '').trim().length > 0) {
        bad.push(`${(b.textContent || '').trim().slice(0, 24)} (${Math.round(r.height)}px)`);
      }
    }
    return bad;
  });
  record('a11y', 'no text control under 32px tall', small.length === 0,
    small.length ? `${small.length}: ${small.slice(0, 3).join(', ')}` : 'all >= 32px');
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n== E. Keyboard and focus ==');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });

  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    return el && el !== document.body ? el.tagName : null;
  });
  record('a11y', 'Tab moves focus into the page', Boolean(focused), `focused ${focused}`);

  const visible = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const s = getComputedStyle(el);
    return s.outlineStyle !== 'none' || s.boxShadow !== 'none' || el.className.includes('focus');
  });
  record('a11y', 'focused element is visually indicated', visible);
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n== F. Images load ==');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const failed = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'image' && r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 60)}`);
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  record('assets', 'no broken images', failed.length === 0, failed.slice(0, 2).join(' | ') || 'all loaded');

  const noAlt = await page.evaluate(() =>
    [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('alt')).length);
  record('a11y', 'every rendered image has alt', noAlt === 0, `${noAlt} missing`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log('\n== G. Deep-link routes do not blank or crash ==');
{
  for (const path of ['/', '/menu', '/checkout', '/orders', '/admin', '/driver', '/does-not-exist']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    const resp = await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => null);
    await page.waitForTimeout(300);
    const text = (await page.locator('body').innerText().catch(() => '')).trim();
    record('routes', path, Boolean(resp) && text.length > 50 && errs.length === 0,
      `${resp ? resp.status() : 'no response'}, ${text.length} chars, ${errs.length} errors`);
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
console.log('\n== H. No fabricated data rendered ==');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const body = await page.locator('body').innerText();
  const fabricated = ['Rahul Sharma', 'Utfi - Keity', 'Rakesh Ranjan', 'Basmati Rice (4.5kg',
                      'Switch Role to Admin', '1.2 km', 'Payment Success'];
  const found = fabricated.filter((f) => body.includes(f));
  record('integrity', 'no fabricated customer or analytics on screen', found.length === 0,
    found.join(', ') || 'clean');
  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n===== ${results.length - failed.length}/${results.length} passed =====`);
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach((f) => console.log(`  ${f.area} · ${f.name} — ${f.detail}`));
}
process.exit(failed.length ? 1 : 0);
