# Production Readiness Report

| | |
|---|---|
| Release | RC2 |
| Commit | `093a892` |
| Branch | `feat/supabase-auth-otp` (in sync with `origin`) |
| Supabase project | `iptjevfvuwrdbqzgrzxg` |
| Live site | `trippysmehfill.vercel.app` |
| Date | 2026-08-07 |
| **Recommendation** | 🔴 **NO-GO — 5 hard blockers** |

---

## Correction to earlier reports

**I previously stated the live database was built from `phase2_schema.sql`. That
was wrong.** I inferred it from the application code — `orders.ts` queries
`order_items` and `is_deleted`, both of which only exist in that file — and
reasoned backwards from code to database. I have now probed the live project
directly, and the evidence is the opposite:

| Marker | Belongs to | Live database |
|---|---|---|
| `orders.customer_ip` | `0001_core_schema.sql` | **present** |
| `orders.fraud_risk_level` | `0001_core_schema.sql` | **present** |
| `orders.gps_accuracy` | `0001_core_schema.sql` | **present** |
| `orders.campus` | `0001_core_schema.sql` | **present** |
| `orders.items` (jsonb) | `0001_core_schema.sql` | **present** |
| `orders.is_deleted` | `phase2_schema.sql` | **ABSENT** |
| `menu_items.is_deleted` | `phase2_schema.sql` | **ABSENT** |
| `order_items` table | `phase2_schema.sql` | **ABSENT** |
| `notifications`, `banners`, `gallery_items`, `categories` | `phase2_schema.sql` | **ABSENT** |
| `orders.utr_number`, `orders.payment_time` | teammate's `0008_fix_orders_schema.sql` | **present** |

**The live database is the numbered chain (roughly 0001–0005), plus your
teammate's `0008_fix_orders_schema.sql`. It is not `phase2_schema.sql`.**

This matters, because it means the application code was written against a schema
the database does not have. That is blocker **P1** below, and it is the most
serious finding in this report.

Migration 0007 is unaffected — it detects the schema shape at runtime and was
verified against both. It will take the CHECK-constraint path here.

`DATABASE_MIGRATION_0007.md`, `RELEASE_NOTES.md`, `RC2_SUMMARY.md` and the three
checklists all repeat the incorrect claim and need amending.

---

## Method

Everything marked **VERIFIED** was executed. Nothing here is inferred.

| Verified by running it | Not verifiable from here |
|---|---|
| Git state, build, tests, typecheck | Anything needing the Supabase dashboard |
| Live schema probes via PostgREST (read-only, anon key) | `pg_catalog` / `information_schema` (not exposed over REST) |
| Deployment config in the repo | Vercel dashboard environment variables |
| Bundle contents | Anything needing a browser or an email inbox |

Live probes were **read-only GETs**. No writes were made to your database.

---

## STEP 1 — Git ✅ PASS

```
working tree      clean
branch            feat/supabase-auth-otp
HEAD              093a892  feat(kitchen): show payment state on the ticket
remote            in sync — 0 unpushed commits
stashes           0
```

RC2 commit range (`rc1-docs..HEAD`): 10 commits, including the upstream merge,
the RC2 documentation and the kitchen payment badge.

- [x] All RC2 commits pushed
- [x] Working tree clean
- [x] No uncommitted files
- [ ] **Branch merged to `main` — NOT DONE.** PR #2 is open and mergeable.
      `origin/main` is at `799fe55`, which predates the merge.

---

## STEP 2 — Live database 🔴 FAIL

### Migration status

| Migration | Marker probed | Applied? |
|---|---|---|
| 0001–0005 | `customer_ip`, `fraud_risk_level`, `campus` | **YES** (approximately) |
| 0006 `customer_order_updates` | policy — not probeable over REST | **UNKNOWN** |
| **0007 `payment_verification`** | `orders.payment_verified_at` | 🔴 **NO** |
| **0008 `fix_profiles_rls`** | `GRANT` on profiles | 🔴 **NO** — see STEP 3 |
| **0009 `profiles_wallet_referral`** | `profiles.wallet_balance` | **UNKNOWN** — profiles unreadable |
| teammate's `0008_fix_orders_schema` | `orders.utr_number`, `payment_time` | **YES** |

Evidence for 0007 not applied:

```
GET /rest/v1/orders?select=payment_verified_at
  400  {"code":"42703","message":"column orders.payment_verified_at does not exist"}
GET /rest/v1/orders?select=payment_verified_by
  400  {"code":"42703","message":"column orders.payment_verified_by does not exist"}
GET /rest/v1/orders?select=payment_rejection_reason
  400  {"code":"42703","message":"column orders.payment_rejection_reason does not exist"}
```

**Your teammate has been applying his migrations to the live project. Yours have
not been applied.**

