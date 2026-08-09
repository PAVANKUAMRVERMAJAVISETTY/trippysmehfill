-- ====================================================================
-- 0011 — OFFERS & COUPONS SCHEMA
-- ====================================================================
-- Idempotent & safe migration for dynamic offers and promo codes.

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  code text NOT NULL UNIQUE,
  discount_label text NOT NULL DEFAULT 'DISCOUNT',
  discount_type text DEFAULT 'percentage',
  discount_value numeric DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0,
  valid_until text,
  created_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offers_public_read ON public.offers;
CREATE POLICY offers_public_read ON public.offers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS offers_admin_write ON public.offers;
CREATE POLICY offers_admin_write ON public.offers
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Seed default initial offers if not already present
INSERT INTO public.offers (title, description, code, discount_label, discount_type, discount_value, min_order_amount, is_active, display_order)
VALUES
  ('20% OFF on First Order', 'Sign up now and get 20% off your first order with code WELCOME20.', 'WELCOME20', '20% OFF', 'percentage', 20, 0, true, 1),
  ('Free Delivery on Orders Above Rs. 500', 'Enjoy free home delivery on all orders above Rs. 500 across campus & hostels.', 'FREEDEL', 'FREE DEL', 'free_delivery', 0, 500, true, 2),
  ('Buy 1 Get 1 on Biryani', 'Order any biryani and get one free on select weekdays.', 'BIRYANI12', '50% OFF', 'percentage', 50, 0, true, 3)
ON CONFLICT (code) DO NOTHING;

NOTIFY pgrst, 'reload schema';
