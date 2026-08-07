-- ====================================================================
-- TRIPPY'S MEHFILL ERP: COMPLETE PROFILES DATABASE SCHEMA & MIGRATION
-- ====================================================================
-- Copy and execute this entire SQL script inside the Supabase SQL Editor.
-- This script is fully idempotent and safe to run on existing databases.

-- 1. Create Enums for Role & Account Status
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'driver', 'customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('active', 'pending_verification', 'blocked_fraud');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create public.profiles Table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text DEFAULT '',
  hostel_address text DEFAULT '',
  role text DEFAULT 'customer',
  account_status text DEFAULT 'active',
  is_whatsapp_verified boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  is_active boolean DEFAULT true,
  auth_provider text DEFAULT 'Email',
  ip_address text DEFAULT '103.211.14.82',
  latitude double precision DEFAULT 17.3850,
  longitude double precision DEFAULT 78.4867,
  location_city text DEFAULT 'Sohna GLS Homes near GDGU, Haryana',
  registration_ip text DEFAULT '103.211.14.82',
  signup_latitude numeric DEFAULT 17.3850,
  signup_longitude numeric DEFAULT 78.4867,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Migration: Add missing columns if public.profiles already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hostel_address text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_whatsapp_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'Email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ip_address text DEFAULT '103.211.14.82';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT 28.2468;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT 77.0628;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_city text DEFAULT 'Sohna / Gurgaon';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_accuracy numeric DEFAULT 15;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_allowed boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text DEFAULT 'Sohna / Gurgaon';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text DEFAULT 'Haryana';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text DEFAULT 'India';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_code text DEFAULT '122103';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS distance_km numeric DEFAULT 0.1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'Desktop';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS os_name text DEFAULT 'Windows';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS browser_name text DEFAULT 'Chrome';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Kolkata';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fraud_risk_level text DEFAULT 'low';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fraud_risk_reasons text[];

-- Order ERP Security & Geolocation metadata
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_ip text DEFAULT '103.211.14.82';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_latitude double precision DEFAULT 28.2468;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_longitude double precision DEFAULT 77.0628;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gps_accuracy numeric DEFAULT 15;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gps_allowed boolean DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distance_km numeric DEFAULT 0.1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'Desktop';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS os_name text DEFAULT 'Windows';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS browser_name text DEFAULT 'Chrome';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city text DEFAULT 'Sohna / Gurgaon';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS state text DEFAULT 'Haryana';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pin_code text DEFAULT '122103';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fraud_risk_level text DEFAULT 'low';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fraud_risk_reasons text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 5. Helper Function to Check Admin/Staff Privileges (SECURITY DEFINER prevents RLS infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always grant admin if JWT email matches admin accounts
  IF lower(coalesce(auth.jwt() ->> 'email', '')) IN ('nagapavankumarjavisetty@gmail.com', 'admin@gallery.app') THEN
    RETURN true;
  END IF;

  -- Read role bypassing RLS recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
END;
$$;

-- 6. RLS Policies (Idempotent: Drop existing policies first, then recreate)
DROP POLICY IF EXISTS "Users access own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins full control profiles" ON public.profiles;

-- Allow users to manage their own profile (auth.uid() = id has zero subqueries, preventing recursion)
-- Only `authenticated`: `anon` has no auth.uid(), so granting it here would only
-- widen the surface without enabling anything.
CREATE POLICY "Users access own profile" ON public.profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins and staff full control over profiles (Uses SECURITY DEFINER function to bypass RLS recursion)
CREATE POLICY "Admins full control profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- 6b. Privilege columns are not self-service.
--
-- The "Users access own profile" policy lets a user write their own row, and the
-- anon key plus that row is enough to call PostgREST directly -- so without this
-- guard any customer could set role = 'admin' on themselves. Values written by a
-- non-admin caller are forced back to the previous (or default) value instead of
-- raising, so ordinary profile writes that happen to include these columns keep
-- working.
CREATE OR REPLACE FUNCTION public.enforce_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_or_staff() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := CASE
      WHEN lower(coalesce(NEW.email, '')) IN ('nagapavankumarjavisetty@gmail.com', 'admin@gallery.app')
        THEN 'admin'
      ELSE 'customer'
    END;
    NEW.account_status := 'active';
  ELSE
    NEW.role := OLD.role;
    NEW.account_status := OLD.account_status;
    NEW.is_approved := OLD.is_approved;
    NEW.is_active := OLD.is_active;
    NEW.id := OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_enforce_privileges ON public.profiles;
CREATE TRIGGER profiles_enforce_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_privileges();

-- 7. Postgres Trigger Function for Automatic Signup Handling
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
DECLARE
  user_phone text;
  user_name text;
  user_ip text;
  user_lat double precision;
  user_lng double precision;
  assigned_role text;
BEGIN
  user_phone := COALESCE(new.raw_user_meta_data->>'phone', '');
  user_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  user_ip := COALESCE(new.raw_user_meta_data->>'ip_address', new.raw_user_meta_data->>'ip', '103.211.14.82');
  user_lat := COALESCE(NULLIF(new.raw_user_meta_data->>'latitude', '')::double precision, 17.3850);
  user_lng := COALESCE(NULLIF(new.raw_user_meta_data->>'longitude', '')::double precision, 78.4867);

  IF new.email = 'admin@gallery.app' OR new.email = 'nagapavankumarjavisetty@gmail.com' THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'customer';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    hostel_address,
    role,
    account_status,
    is_whatsapp_verified,
    is_approved,
    is_active,
    auth_provider,
    ip_address,
    latitude,
    longitude,
    location_city,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    user_name,
    user_phone,
    COALESCE(new.raw_user_meta_data->>'hostel_address', ''),
    assigned_role,
    'active',
    false,
    (assigned_role = 'admin'), -- Admin auto-approved
    true,
    'Email',
    user_ip,
    user_lat,
    user_lng,
    'Sohna GLS Homes near GDGU, Haryana',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    hostel_address = EXCLUDED.hostel_address,
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Attach Trigger to auth.users Table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();


