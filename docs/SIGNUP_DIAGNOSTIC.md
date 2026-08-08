# Signup Diagnostic Report: Trippy's Mehfill

This diagnostic report details the root cause, empirical evidence, and exact resolution steps for the signup error `"Database error saving new user"` / HTTP 500.

---

## 1. Classification

- **Primary Domain**: **Database (PostgreSQL Row Level Security Policy)**
- **Secondary Domain**: **Database Schema (Missing Tables)**
- **Frontend / Component Status**: 100% OK (No code changes required on React components).

---

## 2. Root Cause

When a user attempts to sign up via `supabase.auth.signUp()`, Supabase Auth inserts a row into `auth.users`, which fires the PostgreSQL database trigger `on_auth_user_created` $\rightarrow$ `public.handle_new_user_signup()`.

This trigger attempts to insert a record into `public.profiles`. During row policy evaluation on `public.profiles`, PostgreSQL encounters an **infinite recursion error**:

```
PostgreSQL Error Code: 42P17
Message: infinite recursion detected in policy for relation "profiles"
```

### Why Policy Recursion Occurs
The current policy installed on `public.profiles` is defined as:

```sql
CREATE POLICY "Admins full control over profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );
```

Because the policy's `USING` clause selects from `public.profiles` while evaluating a query on `public.profiles`, it re-triggers policy evaluation recursively until PostgreSQL aborts with `42P17`. This causes the signup transaction to fail and Supabase Auth to return `HTTP 500` ("Database error saving new user").

---

## 3. Empirical Evidence (Live Diagnostic Results)

Live diagnostic checks against project `https://iptjevfvuwrdbqzgrzxg.supabase.co`:

1. **Supabase Connection**: ✅ Active & Connected (`https://iptjevfvuwrdbqzgrzxg.supabase.co`).
2. **Environment Variables**: ✅ Verified correct in `.env.local` and `.env.example`.
3. **Profiles Table Query Check**:
   - `SELECT * FROM public.profiles LIMIT 1`
   - **Result**: `Error 42P17: infinite recursion detected in policy for relation "profiles"`.
4. **SignUp Test**:
   - `supabase.auth.signUp(...)`
   - **Result**: `HTTP 500: AuthRetryableFetchError` (caused by trigger aborting on `42P17`).
5. **Schema Completeness Check**:
   - `menu_items`: ✅ Exists
   - `kitchen_settings`: ✅ Exists
   - `orders`: ✅ Exists
   - `categories`: ❌ Missing (`Could not find the table 'public.categories' in the schema cache`)
   - `inventory`: ❌ Missing (`Could not find the table 'public.inventory' in the schema cache`)

---

## 4. Required Fix

The fix requires executing two SQL scripts in your **Supabase Dashboard SQL Editor**:

### Step 1: Run RLS Recursion Fix Script
Open **Supabase Dashboard** $\rightarrow$ **SQL Editor** $\rightarrow$ execute [`supabase/fix_profiles_rls.sql`](../supabase/legacy/fix_profiles_rls.sql) (or [`supabase/phase2_rls.sql`](../supabase/legacy/phase2_rls.sql)).

This creates a recursion-safe admin check function:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
$$;

DROP POLICY IF EXISTS "Admins full control over profiles" ON public.profiles;
CREATE POLICY "Admins full control over profiles" ON public.profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
```
Because `public.is_admin()` is declared `SECURITY DEFINER`, it bypasses inner RLS evaluation and breaks the recursion cycle completely.

### Step 2: Run Full Phase 2 Schema Script
Open **Supabase Dashboard** $\rightarrow$ **SQL Editor** $\rightarrow$ execute [`supabase/phase2_schema.sql`](../supabase/legacy/phase2_schema.sql).

This creates missing tables (`categories`, `inventory`, `inventory_transactions`, `order_items`, `feedback`, `banners`, `gallery_items`, `notifications`).

---

## 5. Summary of Diagnostic Checks (Requested Order)

| # | Diagnostic Check | Result / Finding |
|---|---|---|
| 1 | Supabase Connection | ✅ Connected to `https://iptjevfvuwrdbqzgrzxg.supabase.co` |
| 2 | Database Objects | `profiles` exists (RLS recursive error 42P17); `categories` & `inventory` missing |
| 3 | Signup Error Cause | Trigger `handle_new_user_signup()` fails due to RLS recursion `42P17` on `profiles` |
| 4 | Missing SQL Migrations | `fix_profiles_rls.sql` and `phase2_schema.sql` have not been executed in SQL Editor |
| 5 | Profiles RLS Policies | Active admin policy is recursive; needs `SECURITY DEFINER` function replacement |
| 6 | Email Provider Status | ✅ Enabled |
| 7 | Confirm Email Status | Configurable in Supabase Dashboard (Recommend OFF for instant testing) |
| 8 | Env Variables Check | ✅ `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` point to correct live project |
| 9 | Frontend Components | ✅ No React code changes needed; root cause is 100% in database RLS policies |