### Object presence

| Object | Status |
|---|---|
| `profiles` | present, **but unreadable — no grants** |
| `orders` | present, readable, **0 rows** |
| **`order_items`** | 🔴 **ABSENT** |
| `menu_items` | present, readable, seeded |
| `kitchen_settings` | present, `restaurant_upi_id = 7671018717-2@ybl` |
| `inventory`, `feedback`, `payments` | present |
| `notifications`, `banners`, `gallery_items`, `categories` | absent |

### Not verifiable over REST — needs the SQL editor

- `handle_new_user_signup()` — **UNKNOWN**
- `on_auth_user_created` trigger on `auth.users` — **UNKNOWN**
- Realtime publication on `orders` — **UNKNOWN**
- RLS policies and triggers — **UNKNOWN**
- `payment_status` CHECK constraint contents — **UNKNOWN**

Paste this into the Supabase SQL editor to close those gaps:

```sql
-- 1. signup trigger + function
SELECT t.tgname, p.proname AS calls, t.tgenabled
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal;
-- expect: on_auth_user_created | handle_new_user_signup | O

-- 2. realtime
SELECT tablename FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
-- expect a row for 'orders'

-- 3. RLS on
SELECT relname, relrowsecurity FROM pg_class
 WHERE relnamespace = 'public'::regnamespace
   AND relname IN ('profiles','orders','order_items');

-- 4. policies
SELECT tablename, policyname, cmd FROM pg_policies
 WHERE tablename IN ('profiles','orders') ORDER BY 1,2;

-- 5. grants
SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type)
  FROM information_schema.role_table_grants
 WHERE table_schema='public' AND table_name IN ('profiles','orders')
   AND grantee IN ('anon','authenticated')
 GROUP BY 1,2 ORDER BY 1,2;

-- 6. payment_status constraint
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.orders'::regclass AND conname LIKE '%payment_status%';
```

---

## STEP 3 — Permissions 🔴 FAIL

### `public.profiles` — **NO GRANTS**

```
GET /rest/v1/profiles?select=*&limit=1
  401  {"code":"42501",
        "message":"permission denied for table profiles",
        "hint":"Grant the required privileges to the current role with:
                GRANT SELECT ON public.profiles TO anon;"}
```

PostgreSQL is naming the fix itself. **This is the exact error on your live site
screenshot** — *"Profile creation failed: permission denied for table profiles"*.

**Why:** Postgres has two independent permission layers. `GRANT` decides whether
a role may touch a table at all; RLS decides which rows. `42501 permission denied
for table` is the *first* layer failing — RLS is never reached. Your team wrote
33 RLS policies in `phase2_rls.sql` but **zero table GRANTs**; a table is private
to its owner until granted. The rules for which room you may enter were written
in detail; the front door was never unlocked.

**Fix:** `supabase/migrations/0008_fix_profiles_rls.sql`, line 9 —
`GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;`
Its own header quotes your exact error string. Your teammate wrote the fix; it
was never applied.

### `public.orders` — grants OK

Readable over REST (returns `[]`), so `anon`/`authenticated` hold at least SELECT.

### `public.order_items` — **table does not exist**

---

## STEP 4 — Authentication 🔴 BLOCKED

Cannot be tested from here — it needs a real inbox to receive an OTP.

| Check | Status |
|---|---|
| Signup | 🔴 **KNOWN BROKEN** — the live screenshot shows it failing on `profiles` |
| OTP received | UNTESTED — needs Brevo SMTP verification in the dashboard |
| OTP verification | UNTESTED |
| `auth.users` row created | UNTESTED — likely fine; Auth owns that schema |
| `profiles` row created | 🔴 **KNOWN BROKEN** — no grant, and trigger status unknown |
| Login / Logout / Session restore | UNTESTED |

**Signup is confirmed broken in production** — not by inference, by your own
screenshot plus a reproduced `42501` from the live REST API.

---

## STEP 5 — Customer flow 🔴 BLOCKED

Code-level behaviour is verified by 128 automated tests. Runtime behaviour
against the live database is **broken**, because the orders service queries
objects the database does not have.

```
-- exactly what ordersService.fetchOrders() runs:
GET /rest/v1/orders?select=*,order_items(*)&is_deleted=eq.false
  {"code":"PGRST200",
   "details":"Searched for a foreign key relationship between 'orders' and
              'order_items' in the schema 'public', but no matches were found."}

-- without the join:
GET /rest/v1/orders?select=*&is_deleted=eq.false
  {"code":"42703","message":"column orders.is_deleted does not exist"}
```

