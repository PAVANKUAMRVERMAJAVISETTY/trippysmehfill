
CREATE TYPE public.app_role AS ENUM ('admin','staff','driver');
CREATE TYPE public.order_status AS ENUM ('pending','assigned','delivered','cancelled');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','staff'));
$$;

CREATE POLICY "profiles readable by signed-in users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "roles readable by signed-in users" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  category text NOT NULL DEFAULT 'nonveg',
  is_available boolean NOT NULL DEFAULT true,
  is_special boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public can view available menu" ON public.menu_items FOR SELECT TO anon USING (is_available = true);
CREATE POLICY "signed-in can view menu" ON public.menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage menu insert" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff manage menu update" ON public.menu_items FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff manage menu delete" ON public.menu_items FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE SEQUENCE public.order_no_seq START 1001;
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no int NOT NULL DEFAULT nextval('public.order_no_seq'),
  customer_name text NOT NULL,
  phone text NOT NULL,
  campus text,
  address text NOT NULL,
  food_preference text,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_method text NOT NULL DEFAULT 'COD',
  created_at timestamptz NOT NULL DEFAULT now(),
  assigned_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  delivery_minutes int
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in can view orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff or assigned driver update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR driver_id = auth.uid())
  WITH CHECK (public.is_staff(auth.uid()) OR driver_id = auth.uid());
CREATE POLICY "staff delete orders" ON public.orders FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  food int NOT NULL DEFAULT 5,
  taste int NOT NULL DEFAULT 5,
  packing int NOT NULL DEFAULT 5,
  delivery int NOT NULL DEFAULT 5,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in can view feedback" ON public.feedback FOR SELECT TO authenticated USING (true);

-- Public helpers (no login needed, limited data)
CREATE OR REPLACE FUNCTION public.place_order(
  p_name text, p_phone text, p_campus text, p_address text,
  p_food_preference text, p_notes text, p_items jsonb, p_total numeric
) RETURNS TABLE (id uuid, order_no int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_no int;
BEGIN
  IF coalesce(trim(p_name),'') = '' OR coalesce(trim(p_phone),'') = '' OR coalesce(trim(p_address),'') = '' THEN
    RAISE EXCEPTION 'Name, phone and address are required';
  END IF;
  IF jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;
  INSERT INTO public.orders (customer_name, phone, campus, address, food_preference, notes, items, total)
  VALUES (left(trim(p_name),100), left(trim(p_phone),20), left(coalesce(p_campus,''),100), left(trim(p_address),400),
          left(coalesce(p_food_preference,''),100), left(coalesce(p_notes,''),500), p_items, greatest(p_total,0))
  RETURNING orders.id, orders.order_no INTO v_id, v_no;
  RETURN QUERY SELECT v_id, v_no;
END; $$;
GRANT EXECUTE ON FUNCTION public.place_order(text,text,text,text,text,text,jsonb,numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_orders(p_phone text)
RETURNS TABLE (id uuid, order_no int, status public.order_status, total numeric, created_at timestamptz, driver_name text, items jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.order_no, o.status, o.total, o.created_at, p.name, o.items
  FROM public.orders o LEFT JOIN public.profiles p ON p.id = o.driver_id
  WHERE o.phone = trim(p_phone)
  ORDER BY o.created_at DESC LIMIT 10;
$$;
GRANT EXECUTE ON FUNCTION public.track_orders(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_order_id uuid, p_food int, p_taste int, p_packing int, p_delivery int, p_comments text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND status = 'delivered') THEN
    RAISE EXCEPTION 'Feedback is only allowed for delivered orders';
  END IF;
  IF EXISTS (SELECT 1 FROM public.feedback WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Feedback already submitted for this order';
  END IF;
  INSERT INTO public.feedback (order_id, food, taste, packing, delivery, comments)
  VALUES (p_order_id, least(greatest(p_food,1),5), least(greatest(p_taste,1),5),
          least(greatest(p_packing,1),5), least(greatest(p_delivery,1),5), left(coalesce(p_comments,''),1000));
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_feedback(uuid,int,int,int,int,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.order_summary(p_order_id uuid)
RETURNS TABLE (order_no int, customer_name text, status public.order_status, has_feedback boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.order_no, o.customer_name, o.status, EXISTS (SELECT 1 FROM public.feedback f WHERE f.order_id = o.id)
  FROM public.orders o WHERE o.id = p_order_id;
$$;
GRANT EXECUTE ON FUNCTION public.order_summary(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_any_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;

INSERT INTO public.menu_items (name, description, price, category, is_special, sort_order) VALUES
('Veg Khichdi Katta','Turmeric and ghee-tempered khichdi rice, soft and comforting, served alongside tangy curry and papad.',150,'veg',false,1),
('Paneer Biryani (Veg Biryani)','Soft paneer cubes layered into saffron basmati rice with fried onions and coriander.',190,'veg',false,2),
('Chicken Keema Katta','Minced chicken simmered in a rich, thick spiced masala, served over fragrant rice.',170,'nonveg',false,3),
('Chicken Dum Biryani','Slow-cooked on dum with tender chicken, boiled egg, fried onions and mint.',180,'nonveg',true,4),
('Chicken Fry Piece','Golden fried chicken pieces marinated in aromatic spices, served over fragrant basmati rice.',190,'nonveg',false,5),
('Trippy''s Mehfill SP CB','Crispy Fried Chicken-65 style masala pieces with boiled egg, layered through smoky dum biryani rice.',220,'nonveg',true,6),
('Chicken 65 Biryani','Crispy Chicken 65 tossed through smoky dum biryani rice with boiled egg and curry leaves.',210,'nonveg',false,7),
('Bagara Rice & Chicken Curry (Dum)','Rich. Spiced. Irresistible. Bagara rice paired with dum chicken curry.',150,'nonveg',false,8);
