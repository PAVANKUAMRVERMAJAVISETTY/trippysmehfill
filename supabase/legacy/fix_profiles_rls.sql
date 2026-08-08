-- ====================================================================
-- FIX: profiles RLS — recursion, missing INSERT policy, role escalation
-- ====================================================================
-- Run this in the Supabase SQL Editor. Safe to re-run (idempotent).
--
-- Problem 1 (BLOCKING): every query against public.profiles fails with
--   42P17: infinite recursion detected in policy for relation "profiles"
-- because the admin policy queried public.profiles from inside a policy
-- ON public.profiles, so evaluating it re-triggered itself.
--
-- Problem 2: there was no INSERT policy, so a user could never create
-- their own profile row.
--
-- Problem 3 (PRIVILEGE ESCALATION): "Users can update own profile" allowed
-- updating ANY column of your own row, including `role`. Any signed-in user
-- could set role = 'admin' on themselves.
-- ====================================================================

-- 1. Recursion-safe admin check.
--    SECURITY DEFINER runs as the function owner, which bypasses RLS on the
--    inner SELECT — this is what breaks the recursion cycle.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Replace the recursive admin policy.
DROP POLICY IF EXISTS "Admins full control over profiles" ON public.profiles;
CREATE POLICY "Admins full control over profiles" ON public.profiles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Own-row read.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 4. Own-row insert (previously missing, so registration could not write a row).
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Own-row update. WITH CHECK stops a user rewriting the row to another id.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Block privilege escalation.
--    RLS WITH CHECK cannot compare against the OLD row, so column-level
--    protection needs a trigger. Without this, "update your own profile"
--    includes "promote yourself to admin".
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only administrators can change a profile role.';
    END IF;

    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'Only administrators can change account status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 7. Verify. Should return rows without a 42P17 error.
-- SELECT id, email, role FROM public.profiles LIMIT 1;
