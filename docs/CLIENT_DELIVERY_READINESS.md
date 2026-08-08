# Client Delivery Readiness

| | |
|---|---|
| Commit | `ac9821a` |
| Branch | `feat/supabase-auth-otp` · PR [#2](https://github.com/Bajiyadav/trippysmehfill1/pull/2) |
| Supabase | `iptjevfvuwrdbqzgrzxg` |
| Date | 2026-08-08 |
| **Status** | 🟡 **READY AFTER EXTERNAL ACTION** |

---

## Readiness matrix

| Area | Tested | Passed | Failed | Not Implemented | Evidence |
|---|---|---|---|---|---|
| **Customer journey** | Partial | Logic | Live flow | Promo codes | 14 checkout tests; live queries HTTP 200; **no browser** |
| **Authentication** | ❌ Blocked | — | Signup | — | `42501 permission denied for table profiles` |
| **OTP** | ❌ Not testable | — | — | — | Needs a real inbox; SMTP is a dashboard setting |
| **Checkout** | Logic only | ✅ 14 tests | — | — | `checkout.test.ts` |
| **COD** | Logic only | ✅ | — | — | Timeline asserts no payment steps for cash |
| **UPI** | Logic only | ✅ | — | — | QR 400×400, amount 2dp, order number in `tn=` |
| **Payment verification** | ❌ Blocked | — | — | — | 0007 not applied; `payment_verified_at` absent |
| **Admin** | Static only | Code review | Login | Audit log | Cannot log in |
| **Kitchen** | Static only | Badge built | — | **Accept / Preparing / Ready** | One action exists |
| **Driver** | Static only | ✅ **PII fix** | — | **Accept / Pickup** | DRV-1 fixed and verified |
| **Realtime** | ❌ | — | — | — | Publication not readable over PostgREST |
| **Security** | ✅ Static | ✅ 12 checks | — | — | 0 XSS sinks, 0 secrets, PII leak fixed |
| **RLS** | ✅ In SQL | ✅ 27 assertions | — | — | PostgreSQL 17 harness |
| **Mobile** | ❌ | — | — | — | **No browser, no device** |
| **Desktop** | ❌ | — | — | — | **No browser** |
| **Accessibility** | Partial | Images 9/9 | — | — | Source only; no screen reader |
| **Database** | ✅ Probed | Schema, columns | 0007, 0008 | — | Read-only REST probes |
| **Build** | ✅ | ✅ | — | — | `tsc` clean, build 3.37s |
| **Regression** | ✅ | ✅ 144/144 | — | — | Run after every fix |

---

## Fixed this session

### 🔴 BUG-07 · Fabricated analytics on the admin dashboard · HIGH

**Root cause.** Four display elements presented invented numbers as real
business data:

- *"Top Customer Today: Rahul Sharma (Hostel 4) · ₹1,240 spent · 4 orders"* — a
  person who does not exist
- *"Inventory Low Alert: Basmati Rice (4.5kg left)"* — hardcoded; the component
  receives no inventory data and cannot know this
- *"Monthly Revenue"* computed as `totalRevenue * 3.4`, with *"Target 94%
  achieved"* hardcoded
- *"Top Selling Dish"* defaulting to *"Chicken Dum Biryani"* with zero orders

**Evidence.** `grep "Rahul" dist/assets/index-*.js` → `1`

**Fix.** Month-to-date revenue and top customer are now derived from real
delivered orders. Inventory points to the Inventory tab rather than inventing a
figure. Empty states are honest.

**Test result.** ✅ `grep` → `0` for all four. 144/144 pass.

**Why it mattered.** A restaurant owner could have made stocking or staffing
decisions on `totalRevenue * 3.4`.

### 🔴 BUG-09 · Fabricated orders and customers seeded into the app · HIGH

**Root cause.** `App.tsx` seeded `orders`, `customersList`, `pendingUsers`,
`staffList` and `feedback` from `initialData`. Before Supabase responded — or
whenever it failed — the dashboard, Live Orders, Kitchen and Payment
Verification all displayed four fabricated orders.

**Evidence.** `grep -o "Utfi - Keity\|Rakesh Ranjan\|Sajid\|Shruti" dist/…` → `4`

**Fix.** People and orders start empty. The menu keeps its fallback: that is the
restaurant's own content, not a record of a person or a transaction.

**Test result.** ✅ All four → `0`. Bundle 344.71 → 343.54 kB gzip.

**Why it mattered.** The kitchen could have tried to cook orders that do not
exist.

### 🟠 BUG-08 · Fabricated contact details on record creation · MEDIUM

**Root cause.** `phone.trim() || '9876543210'` and
`hostelAddress.trim() || 'Goenka University Campus - Hostel Gate 5'`. A record
looked complete while carrying a phone number and address belonging to nobody.

**Fix.** Phone required; nothing substituted.

**Test result.** ✅ `tsc` clean, 144/144.

### 🔴 DRV-1 · Driver PII exposure · HIGH *(fixed previous session, re-verified)*

Every driver saw every dispatched order — customer name, phone, address.
Fixed with `isAssignedToMe()` matching on `driver_id`. ✅ Verified in place.

---

## Blockers — all external

### 🔴 BLOCKER 1 · `profiles` has no table grants

- **Root cause.** `phase2_rls.sql` defines 33 RLS policies and **zero table
  GRANTs**. PostgreSQL checks GRANT *before* RLS, so policies never run.
- **Evidence.** `GET /rest/v1/profiles` → `401 {"code":"42501","message":"permission denied for table profiles"}`
- **Required action.** Apply `supabase/migrations/0008_fix_profiles_rls.sql`
- **Who.** **Database Admin**

### 🔴 BLOCKER 2 · Migration 0007 not applied

- **Evidence.** `GET /orders?select=payment_verified_at` → `400 42703 column does not exist`
- **Required action.** Apply `supabase/migrations/0007_payment_verification.sql`
- **Who.** **Database Admin**

### ⚠️ BLOCKER 3 · `on_auth_user_created` status unknown

- **Root cause.** 0009 replaces `handle_new_user_signup()` but never creates the
  trigger — 0003 does. **0009 is confirmed applied; 0003 is not confirmed.**
- **Evidence.** `pg_trigger` is not exposed over PostgREST. Not guessed.
- **Required action.** Step 1 of [PRODUCTION_DB_FIX.md](PRODUCTION_DB_FIX.md)
- **Who.** **Database Admin**

### 🔴 BLOCKER 4 · Not merged to `main`

- **Evidence.** `origin/main` at `799fe55`, predating the merge.
- **Who.** **Developer**, then **Vercel Admin**

### 🔴 BLOCKER 5 · No end-to-end validation has ever been performed

- **Evidence.** 49 manual cases, 0 executed. No browser or device here.
- **Who.** **Client / QA**

---

## Untestable, and what would be required

| Item | Why not testable | What is required |
|---|---|---|
| Applying migrations | Only the anon key is available. No `service_role`, no DB password, no connection string, no Supabase CLI. `POST /rpc/exec_sql` → `PGRST202` (no such function). Port 5432 is open but needs credentials. | Supabase dashboard access |
| Signup, OTP, login, logout, session restore | Signup fails at the database; OTP needs a real inbox | Blockers 1–3 cleared, then a person with an email account |
| Every browser and viewport | **No browser binary here.** `playwright`, `puppeteer`, `cypress`, `jsdom`, `happy-dom`, `@testing-library/react` are all absent | A person with Chrome/Safari/Firefox/Edge and a phone |
| Two-session realtime | Needs two authenticated browsers | Blockers cleared + two browsers |
| Driver A vs Driver B isolation | Needs two driver accounts and live orders | Blockers cleared. **The code fix is in place and reviewed; the behaviour is unproven.** |
| Admin every-button audit | Cannot log in | Blocker 1 cleared |
| Screen readers, contrast, keyboard | No browser, no AT | Manual audit with VoiceOver/NVDA and a contrast tool |
| Load and performance | No browser | Lighthouse on the deployed site |

**Playwright was considered and rejected**: it adds a heavy dependency during a
freeze, and with signup broken and zero orders no journey could complete — it
would confirm static layout at best.

---

## Not implemented — future scope, not blockers

Kept explicitly separate, and **not built**:

| Feature | Status |
|---|---|
| Kitchen Accept / Preparing / Ready | **NOT IMPLEMENTED.** Kitchen has one action. The database already accepts these states (0007 widened `order_status`) and the customer timeline renders them — roughly half a day of UI wiring. |
| Admin "Accept Order" | **NOT IMPLEMENTED.** Only `'cooking'`, as a side effect of assigning a driver. |
| Driver Accept / Pickup / Out-for-delivery | **NOT IMPLEMENTED.** Driver has Directions and Mark Delivered. |
| Promo codes | **NOT IMPLEMENTED.** No feature; `promo_codes` absent from the live database. |
| Audit log | **NOT IMPLEMENTED.** `audit_logs` absent live and unreferenced. |
| Wallet / referral spending | **SCHEMA ONLY.** 0009 is applied, so codes generate, but nothing redeems. |
| Notifications, banners, gallery tables | Services exist; tables absent live. |

---

## Verification evidence

```
tsc --noEmit        clean (React types installed this engagement — JSX was
                    previously unchecked across all 48 .tsx files)
node:test           144 / 144 pass, 0 fail
npm run build       ✓ 3.37s · 343.54 kB gzip
migrations          0001–0009 apply, re-apply, roll back and re-apply on
                    PostgreSQL 17.10 across both schema shapes · 27 assertions
live REST probes    orders, menu, inventory queries all HTTP 200
bundle scan         0 fabricated customers, 0 fake analytics, 0 demo controls,
                    0 secrets
```

---

# 🟡 READY AFTER EXTERNAL ACTION

**Zero code blockers.** Every defect found has been fixed, retested and
committed — including three high-severity data-integrity bugs found in this
session that were presenting invented customers, orders and revenue to the
client as real.

🟢 is not available, and the gap is not the code:

| 🟢 requires | Status |
|---|---|
| Production database verified | 🔴 0007 and 0008 not applied |
| Signup works | 🔴 fails for every user |
| Customer / Admin / Kitchen / Driver journeys | ❌ none executed |
| Payment flow works | 🔴 blocked on 0007 |
| Realtime works | ❌ unverified |
| Security checks pass | ✅ static; RLS proven in SQL |
| Mobile and desktop tested | ❌ **no browser or device available** |
| No critical/high bugs | ✅ all fixed |
| No PII leakage | ✅ DRV-1 fixed |
| No fake-success paths | ✅ verified |
| Build and regression pass | ✅ |

---

## What you personally need to do, in order

### A · Supabase — Database Admin (~30 minutes)

1. **Back up.** Dashboard → Database → Backups. Record the restore point.
2. **Run Step 1 of [PRODUCTION_DB_FIX.md](PRODUCTION_DB_FIX.md)** — the trigger
   query. If it returns no rows, apply `0003_auth_triggers.sql`.
3. **Apply `supabase/migrations/0008_fix_profiles_rls.sql`.** *This is the fix
   for the signup failure in your screenshot.* Run its verification SQL.
4. **Apply `supabase/migrations/0007_payment_verification.sql`.** Expect
   `orders_payment_status_check widened with 'rejected'`. Run its verification SQL.
5. **Confirm at least one admin:** `SELECT count(*) FROM profiles WHERE role='admin';`
   If 0: `UPDATE profiles SET role='admin' WHERE email='you@example.com';`
6. **Dashboard → Database → Replication** — confirm `orders` is toggled on.
   *SQL cannot do this one.*

### B · Vercel — Vercel Admin (~5 minutes)

7. Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set for
   Production. Both key formats now work.
8. **Redeploy after any change** — `VITE_*` is inlined at build time.

### C · GitHub — Developer (~5 minutes)

9. Merge PR #2 into `main`, tag `rc2`, deploy.

### D · Browser and phone — Client / QA (~2 hours)

10. Sign up with a fresh email. Then confirm the profile row actually exists:
    `SELECT * FROM profiles WHERE email='<address>';` — **zero rows means the
    trigger is not wired**, even though the browser said success.
11. Place a COD order, then a UPI order.
12. As admin, verify one payment and reject the other.
13. **Two browsers side by side, no refreshing** — customer and admin. Confirm
    the order appears and the payment status flips live.
14. **Two driver accounts** — confirm Driver A cannot see Driver B's orders.
    *This is the fix for the PII bug; the code is correct but the behaviour is
    unproven.*
15. Open the site on a real phone. An emulator will not catch tap targets, safe
    areas or keyboard overlap.
16. Work [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) — must pass TC-04, TC-05,
    TC-09, TC-10, **TC-11**, TC-13, TC-14, **TC-19**.

### E · Team — Developer

17. Agree the payment vocabulary with your teammate. His build writes `'paid'`
    and `'pending_verification'`; the constraint refuses both. Reads here are
    safe, his writes are not.

**When A–D are complete and the eight must-pass cases are green, this is
🟢 READY FOR CLIENT DELIVERY.**