| Step | Status |
|---|---|
| Browse menu | ✅ `menu_items` readable and seeded |
| Add items | ✅ client-side |
| Checkout | 🔴 `createOrder` inserts into `order_items` — **table absent** |
| COD | 🔴 same |
| UPI | 🔴 same |
| I've Paid | 🔴 `updatePaymentStatus` needs a saved order |
| Track order | 🔴 `fetchOrders` / `fetchOrderById` both fail |
| No fake success screens | ✅ verified in code — the UPI screen is reachable only after `createOrder` resolves, and failure keeps the cart intact with *"Nothing has been charged."* |

The **"no fake success"** guarantee holds: with the database in this state a
customer sees an honest error, not a false confirmation. The flow is broken, but
it is not lying.

---

## STEP 6 — Admin 🔴 BLOCKED

| Check | Status |
|---|---|
| Receives new orders | 🔴 orders cannot be created |
| Realtime updates | UNKNOWN — publication unverifiable over REST |
| Payment Verification tab | ✅ builds and typechecks; **cannot function** — 0007 not applied |
| Verify Payment | 🔴 writes `payment_status='completed'` and reads back `order_items` — both fail |
| Reject Payment | 🔴 writes `'rejected'`, which the CHECK constraint forbids until 0007 |

---

## STEP 7 — Kitchen ⚠️ PARTIAL

The badge is implemented and verified at build level (`093a892`), reading from
`paymentLabel()` / `paymentTone()`:

| State | Badge |
|---|---|
| UPI verified | 🟢 Payment Confirmed |
| UPI unsettled | ⚠️ Pending Verification |
| UPI rejected | ⛔ Payment Rejected — do not prepare |
| COD | 🚚 Pay on delivery |

🔴 **Cannot be exercised live** — no orders can be created, and `'rejected'` is
not a storable value until 0007 is applied. Realtime badge updates untested.

---

## STEP 8 — Deployment ⚠️ ISSUE FOUND

| Check | Status |
|---|---|
| `VITE_SUPABASE_URL` | ✅ `https://iptjevfvuwrdbqzgrzxg.supabase.co`, reachable, Auth health 200 |
| `VITE_SUPABASE_ANON_KEY` (local) | 🔴 **`sb_publishable_…`** — the app **refuses** this format |
| `vercel.json` | ✅ build `npm run build`, output `dist`, SPA rewrite present |
| Node pin | ⚠️ Netlify pins 20; Vercel pins nothing; built here on 24.11.1 |
| `service_role` in bundle | ✅ absent |
| Two host configs | ⚠️ both `vercel.json` and `netlify.toml` present — confirm which is authoritative |

**The local `.env.local` holds a publishable key**, and `src/lib/supabase.ts`
rejects it explicitly:

> *"VITE_SUPABASE_ANON_KEY is set to a publishable key ('sb_publishable_...').
> Please replace it with the JWT anon public key ('eyJhbGci...')."*

So `npm run dev` locally shows the config error screen. **Production is evidently
configured differently** — the live site reaches the database (it returned a real
`42501`, not a config screen), so Vercel must hold the legacy JWT key.

Two things follow, and they pull in opposite directions:

1. If Supabase has migrated this project to the **new API key format**, the
   app's guard is out of date and will reject a *valid* key. That guard is in
   application code and I have not changed it.
2. Regardless, **local and production environments disagree**, which means local
   testing does not reflect production.

Confirm the Vercel value before deploying: Project → Settings → Environment
Variables. Remember `VITE_*` is inlined at **build** time — changing it requires
a redeploy.

---

## STEP 9 — Build gate ✅ PASS

```
tsc --noEmit     clean, no output
node:test        128 / 128 pass, 0 fail
npm run build    ✓ built in 6.60s
```

| Asset | Raw | gzip |
|---|---|---|
| `index-*.js` | 1,289.69 kB | **344.39 kB** |
| `jspdf.es.min-*.js` | 390.77 kB | 128.82 kB |
| `html2canvas.esm-*.js` | 202.38 kB | 48.04 kB |
| `index-*.css` | 82.42 kB | 13.11 kB |

Vite warns above 500 kB raw. Not a blocker — the heaviest dependencies are
code-split and load only when a receipt is generated.

---

## Blockers

### 🔴 P1 — `order_items` does not exist, and neither does `orders.is_deleted`

**The application cannot read or write orders on this database at all.**

Affects `fetchOrders`, `fetchCustomerOrders`, `fetchOrderById`, `createOrder`,
`verifyPayment`, `rejectPayment` — every order path in the app.

The code was written against `phase2_schema.sql`; the database is the numbered
chain. Both exist in this repository and they disagree.

**This needs a decision, not just a fix, because there are two valid answers and
they collide with your teammate's work differently:**

