-- ====================================================================
-- TRIPPY'S MEHFILL ERP: PHASE 2 ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 1. Helper Functions (Recursion-safe via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin'::user_role, 'staff'::user_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_driver_staff_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin'::user_role, 'staff'::user_role, 'driver'::user_role)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_driver_staff_or_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_driver_staff_or_admin() TO authenticated;

-- 2. Enable RLS on All Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies per Table

-- PROFILES
DROP POLICY IF EXISTS "Admins full profiles control" ON public.profiles;
CREATE POLICY "Admins full profiles control" ON public.profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_driver_staff_or_admin());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- CATEGORIES & MENU ITEMS
DROP POLICY IF EXISTS "Public read menu items" ON public.menu_items;
CREATE POLICY "Public read menu items" ON public.menu_items FOR SELECT USING (is_deleted = false OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "Admin manage menu items" ON public.menu_items;
CREATE POLICY "Admin manage menu items" ON public.menu_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (is_active = true OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ORDERS & ORDER ITEMS
DROP POLICY IF EXISTS "Customers view own orders" ON public.orders;
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id OR public.is_driver_staff_or_admin());

DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;
CREATE POLICY "Customers create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE USING (public.is_driver_staff_or_admin()) WITH CHECK (public.is_driver_staff_or_admin());

DROP POLICY IF EXISTS "Admin delete orders" ON public.orders;
CREATE POLICY "Admin delete orders" ON public.orders FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Read order items" ON public.order_items;
CREATE POLICY "Read order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND (customer_id = auth.uid() OR public.is_driver_staff_or_admin()))
);

DROP POLICY IF EXISTS "Create order items" ON public.order_items;
CREATE POLICY "Create order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND (customer_id = auth.uid() OR public.is_staff_or_admin()))
);

-- INVENTORY
DROP POLICY IF EXISTS "Staff view inventory" ON public.inventory;
CREATE POLICY "Staff view inventory" ON public.inventory FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "Staff update inventory" ON public.inventory;
CREATE POLICY "Staff update inventory" ON public.inventory FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS "Staff view inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Staff view inventory transactions" ON public.inventory_transactions FOR SELECT USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "Staff insert inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Staff insert inventory transactions" ON public.inventory_transactions FOR INSERT WITH CHECK (public.is_staff_or_admin());

-- FEEDBACK
DROP POLICY IF EXISTS "Public view feedback" ON public.feedback;
CREATE POLICY "Public view feedback" ON public.feedback FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers leave feedback" ON public.feedback;
CREATE POLICY "Customers leave feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = customer_id OR public.is_admin());

-- BANNERS & GALLERY
DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Public read banners" ON public.banners FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage banners" ON public.banners;
CREATE POLICY "Admin manage banners" ON public.banners FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read gallery" ON public.gallery_items;
CREATE POLICY "Public read gallery" ON public.gallery_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage gallery" ON public.gallery_items;
CREATE POLICY "Admin manage gallery" ON public.gallery_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PROMO CODES, PAYMENTS, DELIVERY LOCATIONS, SETTINGS
DROP POLICY IF EXISTS "Public read promo codes" ON public.promo_codes;
CREATE POLICY "Public read promo codes" ON public.promo_codes FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage promo codes" ON public.promo_codes;
CREATE POLICY "Admin manage promo codes" ON public.promo_codes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "View payments" ON public.payments;
CREATE POLICY "View payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = payments.order_id AND (customer_id = auth.uid() OR public.is_driver_staff_or_admin()))
);

DROP POLICY IF EXISTS "Insert payments" ON public.payments;
CREATE POLICY "Insert payments" ON public.payments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read settings" ON public.kitchen_settings;
CREATE POLICY "Public read settings" ON public.kitchen_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin update settings" ON public.kitchen_settings;
CREATE POLICY "Admin update settings" ON public.kitchen_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users read notifications" ON public.notifications;
CREATE POLICY "Users read notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users update notifications" ON public.notifications;
CREATE POLICY "Users update notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
CREATE POLICY "Insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- PRIVILEGE ESCALATION GUARD TRIGGER
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only administrators can change profile roles.';
    END IF;
    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'Only administrators can change account status.';
    END IF;
    IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
      RAISE EXCEPTION 'Only administrators can approve accounts.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
