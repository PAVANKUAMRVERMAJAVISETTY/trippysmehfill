-- ====================================================================
-- 0015 — CLEAN TRANSACTIONAL ORDER DATA ONLY
-- ====================================================================
-- Idempotent & non-destructive to user accounts, profiles, or master data.

-- 1. Clean dependent feedback rows first
DELETE FROM public.feedback;

-- 2. Clean dependent payments rows if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    DELETE FROM public.payments;
  END IF;
END $$;

-- 3. Clean main orders table
DELETE FROM public.orders;

-- 4. PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
