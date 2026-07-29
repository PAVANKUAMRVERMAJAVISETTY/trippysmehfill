-- 1. Extend the order lifecycle
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'payment_pending';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'payment_successful';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'preparing';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cooking';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'packing';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';

-- 2. Store settings (singleton)
CREATE TABLE public.store_settings (
  id boolean PRIMARY KEY DEFAULT true,
  is_open boolean NOT NULL DEFAULT true,
  open_time text NOT NULL DEFAULT '09:00',
  close_time text NOT NULL DEFAULT '21:00',
  min_order_value numeric NOT NULL DEFAULT 149,
  free_delivery_threshold numeric NOT NULL DEFAULT 249,
  delivery_charge numeric NOT NULL DEFAULT 30,
  tax_percent numeric NOT NULL DEFAULT 5,
  upi_id text NOT NULL DEFAULT '6301196547@ybl',
  whatsapp_number text NOT NULL DEFAULT '8569955929',
  eta_minutes integer NOT NULL DEFAULT 35,
  closed_message text NOT NULL DEFAULT 'RESTAURANT IS CURRENTLY CLOSED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_settings_singleton CHECK (id)
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read store settings anon" ON public.store_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anyone can read store settings" ON public.store_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update store settings" ON public.store_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert store settings" ON public.store_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.store_settings (id) VALUES (true);

-- 3. Promo banners
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  image_url text,
  link_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public can view active banners" ON public.banners FOR SELECT TO anon USING (is_active);
CREATE POLICY "signed-in can view banners" ON public.banners FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff insert banners" ON public.banners FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update banners" ON public.banners FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete banners" ON public.banners FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- 4. Inventory
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  quantity numeric NOT NULL DEFAULT 0,
  low_threshold numeric NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view inventory" ON public.inventory_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert inventory" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update inventory" ON public.inventory_items FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete inventory" ON public.inventory_items FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.menu_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  qty_per_serving numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, inventory_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_ingredients TO authenticated;
GRANT ALL ON public.menu_ingredients TO service_role;
ALTER TABLE public.menu_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view recipes" ON public.menu_ingredients FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert recipes" ON public.menu_ingredients FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update recipes" ON public.menu_ingredients FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete recipes" ON public.menu_ingredients FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

INSERT INTO public.inventory_items (name, unit, quantity, low_threshold) VALUES
  ('Rice', 'kg', 50, 10),
  ('Chicken', 'kg', 30, 8),
  ('Eggs', 'pcs', 200, 40),
  ('Oil', 'ltr', 25, 5),
  ('Vegetables', 'kg', 20, 5),
  ('Masala', 'kg', 10, 2),
  ('Packaging Materials', 'pcs', 500, 100);

-- 5. Order + profile columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_ref text,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eta_minutes integer NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_lat double precision,
  ADD COLUMN IF NOT EXISTS driver_lng double precision,
  ADD COLUMN IF NOT EXISTS driver_location_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_deducted boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vehicle_number text,
  ADD COLUMN IF NOT EXISTS photo_url text;

-- 6. Auto-deduct inventory when an order is delivered
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE line jsonb;
BEGIN
  IF NEW.status::text = 'delivered' AND NOT NEW.inventory_deducted THEN
    FOR line IN SELECT * FROM jsonb_array_elements(coalesce(NEW.items, '[]'::jsonb)) LOOP
      UPDATE public.inventory_items inv
      SET quantity = greatest(inv.quantity - (mi.qty_per_serving * coalesce((line->>'qty')::numeric, 1)), 0),
          updated_at = now()
      FROM public.menu_ingredients mi
      WHERE mi.inventory_item_id = inv.id
        AND mi.menu_item_id::text = (line->>'id');
    END LOOP;
    NEW.inventory_deducted := true;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_deduct_inventory ON public.orders;
CREATE TRIGGER trg_deduct_inventory
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.deduct_inventory_on_delivery();

-- 7. Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_store_settings_updated BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();