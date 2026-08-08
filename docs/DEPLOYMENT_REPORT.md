# Deployment Report

## Build gate ✅

```
tsc --noEmit     clean  (meaningful for the first time — React types installed)
node:test        144 / 144 pass
npm run build    ✓ 3.56s  ·  344.65 kB gzip
```

## Environment

| | Status |
|---|---|
| `VITE_SUPABASE_URL` | ✅ `https://iptjevfvuwrdbqzgrzxg.supabase.co` — reachable, Auth health 200 |
| `VITE_SUPABASE_ANON_KEY` | ✅ both `sb_publishable_…` and `eyJhbGci…` accepted since this cycle |
| Secret keys | ✅ `sb_secret_` and `service_role` now refused with an explanation |
| `service_role` in bundle | ✅ absent |
| `.env.local` git-ignored | ✅ `.gitignore:7` |

⚠️ **`VITE_*` is inlined at build time.** Changing it in the hosting dashboard
does nothing until you redeploy. This is the most common cause of "I updated the
key and it still fails".

## Hosting

Both `vercel.json` and `netlify.toml` are present — confirm which is
authoritative. Both configure the SPA rewrite, without which a hard refresh on
any route 404s. Netlify pins Node 20; Vercel pins nothing; built here on 24.11.1.

## Blockers

### 🔴 EXT-1 — `profiles` has no table grants

**Signup fails on every attempt in production.** Confirmed by your screenshot and
reproduced against the live REST API:

```
401 {"code":"42501","message":"permission denied for table profiles",
     "hint":"GRANT SELECT ON public.profiles TO anon;"}
```

### 🔴 EXT-2 — Migration 0007 not applied

`payment_verified_at`, `payment_verified_by`, `payment_rejection_reason` all
absent. Verify fails on missing columns; Reject fails on the CHECK constraint.

### 🔴 EXT-3 — Not merged to `main`

`origin/main` is at `799fe55`, predating the merge. The live site runs pre-merge
code. PR #2 is open and mergeable.

### ⚠️ EXT-4 — `on_auth_user_created` unknown

RC2 moved profile creation into `handle_new_user_signup()`. **Migration 0009
replaces that function but never creates the trigger — 0003 does.** If 0003 has
not run, signup silently produces an auth user with no profile and no role.

## Deployment sequence

```sql
-- 0. BACK UP FIRST. Dashboard → Database → Backups. Record the timestamp.

-- 1. Is the signup trigger wired?
SELECT t.tgname, p.proname AS calls, t.tgenabled
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal;
-- expect: on_auth_user_created | handle_new_user_signup | O
-- if empty → run 0003_auth_triggers.sql

-- 2. Unblocks signup
\i supabase/migrations/0008_fix_profiles_rls.sql

-- 3. Unblocks payment verification; also publishes orders to Realtime
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

SELECT count(*) AS admins FROM public.profiles WHERE role::text='admin';
-- must be >= 1, or nobody can verify a payment
```

Then: enable Realtime in the dashboard (SQL cannot do it) → merge PR #2 → tag
`rc2` → deploy → execute the manual test plan.

Roughly **30 minutes of SQL-editor work**, then the merge.
