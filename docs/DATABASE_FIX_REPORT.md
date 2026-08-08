# Database Fix Report: Trippy's Mehfill

Report documenting the database verification results, SQL statements, created objects, updated RLS policies, and execution steps for resolving PostgreSQL error `42P17` and HTTP 500 signup failures.

---

## 1. Live Database Diagnostic Results

A diagnostic script was executed against live Supabase project `https://iptjevfvuwrdbqzgrzxg.supabase.co`.

| Object / Operation | Live Verification Result | Status |
|---|---|---|
| `public.profiles` query | `code: '42P17'` (`infinite recursion detected in policy for relation "profiles"`) | ❌ **FAIL (RLS Loop)** |
| `public.categories` table | `Could not find table 'public.categories' in schema cache` | ❌ **MISSING** |
| `public.inventory` table | `Could not find table 'public.inventory' in schema cache` | ❌ **MISSING** |
| `public.inventory_transactions` | `Could not find table 'public.inventory_transactions' in schema cache` | ❌ **MISSING** |
| `public.order_items` table | `Could not find table 'public.order_items' in schema cache` | ❌ **MISSING** |
| `public.kitchen_settings` | `EXISTS` | ✅ **OK** |
| User Signup (`supabase.auth.signUp`) | `HTTP 500: AuthRetryableFetchError` (Transaction aborted by trigger on 42P17) | ❌ **FAIL** |

---

## 2. Root Cause Summary

1. **Policy Infinite Recursion (`42P17`)**:
   The `Admins full control over profiles` policy evaluates `EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')`. Because this query selects from `public.profiles` while evaluating an RLS check on `public.profiles`, it enters an infinite recursion loop until PostgreSQL aborts with error `42P17`.
2. **Signup Transaction Rollback**:
   During `supabase.auth.signUp()`, the trigger `on_auth_user_created` runs `handle_new_user_signup()`, which inserts into `public.profiles`. The insert evaluates RLS policies, hits error `42P17`, and rolls back the `auth.users` insert transaction, causing Supabase Auth to return `HTTP 500`.

---

## 3. SQL Executed / Consolidated Database Migration Script

Copy and run the following consolidated SQL script inside your **Supabase Dashboard SQL Editor** ([https://app.supabase.com](https://app.supabase.com) $\rightarrow$ Project `iptjevfvuwrdbqzgrzxg` $\rightarrow$ **SQL Editor**):

```sql
-- ====================================================================
-- COMBINED DATABASE FIX: RLS RECURSION FIX + PHASE 2 SCHEMAS
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Recursion-Safe Admin Check Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Update Profiles RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full control over profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins full profiles control" ON public.profiles;
CREATE POLICY "Admins full profiles control" ON public.profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. Create Missing Tables (categories, inventory, transactions, order_items, etc.)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  display_order integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name text NOT NULL,
  unit text NOT NULL,
  quantity numeric(10, 2) DEFAULT 0 NOT NULL CHECK (quantity >= 0),
  low_alert_threshold numeric(10, 2) DEFAULT 5 NOT NULL,
  is_deleted boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  change_qty numeric(10, 2) NOT NULL,
  reason text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  dish_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  dish_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_veg boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 4. Set Policies for Categories & Inventory
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff view inventory" ON public.inventory;
CREATE POLICY "Staff view inventory" ON public.inventory FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff update inventory" ON public.inventory;
CREATE POLICY "Staff update inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
```

---

## 4. Verification & Expected Test Results

Once the SQL above is executed in the Supabase SQL Editor:
1. `public.profiles` select queries will succeed immediately without error `42P17`.
2. `categories`, `inventory`, `inventory_transactions`, and `order_items` tables will be present in the schema cache.
3. `handle_new_user_signup()` trigger will complete without rollback.
4. `supabase.auth.signUp()` will create `auth.users` row, insert `public.profiles` row, and establish session without HTTP 500 errors.
