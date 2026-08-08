# Deployment Checklist — RC2

**Commit `6eadb35`** · Phase 3 payment verification + merged OTP improvements
· Migrations **0001 – 0009**

Everything to verify **before** RC2 reaches production. Work top to bottom;
each section gates the next.

Companion documents:
[GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) · [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) · [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md) · [DATABASE_MIGRATION_0007.md](DATABASE_MIGRATION_0007.md)

---

## What I could and could not verify

| Verified locally by running it | Cannot verify from here |
|---|---|
| TypeScript, tests, production build | Your Supabase project's actual schema |
| Migration 0007 forward + rollback on real PostgreSQL 17, both schemas | Whether Realtime is enabled for your project |
| Static analysis of the Supabase surface the app depends on | Whether SMTP (Brevo) is configured |
| Deploy configs, env var handling, secret hygiene | Anything requiring a browser or two devices |

Every "cannot verify" item below has a **paste-and-run** query or an explicit
manual step. Nothing is asserted that was not actually checked.

---

## 0 · Build gate

```bash
npm ci
npm run lint     # tsc --noEmit
npm test         # tsx --test *.test.ts
npm run build
```

**Verified 2026-08-07:**

```
tsc --noEmit     clean, no output
tests            128 / 128 pass, 0 fail
build            ✓ built in 21.41s
```

Bundle output:

| Asset | Raw | gzip |
|---|---|---|
| `index-*.js` | 1,282.11 kB | **342.31 kB** |
| `jspdf.es.min-*.js` | 390.77 kB | 128.82 kB |
| `html2canvas.esm-*.js` | 202.38 kB | 48.04 kB |
| `index.es-*.js` | 159.76 kB | 53.56 kB |
| `index-*.css` | 82.15 kB | 13.05 kB |

Vite warns that the main chunk exceeds 500 kB. **Not a blocker** — 342 kB gzip is
acceptable for an authenticated app, and the three heaviest dependencies (jsPDF,
html2canvas, DOMPurify) are already code-split and load only when a receipt is
generated. Worth revisiting after go-live, not before.

- [ ] `npm ci` completes with no peer-dependency errors
- [ ] `npm run lint` produces no output
- [ ] `npm test` reports 128/128
- [ ] `npm run build` succeeds

---

## 1 · Source control

**Current state — this is a blocker.**

```
16 uncommitted files
branch: feat/supabase-auth-otp  (10 commits ahead of main)
```

Uncommitted, including all of Phase 3:

```
 M orderStatus.test.ts                              ?? DATABASE_MIGRATION_0007.md
 M src/App.tsx                                      ?? PHASE3_PAYMENT_VERIFICATION.md
 M src/components/admin/AdminHeaderNav.tsx          ?? src/components/admin/PaymentVerificationView.tsx
 M src/components/customer/CheckoutView.tsx         ?? supabase/migrations/0007_payment_verification.sql
 M src/components/customer/MyOrdersView.tsx         ?? supabase/migrations/0007_payment_verification_down.sql
 M src/components/customer/OrderProgressTimeline.tsx ?? supabase/verify/
 M src/components/customer/OrderTrackerModal.tsx
 M src/lib/orderStatus.ts
 M src/services/supabase/orders.ts
 M src/types/index.ts
```

- [ ] Phase 3 committed
- [ ] Pushed to `origin`
- [ ] PR opened against `main` and reviewed
- [ ] Merged — **deploy from `main`, not from the feature branch**
- [ ] Tag the release (`git tag phase-3` or similar) so [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md) has a target

**Secret hygiene — verified clean:** `.env.local` is matched by `.gitignore:7`
(`.env*`) and is not tracked. Only `.env.example` is in the repository, and it
contains variable names with no values.

- [ ] `git log -p --all -S 'eyJhbGci' -- '*.env*'` returns nothing (no key ever committed)

---

## 2 · Hosting and environment

**Both `vercel.json` and `netlify.toml` are present.** Confirm which host is
authoritative; leaving both is harmless but confusing.

| | Vercel | Netlify |
|---|---|---|
| Build | `npm run build` | `npm run build` |
| Output | `dist` | `dist` |
| SPA rewrite | ✅ `/(.*)` → `/index.html` | ✅ `/*` → `/index.html` (200) |
| Node pin | none | `NODE_VERSION = "20"` |

