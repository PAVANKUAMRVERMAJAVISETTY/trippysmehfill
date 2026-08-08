# Go-Live Checklist — RC2

**Commit `6eadb35`** · Phase 3 payment verification + merged OTP improvements
· Migrations **0001 – 0009**

The ordered sequence for the day itself. Every step has a **verify** and a
**stop condition**. If a stop condition fires, go to
[ROLLBACK_PLAN.md](ROLLBACK_PLAN.md) — do not improvise forward.

Depth and rationale live in [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).
This page is the runbook.

---

## Before the window

| | Item | Verify | Done |
|---|---|---|---|
| 0.1 | Phase 3 merged to `main` | `git log --oneline -1 main` shows the merge | ☐ |
| 0.2 | Release tagged | `git tag` lists your tag | ☐ |
| 0.3 | Preflight SQL run (§3 of the deployment checklist) | No `MISSING`, no `OFF` | ☐ |
| 0.4 | At least one admin exists | `admin_count >= 1` | ☐ |
| 0.5 | Auth SMTP + Site URL point at production | Test OTP received | ☐ |
| 0.6 | Env vars set in the hosting dashboard | Both present, key starts `eyJhbGci` | ☐ |
| 0.7 | Two devices/browsers ready for TC-14 | — | ☐ |
| 0.8 | Someone with SQL-editor access on call | — | ☐ |

**Pick a quiet window.** Step 2 briefly changes order-table structure. Choose a
time when nobody is mid-checkout — for a food business, well outside service.

---

## Step 1 · Backup

```
Supabase Dashboard → Database → Backups
```

- ☐ Latest restore point noted: `________________________`
- ☐ Manual snapshot taken if PITR is not on your plan

**Stop condition:** no usable backup → **do not continue.**

---

## Step 2 · Apply migrations 0001 → 0009

**In numeric order, one at a time.** Do not paste them all at once — you need to
see which one fails if one does.

**Record the "before" counts first** — you need them for step 3:

```sql
SELECT payment_status, count(*) FROM public.orders GROUP BY 1 ORDER BY 1;
```

Before: `_______________________________________________`

| # | File | Verify immediately after | ☐ |
|---|---|---|---|
| 0001 | `core_schema` | `SELECT to_regclass('public.orders');` non-null | ☐ |
| 0002 | `rls_policies` | `SELECT to_regprocedure('public.is_team_member()');` non-null | ☐ |
| 0003 | `auth_triggers` | **`SELECT tgname FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal;`** → `on_auth_user_created` | ☐ |
| 0004 | `anon_lookup_rpcs` | `SELECT to_regprocedure('public.email_exists(text)');` non-null | ☐ |
| 0005 | `signup_trigger_telemetry` | applies without error | ☐ |
| 0006 | `customer_order_updates` | `orders_customer_update_own` in `pg_policies` | ☐ |
| **0007** | **`payment_verification`** | full postflight, step 3 below | ☐ |
| **0008** | `fix_profiles_rls` | 3 `profiles_%_own` policies exist | ☐ |
| **0009** | `profiles_wallet_referral` | `SELECT to_regprocedure('public.phone_exists(text)');` non-null | ☐ |

> ### ⚠️ 0003 is not optional in RC2
>
> RC2 moved profile creation out of the client into `handle_new_user_signup()`.
> **0009 replaces that function but never creates the trigger that calls it** —
> the trigger comes from 0003. Skip 0003 and every signup produces an auth user
> with **no profile row and no role**, with no error anywhere.
>
> If your database was built from `phase2_schema.sql`, it has none of the
> numbered migrations, so 0003 has almost certainly never run.

Migration 0007 is the one with the interesting output:

**Expected notices** (enum deployment — the likely one):

```
NOTICE:  0007: payment_status enum extended with 'rejected'
NOTICE:  0007: order_status enum extended with accepted/preparing/ready
NOTICE:  0007: public.orders added to the supabase_realtime publication
NOTICE:  0007: created fallback public.is_team_member()
```

or (CHECK deployment):

```
NOTICE:  0007: orders_payment_status_check widened with 'rejected'
NOTICE:  0007: orders_status_check widened
```

`already exists, skipping` and `does not exist, skipping` are expected and fine.

- ☐ All nine migrations ran, in order
- ☐ 0007's notices match one set above
- ☐ **Zero `ERROR` lines**

**Stop condition:** any `ERROR` → rollback plan, scenario A.

---

## Step 3 · Verify the database

Run the postflight block (§4.4 of the deployment checklist).

