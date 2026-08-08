-- ====================================================================
-- TRIPPY'S MEHFILL ERP: PHASE 2 DATABASE SCHEMA
-- ====================================================================
-- Production schema covering all restaurant ERP tables, foreign keys,
-- constraints, soft deletes, timestamps, and indexes.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Custom Types & ENUMs
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'driver', 'customer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('active', 'pending_verification', 'blocked_fraud');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'cooking', 'assigned', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('COD', 'UPI', 'Card', 'Razorpay');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Extended Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role DEFAULT 'customer'::user_role NOT NULL,
  account_status account_status DEFAULT 'active'::account_status NOT NULL,
  is_approved boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  is_whatsapp_verified boolean DEFAULT false,
  username text,
  avatar_url text,
  hostel_address text,
  registration_ip text,
  signup_latitude numeric,
  signup_longitude numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Roles and Permissions Tables
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 4. Food Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  display_order integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Menu Items Table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  category text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  is_veg boolean DEFAULT false NOT NULL,
  is_available boolean DEFAULT true NOT NULL,
  is_todays_special boolean DEFAULT false NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text NOT NULL,
  landmark text,
  campus text,
  subtotal numeric(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax_amount numeric(10, 2) DEFAULT 0 NOT NULL CHECK (tax_amount >= 0),
  delivery_fee numeric(10, 2) DEFAULT 0 NOT NULL CHECK (delivery_fee >= 0),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method payment_method DEFAULT 'COD'::payment_method NOT NULL,
  payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  upi_transaction_id text,
  status order_status DEFAULT 'pending'::order_status NOT NULL,
  driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  driver_name text,
  driver_phone text,
  kitchen_notes text,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Order Items Table
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

-- 8. Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name text NOT NULL,
  unit text NOT NULL, -- e.g. kg, pcs, L
  quantity numeric(10, 2) DEFAULT 0 NOT NULL CHECK (quantity >= 0),
  low_alert_threshold numeric(10, 2) DEFAULT 5 NOT NULL,
  is_deleted boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Inventory Transactions Table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  change_qty numeric(10, 2) NOT NULL,
  reason text NOT NULL, -- restock, waste, order_deduction, manual_adjustment
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  food_rating integer NOT NULL CHECK (food_rating BETWEEN 1 AND 5),
  taste_rating integer NOT NULL CHECK (taste_rating BETWEEN 1 AND 5),
  packing_rating integer NOT NULL CHECK (packing_rating BETWEEN 1 AND 5),
  delivery_rating integer NOT NULL CHECK (delivery_rating BETWEEN 1 AND 5),
  driver_name text,
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Banners Table
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  poster_url text NOT NULL,
  link_url text,
  is_active boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Gallery Items Table
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  caption text,
  image_url text NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Promo Codes Table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  discount_percent numeric(5, 2) DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_amount numeric(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  min_order_value numeric(10, 2) DEFAULT 0 CHECK (min_order_value >= 0),
  is_active boolean DEFAULT true NOT NULL,
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  upi_transaction_id text,
  gateway_response jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Delivery Locations Zone Table
CREATE TABLE IF NOT EXISTS public.delivery_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  max_cod_radius_km numeric DEFAULT 15 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. Kitchen ERP Settings Table (Single-row operational settings)
CREATE TABLE IF NOT EXISTS public.kitchen_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  kitchen_name text NOT NULL DEFAULT 'Trippy''s Mehfill',
  is_open boolean DEFAULT true NOT NULL,
  opening_time text DEFAULT '09:00 AM' NOT NULL,
  closing_time text DEFAULT '10:00 PM' NOT NULL,
  min_order_value numeric(10, 2) DEFAULT 80 NOT NULL,
  free_delivery_above numeric(10, 2) DEFAULT 200 NOT NULL,
  delivery_charge numeric(10, 2) DEFAULT 30 NOT NULL,
  tax_percent numeric(5, 2) DEFAULT 0 NOT NULL,
  estimated_delivery_mins integer DEFAULT 30 NOT NULL,
  restaurant_upi_id text DEFAULT '7671018757@ybl' NOT NULL,
  whatsapp_number text DEFAULT '8569955029' NOT NULL,
  closed_banner_message text DEFAULT 'RESTAURANT IS CURRENTLY CLOSED' NOT NULL,
  lat numeric DEFAULT 17.4483 NOT NULL,
  lng numeric DEFAULT 78.3915 NOT NULL,
  max_cod_radius_km numeric DEFAULT 15 NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' NOT NULL, -- info, order, system, alert
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Audit and Activity Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. Specialized Views for Staff and Customers
CREATE OR REPLACE VIEW public.staff AS
  SELECT * FROM public.profiles
  WHERE role IN ('staff'::user_role, 'driver'::user_role);

CREATE OR REPLACE VIEW public.customers AS
  SELECT * FROM public.profiles
  WHERE role = 'customer'::user_role;

-- 20. Updated_At Auto-Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_inventory_updated_at ON public.inventory;
CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_kitchen_settings_updated_at ON public.kitchen_settings;
CREATE TRIGGER set_kitchen_settings_updated_at
  BEFORE UPDATE ON public.kitchen_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 21. Indexes for Performance Optimization
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_feedback_order_id ON public.feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