The SPA rewrite matters: without it a hard refresh on any route 404s.

**Node version:** built and tested locally on **v24.11.1**; Netlify is pinned to
**20**. Vite 6 supports both. Not a blocker, but pin Vercel too if that is your
host, so builds are reproducible.

- [ ] Confirmed which host is live; the other config is unused or removed
- [ ] SPA rewrite confirmed on the live host
- [ ] Node version pinned

### Environment variables

Only two are read, both in [src/lib/supabase.ts](../src/lib/supabase.ts):

```
VITE_SUPABASE_URL          https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY     eyJhbGci...   (JWT anon public key)
```

**Three traps the code already guards against — read the error, it names the fix:**

1. **`VITE_*` values are inlined at build time.** Changing them in the hosting
   dashboard does nothing until you **redeploy**. This is the single most common
   cause of "I updated the key and it still fails".
2. **The anon key must be the JWT (`eyJhbGci...`), not a publishable key
   (`sb_publishable_...`).** The app detects and names this specifically.
3. Placeholder values (`your-supabase-project`, `example.supabase.co`) are
   detected and refused rather than failing opaquely at runtime.

A misconfigured deployment renders `ConfigErrorScreen` with the exact missing
variable — so if you see that screen, the message tells you what to fix.

- [ ] Both variables set in the hosting dashboard, for the **production** environment
- [ ] Values taken from Supabase → Settings → API of the **production** project
- [ ] Anon key starts with `eyJhbGci`
- [ ] Redeployed **after** setting them

---

## 3 · Supabase — preflight

> **Run this in the Supabase SQL editor before anything else.** It is read-only
> and reports what is actually there. Do not proceed on assumptions — the
> repository contains two incompatible schemas (see
> [DATABASE_MIGRATION_0007.md](DATABASE_MIGRATION_0007.md)) and only an
> inspection tells you which one you have.

```sql
-- ============ PREFLIGHT: run BEFORE migration 0007 ============
-- Read-only. Nothing here modifies anything.

-- 1. Which schema shape is this?
SELECT column_name,
       data_type,
       udt_name,
       CASE WHEN data_type = 'USER-DEFINED' THEN 'ENUM (phase2_schema.sql)'
            ELSE 'text + CHECK (0001_core_schema.sql)' END AS schema_shape
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'orders'
   AND column_name IN ('id', 'status', 'payment_status', 'is_deleted', 'created_at')
 ORDER BY column_name;

-- 2. Required tables. Every row must say PRESENT.
SELECT t.name,
       CASE WHEN to_regclass('public.' || t.name) IS NULL THEN '*** MISSING ***'
            ELSE 'PRESENT' END AS status
  FROM (VALUES ('profiles'), ('orders'), ('order_items'), ('menu_items'),
               ('inventory'), ('inventory_transactions'), ('kitchen_settings'),
               ('banners'), ('gallery_items'), ('feedback'), ('notifications')
       ) AS t(name)
 ORDER BY 1;

-- 3. RPCs the app calls. Both must exist or sign-in paths degrade (see notes).
SELECT f.name,
       CASE WHEN to_regprocedure(f.sig) IS NULL THEN '*** MISSING ***'
            ELSE 'PRESENT' END AS status
  FROM (VALUES ('email_exists',       'public.email_exists(text)'),
               ('lookup_login_email', 'public.lookup_login_email(text)')
       ) AS f(name, sig);

-- 4. Does a new auth user get a profiles row?
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_trigger
          WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal
       ) THEN 'PRESENT' ELSE '*** MISSING — signups will not create a profile ***'
       END AS signup_trigger;

-- 5. Is RLS on for every table that holds customer data?
SELECT relname, CASE WHEN relrowsecurity THEN 'ON' ELSE '*** OFF ***' END AS rls
  FROM pg_class
 WHERE relnamespace = 'public'::regnamespace
   AND relname IN ('profiles','orders','order_items','feedback','notifications')
 ORDER BY 1;

-- 6. Is orders published to Realtime? Phase 3 depends on this.
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
       ) THEN 'PUBLISHED' ELSE '*** NOT PUBLISHED — 0007 will fix this ***'
       END AS realtime_orders;

-- 7. Can payment_status hold 'rejected' yet? Expect NO before 0007.
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.payment_status'::regtype
                                       AND enumlabel = 'rejected')
    THEN 'YES (enum)'
  WHEN EXISTS (SELECT 1 FROM pg_constraint
                WHERE conname = 'orders_payment_status_check'
                  AND pg_get_constraintdef(oid) LIKE '%rejected%')
    THEN 'YES (check)'
  ELSE 'NO — 0007 not yet applied'
END AS rejected_supported;

-- 8. At least one admin must exist, or nobody can verify a payment.
SELECT count(*) AS admin_count FROM public.profiles WHERE role::text = 'admin';
```

