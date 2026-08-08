-- ====================================================================
-- 0006 — FIX PROFILES ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
-- Resolves "Profile creation failed: permission denied for table profiles"
-- by ensuring authenticated users have explicit SELECT, INSERT, and UPDATE
-- permissions for their own profile row (auth.uid() = id).

-- 1. Ensure table grants for authenticated role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- 2. Drop existing profile policies to apply clean, non-conflicting policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS "Users access own profile" ON public.profiles;

-- 3. Policy: Authenticated users can read their own profile row
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid()::text = id::text);

-- 4. Policy: Authenticated users can insert their own profile row on registration
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- 5. Policy: Authenticated users can update their own profile row
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- 6. Trigger: Protect privileged columns (role, is_approved, account_status) from customer mutation
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

  -- Maintain existing values for privileged columns if updated by standard customer
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