| Option | What it means | Risk |
|---|---|---|
| **A — change the database** | New migration creating `order_items` + FK, and adding `orders.is_deleted`. No application change; all Phase 2/3 verification stays valid. | Two places would then hold line items — `orders.items` jsonb *and* `order_items`. Your teammate's code writes the jsonb column. They will diverge. |
| **B — change the code** | `ordersService` reads/writes `orders.items` jsonb and drops the `is_deleted` filter. Matches the live database and your teammate's code. | Touches the core of Phase 2/3. Needs re-verification. Contradicts your "no source changes" instruction, so it needs your explicit go-ahead. |

I recommend **B**, because it converges with your teammate instead of creating a
second source of truth for line items — but it is your call, and it is not a
change I will make unprompted.

### 🔴 P2 — `profiles` has no table grants

Signup is broken in production right now. Every registration fails.

**Fix:** apply `supabase/migrations/0008_fix_profiles_rls.sql`. One statement
matters most:

```sql
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
```

### 🔴 P3 — Migration 0007 not applied

Payment verification cannot function. `Verify` fails on missing columns; `Reject`
fails because `'rejected'` violates the CHECK constraint.

**Fix:** apply `supabase/migrations/0007_payment_verification.sql`. It will take
the CHECK-constraint path. Verified on PostgreSQL 17 for this exact shape.

### 🔴 P4 — Signup trigger status unknown

RC2 moved profile creation out of the browser into `handle_new_user_signup()`.
**Migration 0009 replaces that function but never creates the trigger — 0003
does.** If 0003 has not run, signup silently produces an auth user with no
profile and no role, with no error anywhere.

**Fix:** run query 1 in STEP 2. If absent, apply
`supabase/migrations/0003_auth_triggers.sql`.

### 🔴 P5 — Not merged to `main`

`origin/main` is at `799fe55`, predating the merge. The live site is running old
code. PR #2 is open and mergeable.

---

## Known risks (not blockers)

| | Risk |
|---|---|
| R1 | **Two people built payment verification incompatibly.** Yours: `completed` / `rejected`. His: `paid` / `pending_verification`. Same column, mutually exclusive. Unresolved. |
| R2 | **Migration numbers have collided three times** — two `0006`, two `0007`, two `0008`. Git never warns, because filenames differ. His `0008_fix_orders_schema.sql` is applied live; yours is not. |
| R3 | Realtime publication unverified. Without it, every "instant" update becomes "after a refresh". |
| R4 | Wallet and referral are schema-only — codes generated, nothing spends or redeems. |
| R5 | Verification queue has no alert. An unreviewed UPI order strands a paying customer indefinitely. |
| R6 | Order numbers can collide under concurrent checkout. |
| R7 | Test phone numbers in the Supabase Auth dashboard, if any, accept static OTP codes in production. |
| R8 | Manual test plan: 49 cases, 0 executed. |

---

## GO / NO-GO

### 🔴 NO-GO

**The build is sound. The database is not.**

```
git      ✅ clean, pushed, in sync
tsc      ✅ clean
tests    ✅ 128 / 128
build    ✅ 344 kB gzip
schema   🔴 the application cannot read or write orders
auth     🔴 signup fails on every attempt
0007     🔴 not applied — payment verification cannot function
```

This is not a marginal call. Two core journeys — **registration** and **placing
an order** — are confirmed broken against the live project, by direct probe, not
by inference.

### Ordered path to GO

```
 1. P1  DECIDE: change the database (A) or the code (B)        You + teammate
 2. R1  DECIDE: whose payment vocabulary wins                  You + teammate
 3.     BACK UP THE DATABASE — record the timestamp            DBA
 4. P4  verify on_auth_user_created; apply 0003 if absent      DBA
 5. P2  apply 0008_fix_profiles_rls.sql                        DBA
 6. P3  apply 0007_payment_verification.sql                    DBA
 7.     apply 0009 if wallet/referral is wanted                DBA
 8. P1  implement the decision from step 1                     Dev
 9.     re-run tsc + tests + build                             Dev
10. R3  enable Realtime on orders in the dashboard             DBA
11.     confirm the Vercel anon key format                     Dev
12. P5  merge PR #2 to main, tag rc2, deploy                   Dev
13. R8  execute the manual test plan                           QA
          must pass: TC-04 TC-05 TC-09 TC-10 TC-11 TC-13 TC-14 TC-19
```

Steps 1 and 2 are conversations with your teammate, not tasks. Everything
downstream depends on them.

**This release is not ready for production.** It will be once P1–P5 are cleared
and the eight must-pass cases are green.

---

## What I did not do

- Did not write features, refactor, or change UI
- Did not modify source code — no deployment blocker had an unambiguous fix
  that did not also require your decision (see P1)
- Did not write to your database; every probe was a read-only GET
- Did not guess: every ❌ above is backed by a quoted error from your live
  project, and every UNKNOWN is labelled as such with the query to resolve it