### Reading the results

- [ ] **§1** tells you your schema shape. 0007 handles both, but note which you have.
- [ ] **§2** every table `PRESENT`. `order_items` missing means you are on the
      numbered chain, and `fetchOrders` will fail — stop and reconcile first.
- [ ] **§3** both RPCs `PRESENT`.
      **If missing:** `email_exists` and `lookup_login_email` are defined only in
      `supabase/migrations/0004_anon_lookup_rpcs.sql`, which is *not* part of
      `phase2_schema.sql`. Missing `lookup_login_email` means sign-in by
      phone/username always answers *"No account found"*; missing `email_exists`
      breaks password reset the same way. **Email sign-in still works.**
      Pre-existing, not caused by Phase 3 — but fix before go-live by applying 0004.
- [ ] **§4** `PRESENT`. If missing, apply `0003_auth_triggers.sql` +
      `0005_signup_trigger_telemetry.sql`, or new signups get an auth user with
      no profile row and no role.
- [ ] **§5** every table `ON`.
- [ ] **§6** note the answer; 0007 fixes `NOT PUBLISHED`.
- [ ] **§7** expect `NO` before the migration.
- [ ] **§8** `admin_count >= 1`. If zero, promote someone:
      `UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';`

---

## 4 · Migration 0007

Full detail, including the verification transcript and the three bugs the
harness caught, is in **[DATABASE_MIGRATION_0007.md](DATABASE_MIGRATION_0007.md)**.

### 4.1 Verify it locally first (optional but cheap)

Needs `psql` and any reachable local PostgreSQL. Creates and drops two scratch
databases (`t_enum`, `t_check`) and touches nothing else.

```bash
./supabase/verify/run_migration_checks.sh
```

Expected last line:

```
RESULT: all migration checks passed
```

### 4.2 Take a backup

**Do not skip this.** Supabase Dashboard → Database → Backups → note the latest
point-in-time restore timestamp, or take a manual snapshot.

- [ ] Backup taken, timestamp recorded: `________________`

### 4.3 Run it

Paste `supabase/migrations/0007_payment_verification.sql` into the Supabase SQL
editor and execute.

**Expected output** — `NOTICE` lines telling you which path was taken:

```
NOTICE:  0007: payment_status enum extended with 'rejected'
NOTICE:  0007: order_status enum extended with accepted/preparing/ready
NOTICE:  0007: public.orders added to the supabase_realtime publication
NOTICE:  0007: created fallback public.is_team_member()
```

On the CHECK-constraint schema you will instead see:

```
NOTICE:  0007: orders_payment_status_check widened with 'rejected'
NOTICE:  0007: orders_status_check widened
```

Either set is correct. Other benign notices (`already exists, skipping`,
`does not exist, skipping`) are expected — the file is idempotent.

**If you see `unsafe use of new value`:** your client wrapped the file in a
single transaction. PostgreSQL forbids *using* a new enum value in the
transaction that added it. Run section 1 alone first, then the rest.

- [ ] Migration executed
- [ ] Notices match one of the two sets above
- [ ] No `ERROR` lines

### 4.4 Post-migration verification

