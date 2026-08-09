-- ====================================================================
-- 0013 — MENU & GALLERY SCHEMA ENHANCEMENTS AND STORAGE INDEXES
-- ====================================================================
-- Idempotent & non-destructive: Safe to apply on live Supabase project.

-- 1. Ensure menu_items display_order index ---------------------------
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
CREATE INDEX IF NOT EXISTS menu_items_display_order_idx ON public.menu_items (display_order ASC);

-- 2. Ensure gallery_items display_order index ------------------------
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
CREATE INDEX IF NOT EXISTS gallery_items_display_order_idx ON public.gallery_items (display_order ASC);

-- 3. PostgREST Schema Cache Reload -----------------------------------
NOTIFY pgrst, 'reload schema';
