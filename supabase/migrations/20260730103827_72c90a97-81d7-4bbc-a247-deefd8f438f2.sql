-- Storage policies for dish photos
CREATE POLICY "staff upload menu images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-images' AND public.is_staff(auth.uid()));
CREATE POLICY "staff update menu images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-images' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'menu-images' AND public.is_staff(auth.uid()));
CREATE POLICY "staff delete menu images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'menu-images' AND public.is_staff(auth.uid()));
CREATE POLICY "read menu images" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'menu-images');

-- Recreate place_order with a payment-method argument (online UPI vs cash on delivery)
DROP FUNCTION IF EXISTS public.place_order(text, text, text, text, text, text, jsonb, numeric, double precision, double precision, text, text);

CREATE OR REPLACE FUNCTION public.place_order(
  p_name text, p_phone text, p_campus text, p_address text, p_food_preference text, p_notes text,
  p_items jsonb, p_total numeric,
  p_latitude double precision DEFAULT NULL, p_longitude double precision DEFAULT NULL,
  p_geo_address text DEFAULT NULL, p_ip_address text DEFAULT NULL,
  p_payment_method text DEFAULT 'UPI')
RETURNS TABLE(id uuid, order_no integer, subtotal numeric, delivery_fee numeric, tax numeric, total numeric, payment_method text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid; v_no int; v_uid uuid := auth.uid();
  s public.store_settings%ROWTYPE;
  v_sub numeric := 0; v_fee numeric := 0; v_tax numeric := 0; v_total numeric := 0;
  line jsonb; v_price numeric;
  v_method text := CASE WHEN upper(coalesce(p_payment_method,'UPI')) = 'COD' THEN 'COD' ELSE 'UPI' END;
  v_status public.order_status;
  v_paystatus text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Please sign in or register to place an order'; END IF;
  IF NOT public.is_approved_customer(v_uid) THEN RAISE EXCEPTION 'Your registration is pending Admin Approval.'; END IF;

  SELECT * INTO s FROM public.store_settings WHERE id LIMIT 1;
  IF NOT coalesce(s.is_open, true) THEN
    RAISE EXCEPTION 'The restaurant is currently closed. Opening hours: % to %', s.open_time, s.close_time;
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'Location access is required to place an order';
  END IF;
  IF coalesce(trim(p_name),'') = '' OR coalesce(trim(p_phone),'') = '' OR coalesce(trim(p_address),'') = '' THEN
    RAISE EXCEPTION 'Name, phone and address are required';
  END IF;
  IF jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  FOR line IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT m.price INTO v_price FROM public.menu_items m
      WHERE m.id::text = (line->>'id') AND m.is_available;
    IF v_price IS NULL THEN RAISE EXCEPTION 'One of the dishes is no longer available'; END IF;
    v_sub := v_sub + (v_price * greatest(coalesce((line->>'qty')::numeric, 1), 1));
  END LOOP;

  IF v_sub < coalesce(s.min_order_value, 0) THEN
    RAISE EXCEPTION 'Minimum order value is Rs.%', s.min_order_value;
  END IF;

  v_fee := CASE WHEN v_sub >= coalesce(s.free_delivery_threshold, 0) THEN 0 ELSE coalesce(s.delivery_charge, 0) END;
  v_tax := round(v_sub * coalesce(s.tax_percent, 0) / 100.0, 2);
  v_total := round(v_sub + v_fee + v_tax, 2);

  IF v_method = 'COD' THEN
    v_status := 'payment_successful'; v_paystatus := 'cod_pending';
  ELSE
    v_status := 'payment_pending'; v_paystatus := 'pending';
  END IF;

  INSERT INTO public.orders (customer_name, phone, campus, address, food_preference, notes, items,
                             subtotal, delivery_fee, tax, total, status, payment_status, payment_method,
                             eta_minutes, user_id, latitude, longitude, geo_address, ip_address)
  VALUES (left(trim(p_name),100), left(trim(p_phone),20), left(coalesce(p_campus,''),100), left(trim(p_address),400),
          left(coalesce(p_food_preference,''),100), left(coalesce(p_notes,''),500), p_items,
          v_sub, v_fee, v_tax, v_total, v_status, v_paystatus, v_method,
          coalesce(s.eta_minutes, 35), v_uid, p_latitude, p_longitude,
          left(coalesce(p_geo_address,''),300), left(coalesce(p_ip_address,''),64))
  RETURNING orders.id, orders.order_no INTO v_id, v_no;

  RETURN QUERY SELECT v_id, v_no, v_sub, v_fee, v_tax, v_total, v_method;
END; $function$;