| | Check | Expect | Done |
|---|---|---|---|
| 3.1 | `rejected_supported` | `OK (enum)` or `OK (check)` | ☐ |
| 3.2 | Audit columns | 3 rows, all nullable | ☐ |
| 3.3 | Payment indexes | `orders_payment_pending_idx`, `orders_payment_status_idx` | ☐ |
| 3.4 | Trigger | `trg_enforce_customer_order_update`, `tgenabled = O` | ☐ |
| 3.5 | Policy | `orders_customer_update_own` present | ☐ |
| 3.6 | Realtime | `orders` in `supabase_realtime` | ☐ |
| 3.7 | **Data untouched** | counts identical to step 2's "before" | ☐ |
| 3.8 | Join query runs | returns a number | ☐ |
| 3.9 | **Signup trigger wired** | `on_auth_user_created` on `auth.users` | ☐ |
| 3.10 | **Signup function present** | `handle_new_user_signup()` non-null | ☐ |
| 3.11 | **Payment guard survived 0008/0009** | `trg_enforce_customer_order_update`, `tgenabled='O'` | ☐ |
| 3.12 | Auth RPCs present | `email_exists`, `lookup_login_email`, `phone_exists` all non-null | ☐ |

```sql
-- 3.9 – 3.12 in one go
SELECT (SELECT string_agg(tgname, ',') FROM pg_trigger
         WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal)      AS signup_trigger,
       to_regprocedure('public.handle_new_user_signup()')                AS signup_fn,
       (SELECT tgenabled FROM pg_trigger
         WHERE tgrelid='public.orders'::regclass
           AND tgname='trg_enforce_customer_order_update')               AS payment_trigger,
       to_regprocedure('public.email_exists(text)')                      AS email_rpc,
       to_regprocedure('public.lookup_login_email(text)')                AS login_rpc,
       to_regprocedure('public.phone_exists(text)')                      AS phone_rpc;
```

Expect: `on_auth_user_created` · non-null · `O` · non-null · non-null · non-null.

After: `_______________________________________________`

**Stop condition:** 3.7 differs → **rollback immediately**, scenario A. 3.9 or
3.10 failing → **signup is broken**; apply 0003 before deploying. 3.11 failing →
the payment guard is gone; stop. Any other row → rollback plan, scenario B.

---

## Step 4 · Enable Realtime in the dashboard

SQL cannot turn the service on.

```
Supabase Dashboard → Database → Replication → supabase_realtime
```

- ☐ `public.orders` listed and toggled on
- ☐ Realtime enabled for the project

**Stop condition:** cannot enable → the app still works, but Phase 3's live
updates do not. That is a **partial go-live** — decide explicitly whether to
proceed, and tell staff to refresh manually until it is fixed.

---

## Step 5 · Deploy the application

- ☐ Deploy `main` on the live host
- ☐ Build succeeded in the host's logs
- ☐ **Redeployed after any env-var change** (`VITE_*` is inlined at build time —
      a dashboard edit alone changes nothing)

- ☐ Production URL loads
- ☐ No `ConfigErrorScreen` (if you see it, the message names the missing variable)
- ☐ Hard-refresh on a deep route does not 404 (SPA rewrite working)
- ☐ Browser console free of red errors
- ☐ `grep -r "service_role" dist/` → nothing

**Stop condition:** config error screen or a failing build → rollback plan,
scenario C. The database can stay migrated; 0007 is backward-compatible with the
previous application build.

---

## Step 6 · Smoke test on production

Minimum viable confidence. Full coverage is
[MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md).

| | Test | Expect | Done |
|---|---|---|---|
| 6.0a | **Sign up with a fresh email** | OTP arrives; verification completes; lands on menu | ☐ |
| 6.0b | **Profile row was created** | see query below — **one row, role `customer`, `wallet_balance` 0.00, `referral_code` set** | ☐ |
| 6.0c | **Refresh mid-OTP** | Returns to the OTP screen with details intact, countdown continues from where it was | ☐ |
| 6.1 | Sign in with email OTP | Code arrives, lands on menu | ☐ |
| 6.2 | Place a **COD** order | Confirmed; status *Pay on delivery* | ☐ |
| 6.3 | Place a **UPI** order | Payment screen appears **after** the order saves | ☐ |
| 6.4 | Customer view of the UPI order | **Pending Verification** | ☐ |
| 6.5 | Admin → Payment Verification | Both UPI orders listed, COD absent | ☐ |
| 6.6 | Verify one | Customer flips to **Payment Confirmed** | ☐ |
| 6.7 | Reject the other | Customer shows **Payment Rejected** + *Please contact the restaurant.* | ☐ |
| 6.8 | Timeline, UPI | Shows Payment Pending / Payment Confirmed steps | ☐ |
| 6.9 | Timeline, COD | Shows **no** payment steps | ☐ |

