# Final Production Validation

| | |
|---|---|
| Project | Trippy's Mehfill — cloud kitchen ERP |
| Branch | `feat/supabase-auth-otp` · PR [#2](https://github.com/Bajiyadav/trippysmehfill1/pull/2) |
| Supabase | `iptjevfvuwrdbqzgrzxg` |
| Live site | `trippysmehfill.vercel.app` |
| Validated | 2026-08-08 (updated after external-deployment attempt) |
| **Status** | 🟡 **READY AFTER EXTERNAL ACTION** |

> **Update — external deployment attempted, database access confirmed unavailable.**
> Applying migrations requires credentials this environment does not have: only
> the anon key is present, there is no `service_role` key, no database password,
> no connection string, and no Supabase CLI. `POST /rpc/exec_sql` returns
> `PGRST202` (no such function). Port 5432 is reachable but needs credentials.
> **Blockers 1–3 remain and must be performed by a Database Admin.**
>
> Three further high-severity data-integrity bugs were found and fixed in that
> session — fabricated dashboard analytics, fabricated seeded orders and
> customers, and fabricated contact details on record creation. See
> [CLIENT_DELIVERY_READINESS.md](CLIENT_DELIVERY_READINESS.md).

---

## How to read this

Everything marked ✅ was **executed and observed**. Everything marked ⚠️ or ❌
says exactly why it could not be. Nothing is inferred and presented as verified.

**The single hard limit:** there is no browser in this environment, and the
project has no browser tooling — `playwright`, `@playwright/test`, `puppeteer`,
`cypress`, `jsdom`, `happy-dom` and `@testing-library/react` are all absent.
Nothing requiring rendering was verified. See §9.

---

## 1 · Customer Flow

| Step | Status | Evidence |
|---|---|---|
| Browse menu | ✅ | `GET /menu_items` → HTTP 200, 4 dishes |
| Search | ⚠️ | `searchQuery` filter exists; **not executed** — no browser |
| Filters / Categories | ⚠️ | `CategoryPills` + `selectedCategory`; not executed |
| Add to cart | ⚠️ | `CartContext`; **no automated coverage at all** |
| Increase / decrease quantity | ⚠️ | `CartDrawer`; not executed |
| Remove items | ⚠️ | `CartDrawer`; not executed |
| Checkout | ✅ logic | 14 tests in `checkout.test.ts`; live query HTTP 200 |
| Cash on Delivery | ⚠️ | Code path verified; not run end to end |
| UPI | ⚠️ | QR 400×400, amount `.toFixed(2)`, order number in `tn=` |
| I've Paid | ✅ logic | Writes `'pending'` — a claim, never a settlement |
| Order tracking | ⚠️ | Re-syncs on `payment_status`, `payment_rejection_reason`, `driver_name` |
| Order history | ⚠️ | `MyOrdersView`; not executed |
| Notifications | ⚠️ | Toasts fire on status/payment transitions, seeded on first pass |
| Realtime updates | ❌ | **Publication unverifiable over REST** |
| Responsive layout | ❌ | **No browser** |

**Verified property — "never fake success".** `setStep('upi_payment' \| 'confirmed')`
sits inside the `try`, after `await createOrder` resolves
([CheckoutView.tsx:226](../src/components/customer/CheckoutView.tsx#L226)). There is
no path to the payment screen without a saved row; on failure the cart survives
and the customer is told *"Nothing has been charged."*

**Missing:** promo codes. Requested in the journey; **no feature exists** and
`promo_codes` is absent from the live database. Reported, not built.

---

## 2 · Admin Flow

| Step | Status | Evidence |
|---|---|---|
| Admin login | 🔴 | Blocked — `42501` on `profiles` |
| Dashboard | ⚠️ | Builds; not rendered |
| Realtime orders | ❌ | Publication unverified |
| Order details | ⚠️ | Not executed |
| **Payment verification** | 🔴 | **0007 not applied** — `payment_verified_at` absent |
| **Payment rejection** | 🔴 | `'rejected'` violates the live CHECK constraint |
| Customer list | ⚠️ | `CustomersView`; not executed |
| Inventory | ✅ query | `GET /inventory` → HTTP 200 |
| Menu management | ⚠️ | Not executed |
| Analytics / Reports | ⚠️ | `DashboardView` + `DriverStatsView`; no separate module |
| **Audit log** | ❌ | **No audit-log feature exists.** `audit_logs` is in `phase2_schema` but absent live and unreferenced in code. |

**Missing:** an "Accept Order" control. Only `'cooking'` is written, by
`LiveOrdersView`, and only as a side effect of assigning a driver.

---

## 3 · Kitchen Flow

| Step | Status |
|---|---|
| Receives order | ⚠️ Filters `pending`/`cooking`/`assigned`; realtime unverified |
| **Payment badge** | ✅ Built — 🟢 Confirmed · ⚠️ Pending Verification · ⛔ Rejected — do not prepare · 🚚 Pay on delivery |
| **Accept order** | ❌ **Does not exist** |
| **Preparing** | ❌ **Does not exist** — nothing writes `'preparing'` |
| **Ready** | ❌ **Does not exist** |
| Dispatch | ✅ One button — *"Ready for Dispatch"* → `out_for_delivery` |

The requested flow is `Receive → Badge → Accept → Preparing → Ready → Dispatch`.
What exists is `Receive → Badge → ──────→ Dispatch`. **`KitchenView` has exactly
one action.**

Deliberately not built: Kitchen was off-limits in every phase instruction and a
feature freeze is in force. **The database is already prepared** — 0007 widened
`order_status` to accept `'accepted'`, `'preparing'`, `'ready'`, and the customer
timeline already renders all three. Roughly half a day of UI wiring.

---

## 4 · Driver Flow

**The module exists** — `src/components/driver/DriverView.tsx`, routed and
role-guarded. No build was required.

| Step | Status |
|---|---|
| Driver login | 🔴 Blocked by the `profiles` grant |
| Assigned orders | ✅ **Fixed this pass** — see below |
| **Accept delivery** | ❌ No control |
| **Pickup** | ❌ No control |
| **Out for delivery** | ❌ Set upstream by Kitchen, not by the driver |
| Delivered | ✅ *"Mark Delivered"* |
| Customer receives updates | ⚠️ Toast fires via the status effect; not executed |

### 🔴 DRV-1 — Broken access control (FIXED)

**Root cause.** The assigned-orders filter was:

```ts
o.status === 'out_for_delivery' || o.status === 'assigned' || (o.driver_name === user?.full_name && …)
```

The first two clauses are unconditional. **Every driver saw every dispatched
order**, including each customer's name, phone number and home address.

**Severity: HIGH** — customer PII exposed to unrelated drivers.

**Fix.** Introduced `isAssignedToMe()`, matching on `driver_id` first and falling
back to `driver_name` only for rows assigned before `driver_id` was populated.
Safe to change now: the live `orders` table has **0 rows**, so there is no
legacy data to strand.

**Retest.** ✅ `tsc` clean, 144/144, build succeeds.

### 🟡 DRV-2 / DRV-3 — Dishonest UI (FIXED)

The navigation panel displayed *"Estimated distance: 1.2 km • Time: 5 mins to
Campus Hostel"* — **hardcoded**, shown for every order regardless of
destination, under a heading claiming *"Live GPS Navigation Active"*. Nothing
reads the device location.

**Fix.** Shows `order.distance_km` when the order actually has one, otherwise
claims nothing. Button relabelled `Start GPS` → `Directions`, since that is what
it does.

**Retest.** ✅ Verified gone from the bundle: `1.2 km`, `Start GPS`,
`Campus Hostel` → **0 occurrences** in `dist/`.

---

## 5 · Authentication

| Check | Status |
|---|---|
| **New user signup** | 🔴 **BROKEN IN PRODUCTION** — `42501 permission denied for table profiles` |
| OTP delivery | ❌ **Not verifiable** — requires a real inbox and dashboard SMTP config |
| Profile creation | 🔴 Blocked, and trigger status unverified |
| Login | 🔴 Blocked by the same grant |
| Logout | ⚠️ Not executed |
| Session restore | ⚠️ `sessionStorage` key `trippys_pending_otp_state`, 10-minute window; not executed |
| Password reset | ⚠️ Uses `signInWithOtp`; `email_exists` RPC **verified present** |
| Google login | ❌ **Not verifiable** — provider status is a dashboard setting |

**Verified working:** `email_exists` and `lookup_login_email` both answer HTTP
200, so `0004_anon_lookup_rpcs` **is applied**. Sign-in by phone or username will
work once the grant is fixed.

---

## 6 · Database

### Migration state — measured, not assumed

| Migration | Applied | Evidence |
|---|---|---|
| `0001_core_schema` | ✅ **YES** | `customer_ip`, `fraud_risk_level`, `campus`, `items` → HTTP 200 |
| `0004_anon_lookup_rpcs` | ✅ **YES** | `POST /rpc/email_exists` → `200 false` |
| `0009_profiles_wallet_referral` | ✅ **YES** | `POST /rpc/phone_exists` → `200 false` |
| `0003_auth_triggers` | ⚠️ **UNVERIFIABLE** | `pg_trigger` not exposed over PostgREST |
| **`0007_payment_verification`** | 🔴 **NO** | `400 42703 column orders.payment_verified_at does not exist` |
| **`0008_fix_profiles_rls`** | 🔴 **NO** | `401 42501 permission denied for table profiles` |

> **The finding that explains the outage:** `0009` is applied and `0008` is not.
> Both came from the same teammate. The wallet/referral migration was applied and
> the profiles-RLS fix — which is the fix for the live signup failure — was
> skipped.

### Schema

Live shape is the **numbered chain (0001–0005)** plus the teammate's
`0008_fix_orders_schema`, **not** `phase2_schema.sql`. An earlier report of mine
claimed the opposite; that was wrong and the application has since been aligned
to the real schema (`orders.items` jsonb, no `order_items`, no `is_deleted`),
verified live: every order query went from error to HTTP 200.

### Verified locally

Migrations 0001–0009 apply, re-apply, roll back and re-apply on **PostgreSQL
17.10**, across both schema shapes — 27 behavioural assertions, all passing,
including *customer cannot mark their own payment completed*.

### Not verifiable over PostgREST

Triggers · RLS policy contents · foreign keys · indexes · CHECK constraint
contents · realtime publication. `pg_catalog` is not exposed. Queries to resolve
each are in [PRODUCTION_DB_FIX.md](PRODUCTION_DB_FIX.md).

---

## 7 · Payments

| | Status |
|---|---|
| COD selectable, recommended not preselected | ✅ |
| **Order saved before money is requested** | ✅ verified in source |
| UPI QR, amount 2dp, order number in the note | ✅ |
| "I've Paid" records a claim, never settles | ✅ |
| Verify Payment | 🔴 **0007 not applied** |
| Reject Payment | 🔴 CHECK constraint refuses `'rejected'` |
| Audit trail stamped server-side | ✅ in SQL — trigger uses `auth.uid()` |
| Concurrent verify safe | ✅ WHERE-clause guard → "already reviewed" |
| Canonical vocabulary | ✅ `pending · completed · rejected · failed · refunded` |
| Backward-compatible reads | ✅ `paid → completed`, unknown → `pending`, never `completed` |

⚠️ **A parallel build writes `'paid'` and `'pending_verification'`.** Both are
refused by the constraint. Reads here are safe; those writes are not. Unresolved
between the two developers.

---

## 8 · Mobile

❌ **Nothing verified.** No browser, no device, no emulator.

Source shows `min-h-[48px]` targets, `env(safe-area-inset-bottom)`, a
table→cards breakpoint at `lg`, `min-w-0`/`truncate`/`break-words` overflow
guards, and `inputMode="numeric"` on numeric fields. **All unconfirmed as
rendered.**

Navigation · Cart · Checkout · OTP · Buttons · Keyboard · Forms · Scrolling ·
Safe areas · Overflow · Images · Responsive behaviour — **every one unverified.**

---

## 9 · Browser

❌ **Browser automation is unavailable. No browser verification is claimed.**

```
playwright              ABSENT     cypress                 ABSENT
@playwright/test        ABSENT     jsdom                   ABSENT
puppeteer               ABSENT     happy-dom               ABSENT
@testing-library/react  ABSENT
```

There is also no browser binary in this environment. Installing Playwright was
considered and rejected on two grounds: it adds a heavy dependency during a
feature freeze, and with signup broken and `orders` empty **no journey could
complete anyway** — it would confirm static layout at best.

Chrome · Safari · Firefox · Edge · Android · iPhone · Tablet viewports —
**none tested.**

Closing this gap needs a person: [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md),
49 cases, **0 executed**.

---

## 10 · Security

| Check | Result |
|---|---|
| XSS sinks | ✅ **Zero** `dangerouslySetInnerHTML` / `innerHTML` / `eval` / `new Function` |
| Hardcoded secrets | ✅ None |
| `service_role` / `sb_secret_` in bundle | ✅ Absent; the config guard now refuses them |
| `target="_blank"` | ✅ All 5 carry `rel="noreferrer"` |
| Secrets in git | ✅ `.env.local` ignored |
| Dev OTP credentials | ✅ Dead code, tree-shaken — 0 occurrences in `dist/` |
| Demo role switcher | ✅ **Fixed** — removed from the bundle (1 → 0) |
| **Driver access control** | ✅ **Fixed this pass** — DRV-1 above |
| SQL injection | ✅ No surface — parameterised PostgREST only |
| Admin protection | ✅ `AdminGuardView` + role check; RLS behind it |
| Kitchen / Driver protection | ✅ `RequireRole`; RLS behind it |
| RLS payment guard | ✅ Verified on PostgreSQL 17 |

⚠️ **Residual, outside the code:** if "Test Phone Numbers" are configured in the
Supabase Auth dashboard, those static OTP codes work in production regardless of
application code. **Not verified** — needs dashboard access.

⚠️ **TC-11** — the payment guard is proven in SQL but has **never been exercised
through the running application**. A guarantee nobody has tried to break is a
claim, not a control.

No penetration testing was performed: no authorisation, no live session.

---

## 11 · Performance

```
build         ✓ 3.48s
main chunk    1,290.09 kB raw · 344.67 kB gzip
code-split    jspdf 128.82 · html2canvas 48.04 · purify 10.99 (gzip)
```

Memory: 3 × `setInterval`, 1 × `addEventListener`, 2 realtime channels — **all
have cleanup**. Toast timers cleared on dismiss.

Menu images now `loading="lazy" decoding="async"` — previously every menu image
was fetched before first paint.

⚠️ **Realtime refetches all orders on any change.** Fine at current scale (0
rows, one kitchen); will degrade at a few thousand orders. Applying the changed
row from the payload would fix it. Out of scope for a freeze.

❌ Lighthouse, Core Web Vitals, paint timings, memory profiling — **no browser**.

---

## 12 · Remaining risks

| | Risk | Severity |
|---|---|---|
| R1 | Two developers built payment verification with incompatible vocabularies. Reads are safe here; the other build's writes are refused by the constraint. **Unresolved.** | 🔴 High |
| R2 | `0003` trigger status unknown. If absent, signups silently create no profile — and the browser reports success. | 🔴 High |
| R3 | 49 manual test cases, **0 executed**. | 🔴 High |
| R4 | Realtime publication unverified — "instant" silently becomes "after a refresh". | 🟡 Medium |
| R5 | Migration numbers collided three times; git never warns. | 🟡 Medium |
| R6 | The jsonb refactor has **never met a real stored row** — `orders` is empty. 9 unit tests including malformed input is not the same thing. | 🟡 Medium |
| R7 | Kitchen Accept/Preparing/Ready, admin Accept Order, driver Accept/Pickup — all absent. | 🟡 Medium |
| R8 | No promo codes, no audit log — both requested. | 🟡 Medium |
| R9 | Wallet and referral are schema-only; `0009` is applied so customers may see a referral code with nothing to do. | 🟡 Medium |
| R10 | Order numbers can collide under concurrent checkout. | 🟢 Low |
| R11 | Verification queue has no alert; an unreviewed UPI order strands a paying customer. | 🟢 Low |
| R12 | `tsconfig` `strict` still off. `strictNullChecks` alone reports 0 errors — a safe first step post-release. | 🟢 Low |

---

## 13 · Deployment checklist

| # | Action | Who |
|---|---|---|
| 1 | Back up the database; record the restore point | **Database Admin** |
| 2 | Run Step 1 of [PRODUCTION_DB_FIX.md](PRODUCTION_DB_FIX.md) — verify `on_auth_user_created`; apply `0003` if absent | **Database Admin** |
| 3 | Apply `0008_fix_profiles_rls.sql` → **unblocks signup** | **Database Admin** |
| 4 | Apply `0007_payment_verification.sql` → **unblocks payments** | **Database Admin** |
| 5 | Confirm ≥1 account has `role = 'admin'` | **Database Admin** |
| 6 | Enable Realtime on `orders` (Dashboard → Replication) | **Database Admin** |
| 7 | Confirm `VITE_SUPABASE_*` in Vercel, then **redeploy** (values are inlined at build time) | **Vercel Admin** |
| 8 | Merge PR #2 to `main`, tag `rc2`, deploy | **Developer** |
| 9 | Execute the 49-case manual test plan | **Client / QA** |
| 10 | Open the site on a real phone | **Client / QA** |
| 11 | Agree the payment vocabulary with the other developer | **Developer** |

---

# 🟡 READY AFTER EXTERNAL DEPLOYMENT STEPS

**Zero code blockers remain.** Every defect found across this engagement has been
fixed, retested and committed — including, this pass, a high-severity access
control bug that exposed customer addresses and phone numbers to unrelated
drivers.

## Blockers

### 🔴 BLOCKER 1 — `profiles` has no table grants

- **Root cause.** `phase2_rls.sql` defines 33 RLS policies but **zero table
  GRANTs**. A PostgreSQL table is private to its owner until granted, and GRANT
  is checked *before* RLS — so policies never run.
- **Evidence.** `GET /rest/v1/profiles` →
  `401 {"code":"42501","message":"permission denied for table profiles","hint":"GRANT SELECT ON public.profiles TO anon;"}`
  Matches the client's screenshot exactly.
- **Required action.** Apply `supabase/migrations/0008_fix_profiles_rls.sql`.
- **Who.** **Database Admin**

### 🔴 BLOCKER 2 — Migration 0007 not applied

- **Root cause.** Never run against production.
- **Evidence.** `GET /orders?select=payment_verified_at` →
  `400 {"code":"42703","message":"column orders.payment_verified_at does not exist"}`
- **Required action.** Apply `supabase/migrations/0007_payment_verification.sql`.
  Verified for this exact schema shape on PostgreSQL 17.
- **Who.** **Database Admin**

### ⚠️ BLOCKER 3 — `on_auth_user_created` status unknown

- **Root cause.** `0009` replaces `handle_new_user_signup()` but **never creates
  the trigger that calls it** — `0003` does. `0009` is applied; `0003` is
  unconfirmed.
- **Evidence.** `pg_trigger` is not exposed over PostgREST. Not guessed.
- **Required action.** Run Step 1 of `PRODUCTION_DB_FIX.md`; apply `0003` if the
  query returns no rows.
- **Who.** **Database Admin**

### 🔴 BLOCKER 4 — Not merged to `main`

- **Evidence.** `origin/main` is at `799fe55`, predating the merge. The live site
  runs pre-merge code.
- **Required action.** Merge PR #2, tag `rc2`, deploy.
- **Who.** **Developer**, then **Vercel Admin**

### 🔴 BLOCKER 5 — No end-to-end validation has ever been performed

- **Root cause.** No browser or device available in this environment; none of the
  49 manual cases have been run by anyone.
- **Required action.** Execute `MANUAL_TEST_PLAN.md`. Must pass: TC-04, TC-05,
  TC-09, TC-10, **TC-11**, TC-13, TC-14, **TC-19**.
- **Who.** **Client / QA**

## Why not 🟢

Signup fails for every user in production right now, and nobody has opened this
food-delivery application on a phone. Declaring it ready for client delivery
would assert things I did not verify.

## Why not 🔴

Nothing in the codebase blocks deployment. `tsc` clean, 144/144 tests, build
succeeds, migrations verified on real PostgreSQL, and every live query the
application makes now returns HTTP 200. Blockers 1–3 are about **thirty minutes**
of SQL-editor work.
