-- ====================================================================
-- TRIPPY'S MEHFIL — PRODUCTION DATA RESET (GRAND OPENING CLEANUP)
-- ====================================================================
-- Safely clears old test transactional data before official store launch.
-- 
-- REMOVES:
--   - Old transactional orders (`public.orders`)
--   - Old customer feedback & ratings (`public.feedback`)
--
-- PRESERVES:
--   - All user accounts & profiles (`auth.users`, `public.profiles`)
--   - Admin, Staff, and Driver accounts & permissions
--   - All menu items & dish prices (`public.menu_items`)
--   - Inventory items & thresholds (`public.inventory`)
--   - Kitchen settings & operational configs (`public.kitchen_settings`)
--   - Gallery items & photos (`public.gallery_items`)
--   - Promotional banners (`public.banners`)
--   - Home Page hero promotions (`public.home_promotions`)
--   - Offers & promo codes (`public.offers`)

BEGIN;

-- 1. Truncate feedback records linked to test orders
TRUNCATE TABLE public.feedback;

-- 2. Truncate old test orders
TRUNCATE TABLE public.orders;

COMMIT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