```sql
-- 6.0b — the RC2 check that catches a silent signup failure
SELECT email, full_name, phone, role, wallet_balance, referral_code
  FROM public.profiles WHERE email = '<the address you just used>';
```

**Zero rows means `on_auth_user_created` is not wired.** The signup will still
*look* successful in the browser — that is exactly the failure this catches. Go
back to step 2 and apply 0003.

**Stop condition:** 6.0b returns no row → **stop, signup is broken.** 6.6 or 6.7
fails → rollback plan, scenario D.

---

## Step 7 · Two-browser realtime test

This is the one that proves Phase 3. **TC-14** in the manual test plan.

Browser A = customer (signed in as a customer).
Browser B = admin, on Payment Verification. **Windows side by side. No refreshing.**

| | Action | Expect in the *other* window | Done |
|---|---|---|---|
| 7.1 | A places a UPI order | B: order appears in the queue, within ~2s | ☐ |
| 7.2 | A opens the tracker and leaves it open | — | ☐ |
| 7.3 | B presses **Verify Payment** | A: **Payment Confirmed** + toast *"Payment received and verified."* | ☐ |
| 7.4 | A places a second UPI order | B: appears | ☐ |
| 7.5 | B presses **Reject Payment** with a reason | A: **Payment Rejected** + toast *"Payment rejected. Please contact the restaurant."* | ☐ |

**Neither window is refreshed at any point.**

**Stop condition:** nothing arrives → Realtime is not delivering. Re-check step 4
and §5 of the deployment checklist. The app is still usable with manual refresh —
decide whether that is acceptable for the night.

---

## Step 8 · Guard rails

- ☐ No payment can be settled by a customer — TC-11
- ☐ Two admins verifying the same order: the second is told *"already reviewed"* — TC-12
- ☐ `payment_verified_by` populated on every new verification:

```sql
SELECT order_number, payment_status, payment_verified_at, payment_verified_by
  FROM public.orders
 WHERE payment_verified_at IS NOT NULL
 ORDER BY payment_verified_at DESC LIMIT 10;
```

- ☐ Every row above has a non-null `payment_verified_by`

**Stop condition:** a customer can settle a payment → **rollback immediately.**
That is the one rule Phase 3 exists to enforce.

---

## Step 9 · Clean up

- ☐ Test orders removed or marked cancelled
- ☐ `#RT-TEST` probe row deleted, if you created one
- ☐ Real order numbering not disturbed by test data

```sql
SELECT id, order_number, customer_name, total_amount, created_at
  FROM public.orders
 WHERE customer_name ILIKE '%test%' OR order_number LIKE '#RT%'
 ORDER BY created_at DESC;
```

Review before deleting anything.

---

## Step 10 · Watch

**First hour**

- ☐ Supabase → Logs → API: no spike in 4xx/5xx
- ☐ Supabase → Logs → Postgres: no `check_violation` from real traffic
      (expected only if someone is probing)
- ☐ Realtime connection count is non-zero and stable
- ☐ First real UPI order flows end to end

**First day**

- ☐ Every UPI order that arrived got reviewed — nothing stranded at Pending:

```sql
SELECT order_number, customer_name, total_amount, created_at
  FROM public.orders
 WHERE payment_method::text = 'UPI' AND payment_status::text = 'pending'
   AND created_at < now() - interval '2 hours'
 ORDER BY created_at;
```

An empty result is the healthy state. Rows here mean orders are being taken and
not reviewed — an operational problem, not a software one, but the customer is
staring at *Pending Verification* either way.

- ☐ Staff briefed: **the queue must be worked**, or customers wait indefinitely

---

## Go / no-go

| Gate | Met |
|---|---|
| Backup exists | ☐ |
| Migrations 0001–0009 applied, data unchanged | ☐ |
| **`on_auth_user_created` wired — signup creates a profile row** | ☐ |
| **OTP arrives, and survives a refresh mid-verification** | ☐ |
| Realtime delivering | ☐ |
| Verify and Reject both work end to end | ☐ |
| Customer sees the result without refreshing | ☐ |
| A customer cannot settle their own payment | ☐ |
| Rollback plan read, and someone is on call | ☐ |

**All nine ticked → live.** Any unticked → hold, and record why:

```
_______________________________________________________________
```

| Role | Name | Time | Signature |
|---|---|---|---|
| Deployed by | | | |
| Verified by | | | |
| Approved by | | | |
