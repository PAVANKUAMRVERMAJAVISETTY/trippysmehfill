-- ====================================================================
-- 0001 — CORE SCHEMA
-- ====================================================================
-- Creates every table the app queries. Previously only `public.profiles`
-- existed in version control while `orders`, `menu_items`, `kitchen_settings`
-- and `feedback` were created by hand in the dashboard, so `schema.sql` aborted
-- on a fresh project at `ALTER TABLE public.orders` (relation does not exist).
--
-- Idempotent: safe to re-run on the existing project.
--
-- Column types follow what the client actually inserts. `orders.id`,
-- `feedback.id` and every `created_at` are TEXT because the client generates
-- `'ord-' + Date.now()` ids and writes `new Date().toLocaleString()`
-- ("27/7/2026, 3:43:22 pm"), which is not a valid timestamptz. See the PR notes.

-- 1. Enums ------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'driver', 'customer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('active', 'pending_verification', 'blocked_fraud');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. profiles ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hostel_address text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_whatsapp_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'Email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_accuracy numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_allowed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text DEFAULT 'India';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS distance_km numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS os_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS browser_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fraud_risk_level text DEFAULT 'low';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fraud_risk_reasons text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'customer';
ALTER TABLE public.profiles ALTER COLUMN account_status SET DEFAULT 'active';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'staff', 'driver', 'customer'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check,
  ADD CONSTRAINT profiles_account_status_check
    CHECK (account_status IN ('active', 'pending_verification', 'blocked_fraud'));

-- `email UNIQUE` is case-sensitive, but `sendPasswordResetOTP` looks accounts up
-- with `.ilike('email', ...).maybeSingle()`. Two rows differing only in case
-- would make that call error, so uniqueness is enforced case-insensitively.
DROP INDEX IF EXISTS public.profiles_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_key
  ON public.profiles (lower(email));

-- 3. menu_items -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL CHECK (price >= 0),
  category text NOT NULL DEFAULT 'Biryani',
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_veg boolean DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_todays_special boolean DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS display_order integer;

-- 4. kitchen_settings -------------------------------------------------------
-- Single-row configuration table edited from the admin SettingsView, which
-- upserts the whole `KitchenSettings` object; every field it sends must exist
-- or PostgREST rejects the write with PGRST204.

CREATE TABLE IF NOT EXISTS public.kitchen_settings (
  id integer PRIMARY KEY DEFAULT 1,
  kitchen_name text NOT NULL DEFAULT 'Trippy''s Mehfill',
  created_at timestamptz DEFAULT timezone('utc', now()),
  CONSTRAINT kitchen_settings_single_row CHECK (id = 1)
);

ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT true;
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS opening_time text DEFAULT '09:00 AM';
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS closing_time text DEFAULT '10:00 PM';
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS min_order_value numeric DEFAULT 80;
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS free_delivery_above numeric DEFAULT 200;
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS delivery_charge numeric DEFAULT 30;
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS tax_percent numeric DEFAULT 0;
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS estimated_delivery_mins integer DEFAULT 30;
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS restaurant_upi_id text DEFAULT '';
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS whatsapp_number text DEFAULT '';
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS closed_banner_message text DEFAULT '';
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.kitchen_settings ADD COLUMN IF NOT EXISTS max_cod_radius_km numeric DEFAULT 15;

-- Carry the legacy `upi_id` value over to the column the client reads.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'kitchen_settings' AND column_name = 'upi_id'
  ) THEN
    UPDATE public.kitchen_settings
      SET restaurant_upi_id = upi_id
      WHERE coalesce(restaurant_upi_id, '') = '' AND upi_id IS NOT NULL;
  END IF;
END $$;

INSERT INTO public.kitchen_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 5. orders -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  delivery_address text NOT NULL DEFAULT '',
  landmark text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'COD',
  payment_status text NOT NULL DEFAULT 'pending',
  upi_transaction_id text,
  status text NOT NULL DEFAULT 'pending',
  driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  driver_name text,
  driver_phone text,
  kitchen_notes text,
  campus text,
  rating numeric CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at text NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_ip text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_latitude double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_longitude double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gps_accuracy numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gps_allowed boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distance_km numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS device_type text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS os_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS browser_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pin_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fraud_risk_level text DEFAULT 'low';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fraud_risk_reasons text[];

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check,
  ADD CONSTRAINT orders_status_check CHECK (
    status IN ('pending', 'cooking', 'assigned', 'out_for_delivery', 'delivered', 'cancelled')
  );

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check,
  ADD CONSTRAINT orders_payment_status_check CHECK (
    payment_status IN ('pending', 'completed', 'failed', 'refunded')
  );

CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_driver_id_idx ON public.orders (driver_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);

-- 6. feedback ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feedback (
  id text PRIMARY KEY,
  order_id text NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_email text,
  food_rating integer NOT NULL CHECK (food_rating BETWEEN 1 AND 5),
  taste_rating integer NOT NULL CHECK (taste_rating BETWEEN 1 AND 5),
  packing_rating integer NOT NULL CHECK (packing_rating BETWEEN 1 AND 5),
  delivery_rating integer NOT NULL CHECK (delivery_rating BETWEEN 1 AND 5),
  driver_name text,
  comment text,
  created_at text NOT NULL
);

-- 7. inventory --------------------------------------------------------------
-- Referenced by InventoryView; missing entirely from the live project
-- (PostgREST returns PGRST205 "Could not find the table 'public.inventory'").

CREATE TABLE IF NOT EXISTS public.inventory (
  id text PRIMARY KEY,
  item_name text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  quantity numeric NOT NULL DEFAULT 0,
  low_alert_threshold numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT timezone('utc', now())
);
