ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS geo_address text,
  ADD COLUMN IF NOT EXISTS ip_address text;

-- Profiles: restrict visibility, allow admins to manage approval status
DROP POLICY IF EXISTS "profiles readable by signed-in users" ON public.profiles;
CREATE POLICY "own profile or staff can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admins update any profile" ON public.profiles;
CREATE POLICY "admins update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Orders: customers only see their own
DROP POLICY IF EXISTS "signed-in can view orders" ON public.orders;
CREATE POLICY "staff drivers and owners view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR driver_id = auth.uid() OR user_id = auth.uid());

-- Feedback: keep readable to staff only
DROP POLICY IF EXISTS "signed-in can view feedback" ON public.feedback;
CREATE POLICY "staff can view feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Approved-customer check
CREATE OR REPLACE FUNCTION public.is_approved_customer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved' AND active);
$$;

-- Place order now requires an approved signed-in account plus GPS
CREATE OR REPLACE FUNCTION public.place_order(
  p_name text, p_phone text, p_campus text, p_address text,
  p_food_preference text, p_notes text, p_items jsonb, p_total numeric,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_geo_address text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS TABLE(id uuid, order_no integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_no int; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Please sign in or register to place an order';
  END IF;
  IF NOT public.is_approved_customer(v_uid) THEN
    RAISE EXCEPTION 'Your registration is pending Admin Approval.';
  END IF;
  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'Location access is required to place an order';
  END IF;
  IF coalesce(trim(p_name),'') = '' OR coalesce(trim(p_phone),'') = '' OR coalesce(trim(p_address),'') = '' THEN
    RAISE EXCEPTION 'Name, phone and address are required';
  END IF;
  IF jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;
  INSERT INTO public.orders (customer_name, phone, campus, address, food_preference, notes, items, total,
                             user_id, latitude, longitude, geo_address, ip_address)
  VALUES (left(trim(p_name),100), left(trim(p_phone),20), left(coalesce(p_campus,''),100), left(trim(p_address),400),
          left(coalesce(p_food_preference,''),100), left(coalesce(p_notes,''),500), p_items, greatest(p_total,0),
          v_uid, p_latitude, p_longitude, left(coalesce(p_geo_address,''),300), left(coalesce(p_ip_address,''),64))
  RETURNING orders.id, orders.order_no INTO v_id, v_no;
  RETURN QUERY SELECT v_id, v_no;
END; $$;

-- orders is already in the supabase_realtime publication