```sql
-- ============ POSTFLIGHT: run AFTER migration 0007 ============

-- 'rejected' is now storable
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.payment_status'::regtype
                                       AND enumlabel = 'rejected') THEN 'OK (enum)'
  WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check'
                  AND pg_get_constraintdef(oid) LIKE '%rejected%') THEN 'OK (check)'
  ELSE '*** FAILED ***' END AS rejected_supported;

-- Audit columns
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_name = 'orders'
   AND column_name IN ('payment_verified_at','payment_verified_by','payment_rejection_reason')
 ORDER BY 1;
-- Expect exactly 3 rows, all is_nullable = YES:
--   payment_rejection_reason | text                        | YES
--   payment_verified_at      | timestamp with time zone    | YES
--   payment_verified_by      | uuid                        | YES

-- Indexes
SELECT indexname FROM pg_indexes
 WHERE tablename = 'orders' AND indexname LIKE 'orders_payment%' ORDER BY 1;
-- Expect: orders_payment_pending_idx, orders_payment_status_idx

-- Trigger
SELECT tgname, tgenabled FROM pg_trigger
 WHERE tgrelid = 'public.orders'::regclass AND tgname = 'trg_enforce_customer_order_update';
-- Expect one row, tgenabled = 'O'

-- Customer update policy
SELECT policyname FROM pg_policies
 WHERE tablename = 'orders' AND policyname = 'orders_customer_update_own';
-- Expect one row

-- Realtime
SELECT tablename FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders';
-- Expect one row

-- No existing data was disturbed
SELECT payment_status, count(*) FROM public.orders GROUP BY 1 ORDER BY 1;
-- Compare against the same query run before the migration: counts must be identical,
-- and no row should have moved to 'rejected'.

-- Existing app queries still run
SELECT count(*) FROM public.orders o
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
 WHERE o.is_deleted = false;
```

- [ ] `rejected_supported` = OK
- [ ] 3 audit columns, all nullable
- [ ] 2 payment indexes
- [ ] Trigger present and enabled (`O`)
- [ ] `orders_customer_update_own` present
- [ ] `orders` published to Realtime
- [ ] `payment_status` counts unchanged from before
- [ ] Join query runs

### 4.6 Migrations 0008 and 0009 — merged from upstream

Apply **after** 0007. These were renumbered from upstream's `0006`/`0007`, which
collided with ours; git reported no conflict because the filenames differ.

> Their internal headers still read `0006` and `0007` from before the renumber.
> **The filenames are authoritative.** Cosmetic, but it misleads anyone reading
> the file top-down.

| | Migration | Adds |
|---|---|---|
| 0008 | `fix_profiles_rls` | `GRANT SELECT, INSERT, UPDATE` on `profiles` to `authenticated`; clean `profiles_select_own` / `_insert_own` / `_update_own` policies; `protect_privileged_profile_columns()` trigger blocking a customer from changing their own `role`, `is_approved` or `account_status` |
| 0009 | `profiles_wallet_referral` | `wallet_balance` (default `0.00`), `referral_code` (`TRIPPY-XXXX-1234`), `phone_exists(text)` RPC, and a replaced `handle_new_user_signup()` |

- [ ] 0008 applied
- [ ] 0009 applied
- [ ] Both re-applied once to confirm idempotency (harness proves this; confirm on yours)

### 4.7 Auth trigger and profile creation — **the RC2 critical path**

RC2 removed the client-side profile creation. `AuthModal` no longer builds a
`UserProfile` after OTP verification; `handle_new_user_signup()` does it on
`INSERT INTO auth.users`.

> **0009 replaces that function but never creates the trigger that calls it.**
> The trigger — `on_auth_user_created` — comes from **0003**.
>
> ```
> 0003  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
>         EXECUTE FUNCTION public.handle_new_user_signup();
> 0009  CREATE OR REPLACE FUNCTION public.handle_new_user_signup()   ← function only
> ```
>
> Apply 0009 without 0003 and you get a correct function **nothing calls**. Every
> signup then produces an auth user with no profile row and no role — and the
> browser still shows success. There is no error to notice.
>
> Your database was built from `phase2_schema.sql`, which contains none of the
> numbered migrations, so 0003 has very likely never run.

