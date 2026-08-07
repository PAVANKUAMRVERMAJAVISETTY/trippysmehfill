-- ====================================================================
-- 0002 — ROW LEVEL SECURITY
-- ====================================================================
-- The previous schema created policies on `public.profiles` but never ran
-- `ENABLE ROW LEVEL SECURITY`, and policies on a table with RLS disabled do
-- nothing. Verified against the live project using only the public anon key
-- (which ships inside the JS bundle):
--
--   GET   /rest/v1/profiles?select=*          -> 200 + full rows (name, email,
--                                                phone, address, GPS)
--   PATCH /rest/v1/profiles?id=eq.<uuid>      -> 204 (accepted)
--   PATCH /rest/v1/menu_items?id=eq.<uuid>    -> 204 (accepted)
--
-- So anyone could dump customer PII, rewrite menu prices, or set
-- `role = 'admin'` on their own profile and take over the admin ERP.
--
-- Idempotent: every policy is dropped before being recreated.

-- 1. Role helpers -----------------------------------------------------------
-- SECURITY DEFINER so reading `profiles.role` from inside a `profiles` policy
-- does not recurse into that same policy. `SET search_path` is mandatory on a
-- definer function (Supabase linter: function_search_path_mutable).

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT public.current_role_name() IN ('admin', 'staff');
$$;

CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT public.current_role_name() IN ('admin', 'staff', 'driver');
$$;

-- 2. Enable RLS -------------------------------------------------------------

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory        ENABLE ROW LEVEL SECURITY;

-- Belt and braces: PostgREST authenticates as `anon`/`authenticated`, and RLS
-- only constrains what those roles were granted in the first place.
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- 3. profiles ---------------------------------------------------------------

DROP POLICY IF EXISTS "Users access own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Admins full control profiles" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own            ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own            ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own            ON public.profiles;
DROP POLICY IF EXISTS profiles_staff_read            ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all             ON public.profiles;

-- `auth.uid() = id` has no subquery, so it cannot recurse.
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Staff need the customer directory and the driver roster.
CREATE POLICY profiles_staff_read ON public.profiles
  FOR SELECT TO authenticated USING (public.is_team_member());

CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

-- `profiles_update_own` alone would let a customer PATCH their own row with
-- `role = 'admin'`. A trigger is used instead of a WITH CHECK expression so the
-- privileged columns are pinned to their previous values rather than the write
-- being rejected outright (the client sends whole objects).
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin_or_staff() THEN
    RETURN new;
  END IF;

  new.role           := old.role;
  new.is_approved    := old.is_approved;
  new.account_status := old.account_status;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileged_columns ON public.profiles;
CREATE TRIGGER profiles_protect_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_profile_columns();

-- 4. menu_items and kitchen_settings ---------------------------------------
-- Readable by anyone (the storefront loads the menu before sign-in); writable
-- by admin/staff only.

DROP POLICY IF EXISTS menu_items_public_read ON public.menu_items;
DROP POLICY IF EXISTS menu_items_staff_write ON public.menu_items;

CREATE POLICY menu_items_public_read ON public.menu_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY menu_items_staff_write ON public.menu_items
  FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS kitchen_settings_public_read ON public.kitchen_settings;
DROP POLICY IF EXISTS kitchen_settings_staff_write ON public.kitchen_settings;

CREATE POLICY kitchen_settings_public_read ON public.kitchen_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY kitchen_settings_staff_write ON public.kitchen_settings
  FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

-- 5. orders -----------------------------------------------------------------

DROP POLICY IF EXISTS orders_select_own      ON public.orders;
DROP POLICY IF EXISTS orders_insert_own      ON public.orders;
DROP POLICY IF EXISTS orders_team_read       ON public.orders;
DROP POLICY IF EXISTS orders_team_write      ON public.orders;
DROP POLICY IF EXISTS orders_driver_update   ON public.orders;

CREATE POLICY orders_select_own ON public.orders
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE POLICY orders_insert_own ON public.orders
  FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

-- Kitchen, admin and drivers see the live queue.
CREATE POLICY orders_team_read ON public.orders
  FOR SELECT TO authenticated USING (public.is_team_member());

CREATE POLICY orders_team_write ON public.orders
  FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

-- A driver may only progress an order that is assigned to them.
CREATE POLICY orders_driver_update ON public.orders
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- 6. feedback ---------------------------------------------------------------

DROP POLICY IF EXISTS feedback_insert_authenticated ON public.feedback;
DROP POLICY IF EXISTS feedback_staff_read           ON public.feedback;

CREATE POLICY feedback_insert_authenticated ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY feedback_staff_read ON public.feedback
  FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

-- 7. inventory --------------------------------------------------------------

DROP POLICY IF EXISTS inventory_staff_all ON public.inventory;

CREATE POLICY inventory_staff_all ON public.inventory
  FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

-- 8. Realtime ---------------------------------------------------------------
-- Header.tsx subscribes to `realtime-live-orders-channel`. Realtime respects
-- RLS, so subscribers only receive rows their policies already allow.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN null; END $$;
