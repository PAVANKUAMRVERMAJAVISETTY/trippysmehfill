-- ====================================================================
-- 0010 — PRODUCTION FIXES, SCHEMAS & STORAGE POLICIES
-- ====================================================================
-- Idempotent & non-destructive: Safe to apply on live Supabase project.

-- 1. Security Definer Role Helpers (Recursion Safe) -------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff', 'driver')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin()         FROM public;
REVOKE ALL ON FUNCTION public.is_admin_or_staff() FROM public;
REVOKE ALL ON FUNCTION public.is_team_member()    FROM public;

GRANT EXECUTE ON FUNCTION public.is_admin()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member()    TO authenticated;

-- 2. Profiles Admin Policies -----------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_team_member() OR auth.uid()::text = id::text);

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR auth.uid()::text = id::text)
  WITH CHECK (public.is_admin() OR auth.uid()::text = id::text);

-- Protect privileged columns trigger
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN new;
  END IF;

  -- Maintain existing values for privileged columns if updated by non-admin
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

-- 3. Promotional Banners Table ---------------------------------------

CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  poster_url text NOT NULL,
  link_url text,
  is_active boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS banners_public_read ON public.banners;
CREATE POLICY banners_public_read ON public.banners
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS banners_admin_write ON public.banners;
CREATE POLICY banners_admin_write ON public.banners
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- 4. Gallery Items Table --------------------------------------------

CREATE TABLE IF NOT EXISTS public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  caption text,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gallery_items_public_read ON public.gallery_items;
CREATE POLICY gallery_items_public_read ON public.gallery_items
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS gallery_items_admin_write ON public.gallery_items;
CREATE POLICY gallery_items_admin_write ON public.gallery_items
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- 5. Home Promotions / Hero Content Table ---------------------------

CREATE TABLE IF NOT EXISTS public.home_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  button_text text DEFAULT 'Order Now',
  button_link text DEFAULT 'menu-section',
  badge text DEFAULT 'FRESH PROMOTION',
  is_active boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.home_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS home_promotions_public_read ON public.home_promotions;
CREATE POLICY home_promotions_public_read ON public.home_promotions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS home_promotions_admin_write ON public.home_promotions;
CREATE POLICY home_promotions_admin_write ON public.home_promotions
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- 6. Storage Bucket RLS Policies for Existing 5 Buckets --------------
-- Buckets: restaurant-logo, menu-images, banner-images, gallery-images, profile-images

DO $$
DECLARE
  b_id text;
  buckets_array text[] := ARRAY['restaurant-logo', 'menu-images', 'banner-images', 'gallery-images', 'profile-images'];
BEGIN
  FOREACH b_id IN ARRAY buckets_array LOOP
    -- Public READ
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'public_read_' || replace(b_id, '-', '_'));
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = %L)',
      'public_read_' || replace(b_id, '-', '_'), b_id
    );

    -- Admin / Staff WRITE (INSERT, UPDATE, DELETE)
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'staff_write_' || replace(b_id, '-', '_'));
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR ALL TO authenticated USING (bucket_id = %L AND public.is_admin_or_staff()) WITH CHECK (bucket_id = %L AND public.is_admin_or_staff())',
      'staff_write_' || replace(b_id, '-', '_'), b_id, b_id
    );
  END LOOP;
END $$;

-- 7. PostgREST Schema Cache Reload ----------------------------------
NOTIFY pgrst, 'reload schema';