```sql
-- ============ AUTH VERIFICATION — run after the full chain ============

-- 1. Verify the auth.users trigger exists
SELECT tgname,
       CASE tgenabled WHEN 'O' THEN 'enabled' WHEN 'D' THEN '*** DISABLED ***'
                      ELSE tgenabled::text END AS state
  FROM pg_trigger
 WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
-- expect a row: on_auth_user_created | enabled

-- 2. Verify handle_new_user_signup() exists
SELECT CASE WHEN to_regprocedure('public.handle_new_user_signup()') IS NULL
            THEN '*** MISSING — signups will not create a profile ***'
            ELSE 'PRESENT' END AS signup_function;

-- 3. Verify the trigger actually points at it
SELECT p.proname AS function_called
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal;
-- expect: handle_new_user_signup

-- 4. Verify the payment trigger survived 0008 and 0009
SELECT tgname, tgenabled FROM pg_trigger
 WHERE tgrelid = 'public.orders'::regclass
   AND tgname = 'trg_enforce_customer_order_update';
-- expect one row, tgenabled = 'O'

-- 5. Verify every auth RPC the app calls
SELECT to_regprocedure('public.email_exists(text)')       AS email_exists,
       to_regprocedure('public.lookup_login_email(text)') AS lookup_login_email,
       to_regprocedure('public.phone_exists(text)')       AS phone_exists;
-- expect all three non-null

-- 6. Verify the new profile columns
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_name = 'profiles' AND column_name IN ('wallet_balance','referral_code')
 ORDER BY 1;
-- expect 2 rows; wallet_balance defaults to 0.00
```

- [ ] **4.7.1** `on_auth_user_created` present on `auth.users` and enabled
- [ ] **4.7.2** `handle_new_user_signup()` present
- [ ] **4.7.3** The trigger points at that function
- [ ] **4.7.4** Payment trigger still installed after 0008/0009
- [ ] **4.7.5** All three auth RPCs present
- [ ] **4.7.6** `wallet_balance` and `referral_code` columns exist

**Live proof — do this after deploying, before announcing:**

Sign up with a fresh address, then:

```sql
SELECT email, full_name, phone, role, wallet_balance, referral_code, is_approved
  FROM public.profiles WHERE email = '<the address you used>';
```

- [ ] Exactly one row, `role = 'customer'`, `wallet_balance = 0.00`,
      `referral_code` shaped `TRIPPY-XXXX-1234`

```sql
-- and no duplicates, which would mean two things are creating profiles
SELECT email, count(*) FROM public.profiles GROUP BY 1 HAVING count(*) > 1;
```

- [ ] No rows

This is **TC-19** in [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) and it is a
must-pass gate.

### 4.8 Rollback readiness

- [ ] `supabase/migrations/0007_payment_verification_down.sql` is on hand
- [ ] You have read the **lossy** steps in [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md)
      (`rejected → failed`, `accepted/preparing → cooking`, `ready → out_for_delivery`)
- [ ] Someone with SQL editor access is reachable during the deploy window

---

## 5 · Realtime

Phase 3's entire "no refresh" requirement rests on this.

### 5.1 Service enabled

Supabase Dashboard → Database → Replication → `supabase_realtime`.

- [ ] `public.orders` is listed and toggled on
- [ ] Realtime is enabled for the project (Dashboard → Settings → API)

Migration 0007 adds the table to the publication, but **the Realtime service
itself is a project setting** and cannot be turned on from SQL.

### 5.2 Subscription works

