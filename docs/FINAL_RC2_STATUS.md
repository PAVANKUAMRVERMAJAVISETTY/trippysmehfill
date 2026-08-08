# Final RC2 Status

| | |
|---|---|
| Release | RC2 |
| Branch | `feat/supabase-auth-otp` |
| PR | [#2](https://github.com/Bajiyadav/trippysmehfill1/pull/2) — open, mergeable |
| Supabase project | `iptjevfvuwrdbqzgrzxg` |
| **Recommendation** | 🔴 **NO-GO** — 3 blockers, **none in the code** |

---

## Code status ✅ READY

```
tsc --noEmit     clean
node:test        144 / 144 pass, 0 fail
npm run build    ✓ 3.68s  ·  344.73 kB gzip
```

| Area | Status |
|---|---|
| Schema alignment | ✅ Code matches the production database. Verified live: every order query went from error to HTTP 200. |
| Payment vocabulary | ✅ One canonical set, enforced by the database, with backward-compatible reads |
| Phase 3 payment verification | ✅ Unchanged and re-verified after both refactors |
| Kitchen payment badge | ✅ Implemented |
| Auth / OTP | ✅ Merged from upstream, incl. session restore |
| Supabase key format | ✅ Both formats accepted; secret keys refused |
| Git | ✅ Clean, pushed, in sync |

### What changed since the last report

| | |
|---|---|
| **Schema alignment** | `order_items` and `is_deleted` removed entirely — 14 references. Line items now read and write `orders.items` (jsonb). `createOrder` is one INSERT, which removes the orphan-header failure mode. |
| **Payment standardisation** | `normalizePaymentStatus()` applied at the service boundary. Every screen corrected at once, because they all read through the same presentation helpers. |
| **Key format** | The guard rejected `sb_publishable_`, which is what Supabase now issues — verified working against this project. Fixed. Secret keys now refused, since `VITE_*` is inlined into the browser bundle. |
| **Data safety** | Menu delete → `is_available = false`. Inventory delete refuses rather than hard-deleting. **No code path deletes data.** |

---

## Database status 🔴 BLOCKED

Probed read-only against production. Nothing was written.

| Check | Status |
|---|---|
| `orders` table | ✅ present, readable, **0 rows** |
| `orders.items` (jsonb) | ✅ present — line items live here |
| `order_items` table | ✅ correctly absent — code no longer expects it |
| `orders.is_deleted` | ✅ correctly absent — code no longer expects it |
| `menu_items` | ✅ present, 4 dishes |
| `inventory`, `feedback`, `payments` | ✅ present |
| **`profiles` grants** | 🔴 **MISSING** — `42501 permission denied for table profiles` |
| **`payment_verified_at` / `_by` / `_rejection_reason`** | 🔴 **MISSING** — migration 0007 not applied |
| `on_auth_user_created` trigger | ⚠️ **UNKNOWN** — not probeable over REST |
| Realtime publication on `orders` | ⚠️ **UNKNOWN** — 0007 adds it |
| `payment_status` CHECK contents | ⚠️ **UNKNOWN** |

The live schema is the numbered chain (0001–0005) plus your teammate's
`0008_fix_orders_schema.sql`. **His migrations are applied; yours are not.**

---

## Migration requirements

**No new migrations were written.** All three fixes already exist. Run in order:

```sql
-- 0. Back up first. Dashboard → Database → Backups. Record the timestamp.

-- 1. Is the signup trigger wired? RC2 depends on it entirely.
SELECT t.tgname, p.proname AS calls, t.tgenabled
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal;
-- expect: on_auth_user_created | handle_new_user_signup | O
-- if empty → run 0003_auth_triggers.sql

-- 2. Unblocks signup, which fails on every attempt right now
\i supabase/migrations/0008_fix_profiles_rls.sql

-- 3. Enables payment verification; also publishes orders to Realtime
\i supabase/migrations/0007_payment_verification.sql

-- 4. Confirm
SELECT column_name FROM information_schema.columns
 WHERE table_name='orders'
   AND column_name IN ('payment_verified_at','payment_verified_by','payment_rejection_reason');
-- expect 3 rows

SELECT grantee, privilege_type FROM information_schema.role_table_grants
 WHERE table_name='profiles' AND grantee='authenticated';
-- expect SELECT, INSERT, UPDATE

SELECT tablename FROM pg_publication_tables
 WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders';
-- expect one row

SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.orders'::regclass AND conname LIKE '%payment_status%';
-- expect: ... IN ('pending','completed','failed','refunded','rejected')
```

`0009_profiles_wallet_referral.sql` is optional — wallet and referral are
schema-only with no feature consuming them.

**Migration 0007 is compatible with the aligned code.** It adds columns to
`orders` and creates neither `order_items` nor `is_deleted`. On this database it
takes the CHECK-constraint path, verified on PostgreSQL 17.

---

## Deployment status ⚠️ PARTIAL

| Check | Status |
|---|---|
| `VITE_SUPABASE_URL` | ✅ reachable, Auth health 200 |
| `VITE_SUPABASE_ANON_KEY` | ✅ both formats now accepted |
| `vercel.json` | ✅ build, output, SPA rewrite correct |
| `service_role` in bundle | ✅ absent |
| Merged to `main` | 🔴 **NO** — `origin/main` at `799fe55`, predating the merge |
| Node pin | ⚠️ Netlify pins 20, Vercel pins nothing, built on 24.11.1 |
| Two host configs | ⚠️ both `vercel.json` and `netlify.toml` present |

The live site runs **pre-merge code** and will keep failing signup until PR #2
merges *and* the migrations are applied. Both are needed; neither alone is enough.

---

## Outstanding risks

### 🔴 High

**R1 · Payment vocabulary is not agreed between the two builds.**
This repository is now internally canonical, and reads are backward compatible —
rows written as `'paid'` display correctly here. But your teammate's branch still
*writes* `'paid'` and `'pending_verification'`, and the database constraint
refuses both. His verification path may already be failing in production, since
0001 never permitted `'paid'` either. **Unresolved; needs the conversation.**

**R2 · Signup trigger presence unverified.** RC2 moved profile creation into
`handle_new_user_signup()`. If `on_auth_user_created` is absent, signups produce
an auth user with no profile and no role — silently, with no error.

**R3 · Manual test plan: 49 cases, 0 executed.** TC-11 (a customer cannot settle
their own payment), TC-14 (two-browser realtime) and TC-19 (signup creates a
profile row) are the three that decide whether this release does what it claims.

### 🟡 Medium

**R4 · Realtime publication unverified.** Without it every "instant" update
silently becomes "after a refresh".

**R5 · Migration numbers have collided three times** — two `0006`, two `0007`,
two `0008`. Git never warns, because the filenames differ.

**R6 · The refactor is untested against real data.** The production `orders`
table has **0 rows**, so `parseOrderItems` has never met a real stored row. It is
covered by 9 unit tests including malformed input, but that is not the same as
production data.

**R7 · Both builds write `orders.items` with different field names.** The parser
accepts `dish_id`/`id` and `dish_name`/`name`, so reads are safe. Agree on one
shape.

### 🟢 Low

**R8 · Wallet and referral are schema-only** — codes generated, nothing spends.
**R9 · Verification queue has no alert.** An unreviewed UPI order strands a
paying customer indefinitely.
**R10 · Order numbers can collide** under concurrent checkout.
**R11 · `deleteInventoryItem` refuses.** No UI calls it; a functional gap, not a
regression.
**R12 · Test phone numbers** in the Supabase Auth dashboard, if any, accept
static OTP codes in production.

---

## Blockers

| | Blocker | Fix |
|---|---|---|
| **B1** | `profiles` has no table grants — **signup fails on every attempt** | Apply `0008_fix_profiles_rls.sql` |
| **B2** | Migration 0007 not applied — payment verification cannot function | Apply `0007_payment_verification.sql` |
| **B3** | Not merged to `main` — live site runs pre-merge code | Merge PR #2, tag `rc2`, deploy |

Plus one unknown that behaves like a blocker if it resolves badly:

| | |
|---|---|
| **B4** | `on_auth_user_created` may be absent → signup silently creates no profile. One query resolves it. |

---

## GO / NO-GO

### 🔴 NO-GO

**Every code-side blocker is closed.** Over this pass the count went from five to
three, and the three that remain are database and deployment operations I cannot
perform — they need SQL-editor access and a merge.

| | Earlier | Now |
|---|---|---|
| `order_items` / `is_deleted` mismatch | 🔴 | ✅ resolved, verified live |
| Supabase key format | ⚠️ | ✅ resolved |
| Payment vocabulary (this repo) | ⚠️ | ✅ resolved |
| `profiles` grants | 🔴 | 🔴 **apply 0008** |
| Migration 0007 | 🔴 | 🔴 **apply 0007** |
| Merged to `main` | 🔴 | 🔴 **merge PR #2** |
| Signup trigger | ⚠️ | ⚠️ **verify** |

### Path to GO

```
1. Back up the database                                     DBA
2. Verify on_auth_user_created; apply 0003 if absent        DBA
3. Apply 0008_fix_profiles_rls.sql      → unblocks signup   DBA
4. Apply 0007_payment_verification.sql  → unblocks payments DBA
5. Confirm Realtime on orders in the dashboard              DBA
6. Merge PR #2, tag rc2, deploy                             Dev
7. Execute the manual test plan                             QA
     must pass: TC-04 TC-05 TC-09 TC-10 TC-11 TC-13 TC-14 TC-19
8. Agree the payment vocabulary with your teammate          You
```

Steps 1–5 are roughly thirty minutes in the SQL editor. Step 7 is the real work.
Step 8 is a conversation, and it should happen before he merges, not after.

**When steps 1–7 are complete and the eight must-pass cases are green, this
release is READY FOR PRODUCTION.**

Until then: **RC2 is code-complete, verified to the limit of what can be verified
without your infrastructure, and blocked on three operations that take under an
hour.**
