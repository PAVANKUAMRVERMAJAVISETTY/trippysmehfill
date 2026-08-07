-- ====================================================================
-- 0003 — SIGNUP TRIGGER AND TIMESTAMPS
-- ====================================================================

-- 1. Automatic profile creation on signup ------------------------------------
-- Changes vs the previous `handle_new_user_signup()`:
--   * `SET search_path` added — it was a SECURITY DEFINER function without one
--     (Supabase linter: function_search_path_mutable).
--   * Admin role is no longer decided by a hardcoded email literal; see step 3,
--     which seeds it as data once.
--   * The body is exception-safe. This trigger runs inside the `auth.users`
--     insert, so any error it raises aborts signup with an HTTP 500 and no user
--     is created at all. A profile row that cannot be written must not take the
--     account down with it — `AuthContext` recreates a missing profile on first
--     sign-in anyway.

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, phone, hostel_address,
    role, account_status, is_whatsapp_verified, is_approved, is_active,
    auth_provider, ip_address, latitude, longitude,
    created_at, updated_at
  )
  VALUES (
    new.id,
    new.email,
    coalesce(nullif(meta->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(meta->>'phone', ''),
    coalesce(meta->>'hostel_address', ''),
    'customer',
    'active',
    false,
    false,
    true,
    coalesce(meta->>'auth_provider', 'Email'),
    meta->>'ip_address',
    nullif(meta->>'latitude', '')::double precision,
    nullif(meta->>'longitude', '')::double precision,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name       = coalesce(nullif(EXCLUDED.full_name, ''), public.profiles.full_name),
    phone           = coalesce(nullif(EXCLUDED.phone, ''), public.profiles.phone),
    hostel_address  = coalesce(nullif(EXCLUDED.hostel_address, ''), public.profiles.hostel_address),
    updated_at      = now();

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_signup failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- Keep `profiles.email` in step with a verified email change in Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF new.email IS DISTINCT FROM old.email THEN
    UPDATE public.profiles SET email = new.email, updated_at = now() WHERE id = new.id;
  END IF;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_user_email_change failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_change();

-- 2. updated_at maintenance --------------------------------------------------
-- `updated_at` was only ever set by the signup trigger; ordinary updates left
-- it stale.

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  new.updated_at := timezone('utc', now());
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS orders_touch_updated_at ON public.orders;
CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS inventory_touch_updated_at ON public.inventory;
CREATE TRIGGER inventory_touch_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Admin bootstrap ---------------------------------------------------------
-- Admin rights now come from `profiles.role`, which is data you control, rather
-- than from an email literal compiled into `is_admin_or_staff()`. Add or remove
-- addresses here and re-run; existing rows are updated in place.

UPDATE public.profiles
   SET role = 'admin', is_approved = true, is_active = true, updated_at = now()
 WHERE lower(email) IN (
   'nagapavankumarjavisetty@gmail.com',
   'narendrakumar@gmail.com',
   'nithishnaruboina@gmail.com'
 )
   AND role <> 'admin';
