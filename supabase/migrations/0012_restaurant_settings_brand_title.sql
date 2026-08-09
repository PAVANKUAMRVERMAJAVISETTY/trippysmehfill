-- Migration 0012: Add brand_title column to restaurant_settings table
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS brand_title text
DEFAULT 'CLOUD KITCHEN ERP';

NOTIFY pgrst, 'reload schema';