The client opens a channel per signed-in identity in
[src/App.tsx:169](../src/App.tsx#L169). The keying on `user?.id` is deliberate:
`postgres_changes` events are RLS-filtered against the token the socket joined
with, so a channel opened while anonymous stays anonymous.

Browser console on the live site, signed in as admin:

- [ ] No `CHANNEL_ERROR` or `TIMED_OUT` in the console
- [ ] Network → WS shows an open `realtime/v1/websocket` connection
- [ ] Insert a row from the SQL editor and watch the admin list update without a refresh:

```sql
-- harmless smoke test; delete it afterwards
INSERT INTO public.orders (order_number, customer_name, customer_phone,
                           delivery_address, subtotal, total_amount,
                           payment_method, payment_status, status)
VALUES ('#RT-TEST', 'Realtime Probe', '9999999999', 'Test', 1, 1, 'UPI', 'pending', 'pending');

-- then
DELETE FROM public.orders WHERE order_number = '#RT-TEST';
```

- [ ] The probe order appeared in Admin → Live Orders **and** Payment Verification without a refresh
- [ ] Probe row deleted

The full two-browser test is **TC-14** in [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md).

---

## 6 · Supabase Auth

Phase 1 moved authentication to Supabase Auth email OTP, with **Brevo as the SMTP
provider configured entirely in the dashboard** — there is no Brevo code in this
repository, and there must not be, since a `VITE_*` key would be inlined into the
client bundle.

- [ ] Dashboard → Authentication → Providers → Email enabled
- [ ] Dashboard → Project Settings → Auth → SMTP: Brevo host, port, login, key set
- [ ] **Site URL** set to the production origin (not `localhost`)
- [ ] **Redirect URLs** include the production origin
- [ ] Sent a real test OTP to an address you control and received it
- [ ] Checked the spam folder; sender domain authenticated (SPF/DKIM) if you own it

A wrong Site URL is the usual cause of OTP links that work locally and fail in
production.

---

## 7 · Admin surface

- [ ] Signed in as a user whose `profiles.role = 'admin'`
- [ ] Admin entry point visible in the header
- [ ] **Payment Verification** tab present, between Live Orders and Kitchen
- [ ] Tab shows a pulsing count badge when UPI orders are pending
- [ ] All twelve pre-existing tabs still present and working
- [ ] A non-admin signing in does **not** see the admin entry point, and visiting
      the admin section shows `AdminGuardView` rather than data

Functional tests are TC-06 … TC-10 in [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md).

---

## 8 · Customer surface

- [ ] COD checkout completes and confirms
- [ ] UPI checkout reaches the payment screen **only after the order row exists**
- [ ] Payment Status reads **Pending Verification** for an unsettled UPI order
- [ ] "I've Paid" records the reference and does **not** claim settlement
- [ ] Verified order reads **Payment Confirmed**
- [ ] Rejected order reads **Payment Rejected** with *"Please contact the restaurant."*
- [ ] Tracker shows Order Status, Payment Status, Estimated Delivery, Timeline
- [ ] Timeline shows payment steps for UPI and **not** for COD

Full cases: TC-01 … TC-13.

---

## 9 · Security spot-checks

These are enforced in the database, so they hold regardless of the UI. Confirm
once on production.

```sql
-- Nothing should be sitting at 'completed' without an audit trail after go-live.
-- Pre-existing rows will legitimately have NULLs; note the count now as a baseline.
SELECT count(*) AS completed_without_audit
  FROM public.orders
 WHERE payment_status::text = 'completed' AND payment_verified_by IS NULL;
```

- [ ] Baseline recorded: `________`
- [ ] After go-live, any *new* verification has `payment_verified_by` populated
- [ ] Anon key in the bundle is the **anon** key, never the service_role key:
      `grep -r "service_role" dist/ || echo "clean"` → expect `clean`

---

## 10 · Deployment go / no-go

**Blockers — do not deploy with any of these unresolved:**

- [ ] RC2 committed, reviewed, merged to `main`, tagged `rc2`
- [ ] Database backup taken, timestamp recorded
- [ ] **Migrations 0001 – 0009 applied in order**, postflight §4.4 all green
- [ ] **`on_auth_user_created` wired to `handle_new_user_signup()`** (§4.7) —
      without it every signup silently produces no profile
- [ ] **Payment trigger still installed after 0008/0009** (§4.7.4)
- [ ] **A real signup creates a `profiles` row** (§4.7 live proof / TC-19)
- [ ] `orders` published to Realtime **and** the Realtime service enabled
- [ ] At least one admin account exists
- [ ] Env vars set in production **and redeployed afterwards**
- [ ] Auth Site URL points at production; a real OTP was received
- [ ] `npm run build` succeeds from a clean `npm ci`

**Known, accepted, not blockers:**

- **Wallet and referral are schema-only.** 0009 adds the columns and generates
  codes; nothing spends, credits or redeems, and the 25% OFF referral is not
  wired into checkout. Dormant, not broken.
- **0008 / 0009 carry stale internal headers** reading `0006` / `0007` from
  before the renumber. The filenames are authoritative.
- Main bundle 344 kB gzip, over Vite's 500 kB raw warning threshold
- `initialOrders` seeds four example orders with invented names as a pre-Supabase
  fallback (flagged since Phase 1)
- Order numbers can collide under concurrent checkout — `nextOrderNumber` reads
  the client's list; needs a database sequence (flagged in Phase 2)
- Nothing writes `'accepted'`/`'preparing'`/`'ready'` yet; Kitchen still emits
  the legacy vocabulary. The mapping handles both, so no regression.
- Two incompatible schema files coexist in `supabase/`; every future migration
  must be written twice until they are reconciled

**Sign-off**

| Role | Name | Date |
|---|---|---|
| Built and tested | | |
| Migration applied | | |
| Manual test plan passed | | |
| Approved to go live | | |
