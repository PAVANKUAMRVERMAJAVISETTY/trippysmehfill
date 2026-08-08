# Production Database Fix — exact SQL, in order

**Run in the Supabase SQL editor for project `iptjevfvuwrdbqzgrzxg`.**
Each step has verification SQL immediately after it. Do not proceed past a
verification that fails.

Performed by: **Database Admin.** I cannot run these — DDL requires credentials
I do not have; the anon key cannot execute it.

---

## Current state, measured 2026-08-08 20:03 UTC

| Migration | Applied | Evidence |
|---|---|---|
| `0001_core_schema` | ✅ YES | `orders.customer_ip`, `fraud_risk_level`, `campus`, `items` all return HTTP 200 |
| `0004_anon_lookup_rpcs` | ✅ YES | `POST /rpc/email_exists` → `200 false`; `POST /rpc/lookup_login_email` → `200 null` |
| `0009_profiles_wallet_referral` | ✅ YES | `POST /rpc/phone_exists` → `200 false` |
| `0003_auth_triggers` | ⚠️ **UNVERIFIABLE** | `pg_trigger` is not exposed over PostgREST. Step 1 resolves it. |
| **`0007_payment_verification`** | 🔴 **NO** | `orders.payment_verified_at` → `400 42703 column does not exist` |
| **`0008_fix_profiles_rls`** | 🔴 **NO** | `profiles` → `401 42501 permission denied for table profiles` |

> **The notable one:** `0009` is applied but `0008` is not. Both came from the
> same teammate. The wallet/referral migration was applied and the profiles-RLS
> fix was skipped — and that skipped fix is exactly what is breaking signup in
> production right now.

---

## Step 0 — Back up

```
Supabase Dashboard → Database → Backups
```

Record the restore point: `________________________`

**Do not continue without this.** Step 3 alters a CHECK constraint.

---

## Step 1 — Verify the signup trigger (0003)

Read-only. This decides whether you need 0003.

```sql
SELECT t.tgname       AS trigger_name,
       p.proname      AS calls_function,
       t.tgenabled    AS enabled
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE t.tgrelid = 'auth.users'::regclass
   AND NOT t.tgisinternal;
```

**Expected:** one row — `on_auth_user_created | handle_new_user_signup | O`

- **Row present** → 0003 is applied. Skip to Step 2.
- **No rows** → 🔴 apply `supabase/migrations/0003_auth_triggers.sql`, then re-run
  the query above.

### Why this matters more than it looks

RC2 moved profile creation out of the browser and into
`handle_new_user_signup()`. **Migration 0009 replaces that function but never
creates the trigger that calls it** — 0003 does. 0009 is applied, so the function
exists; if the trigger does not, every signup produces an auth user with **no
profile row and no role**, silently, with no error in the browser.

---

## Step 2 — Apply `0008_fix_profiles_rls.sql` (unblocks signup)

Paste the entire contents of `supabase/migrations/0008_fix_profiles_rls.sql`.

The statement that matters most is the first one:

```sql
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
```

### Why this is the live outage

`permission denied for table profiles` is a **GRANT** error (SQLSTATE 42501), not
an RLS error. PostgreSQL checks table privileges *before* row-level policies. An
RLS refusal reads *"new row violates row-level security policy"*; this one means
the role cannot touch the table at all, so policies are never evaluated.

Your team wrote 33 RLS policies in `phase2_rls.sql` but **zero table GRANTs**. A
table is private to its owner until granted. The rules for which room you may
enter were written in detail; the front door was never unlocked.

### Verification

```sql
SELECT grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public' AND table_name = 'profiles'
   AND grantee IN ('anon', 'authenticated')
 GROUP BY grantee ORDER BY grantee;
```

**Expected:** a row for `authenticated` with at least `INSERT, SELECT, UPDATE`.

```sql
SELECT policyname, cmd FROM pg_policies
 WHERE tablename = 'profiles' AND policyname LIKE 'profiles_%_own'
 ORDER BY policyname;
```

**Expected:** three rows — `profiles_insert_own`, `profiles_select_own`,
`profiles_update_own`.

```sql
SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'public.profiles'::regclass
   AND tgname = 'profiles_protect_privileged_columns';
```

**Expected:** one row — customers cannot change their own `role`, `is_approved`
or `account_status`.

---

## Step 3 — Apply `0007_payment_verification.sql` (unblocks payments)

Paste the entire contents of `supabase/migrations/0007_payment_verification.sql`.

**Expected NOTICE output on this database** — it will take the CHECK-constraint
path, because `payment_status` here is `text`, not an enum:

```
NOTICE:  0007: orders_payment_status_check widened with 'rejected'
NOTICE:  0007: orders_status_check widened
NOTICE:  0007: public.orders added to the supabase_realtime publication
```

Other notices (`already exists, skipping`, `does not exist, skipping`) are
expected — the file is idempotent. **Zero `ERROR` lines.**

### Verification

```sql
-- 1. Audit columns
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_name = 'orders'
   AND column_name IN ('payment_verified_at','payment_verified_by','payment_rejection_reason')
 ORDER BY column_name;
-- expect 3 rows, all is_nullable = YES

-- 2. 'rejected' is now storable
SELECT pg_get_constraintdef(oid) AS constraint_def
  FROM pg_constraint
 WHERE conrelid = 'public.orders'::regclass
   AND conname = 'orders_payment_status_check';
-- expect: CHECK (payment_status IN ('pending','completed','failed','refunded','rejected'))

-- 3. Payment guard trigger
SELECT tgname, tgenabled FROM pg_trigger
 WHERE tgrelid = 'public.orders'::regclass
   AND tgname = 'trg_enforce_customer_order_update';
-- expect one row, tgenabled = 'O'

-- 4. Realtime
SELECT tablename FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders';
-- expect one row

-- 5. Indexes
SELECT indexname FROM pg_indexes
 WHERE tablename = 'orders' AND indexname LIKE 'orders_payment%' ORDER BY 1;
-- expect: orders_payment_pending_idx, orders_payment_status_idx

-- 6. NOTHING WAS DISTURBED — compare against the same query run before Step 3
SELECT payment_status, count(*) FROM public.orders GROUP BY 1 ORDER BY 1;
```

**If row counts changed in check 6, restore from the Step 0 backup.** The
migration is additive and was verified not to touch existing rows, but trust the
backup over the script.

---

## Step 4 — Final verification, all at once

```sql
SELECT
  (SELECT string_agg(t.tgname, ',') FROM pg_trigger t
    WHERE t.tgrelid='auth.users'::regclass AND NOT t.tgisinternal)          AS signup_trigger,
  to_regprocedure('public.handle_new_user_signup()')                        AS signup_fn,
  (SELECT count(*) FROM information_schema.role_table_grants
    WHERE table_name='profiles' AND grantee='authenticated')                AS profile_grants,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_name='orders' AND column_name LIKE 'payment_verif%')        AS audit_cols,
  (SELECT tgenabled FROM pg_trigger
    WHERE tgrelid='public.orders'::regclass
      AND tgname='trg_enforce_customer_order_update')                       AS payment_trigger,
  (SELECT count(*) FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='orders')               AS realtime,
  (SELECT count(*) FROM public.profiles WHERE role::text='admin')           AS admin_accounts;
```

**Expected:**

| Column | Expected |
|---|---|
| `signup_trigger` | `on_auth_user_created` |
| `signup_fn` | non-null |
| `profile_grants` | ≥ 3 |
| `audit_cols` | 2 |
| `payment_trigger` | `O` |
| `realtime` | 1 |
| `admin_accounts` | **≥ 1** — if 0, nobody can verify a payment |

If `admin_accounts` is 0:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```

---

## Step 5 — Enable Realtime in the dashboard

```
Dashboard → Database → Replication → supabase_realtime
```

Confirm `public.orders` is listed and toggled on.

**SQL cannot turn the Realtime service on.** Step 3 adds the table to the
publication, but the service itself is a project setting.

---

## Step 6 — Smoke test, in this order

**Signup first, deliberately.** If Step 1 revealed a missing trigger, every
account created while testing payments would be broken, and you would be
debugging the wrong layer.

1. Sign up with a fresh email address. It should succeed.
2. Confirm the profile row was actually created:

```sql
SELECT email, full_name, phone, role, wallet_balance, referral_code
  FROM public.profiles WHERE email = '<the address you used>';
```

Expect **exactly one row**, `role = 'customer'`, `wallet_balance = 0.00`,
`referral_code` shaped `TRIPPY-XXXX-1234`.

**Zero rows means the trigger is not wired**, even though the browser reported
success. That is the silent failure this whole sequence exists to prevent.

3. Then place a COD order, then a UPI order, then verify one and reject the other.

---

## What happens if you skip a step

| Skipped | Consequence |
|---|---|
| Step 1 | Signup appears to work; every new user has no profile and no role |
| Step 2 | **Signup fails for every user** — the current production outage |
| Step 3 | Admin Verify fails on missing columns; Reject fails on the CHECK constraint |
| Step 5 | App works, but every "instant" update silently requires a refresh |
