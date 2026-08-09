-- ====================================================================
-- 0016 — RESTAURANT SETTINGS CONTACT INFORMATION UPDATE
-- ====================================================================
-- Idempotent & non-destructive update to restaurant contact information.

-- 1. Ensure RLS policies permit write access
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS restaurant_settings_public_read ON public.restaurant_settings;
CREATE POLICY restaurant_settings_public_read ON public.restaurant_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS restaurant_settings_staff_write ON public.restaurant_settings;
CREATE POLICY restaurant_settings_staff_write ON public.restaurant_settings
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Update existing rows to new restaurant contact phone, whatsapp, and address
UPDATE public.restaurant_settings
SET
  contact_phone = '8569955929',
  whatsapp_numbers = '8569955929',
  address = 'GLS Arawali Homes, Damdama Lake Rd, Sohna Rural, Haryana 122103',
  updated_at = timezone('utc', now())
WHERE id IS NOT NULL;

-- 3. PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
