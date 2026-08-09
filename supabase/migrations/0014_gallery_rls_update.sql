-- ====================================================================
-- 0014 — GALLERY ITEMS RLS WRITE POLICY & RPC UPDATE FUNCTION
-- ====================================================================
-- Idempotent & non-destructive: Safe to apply on live Supabase project.

-- 1. Ensure Row Level Security is enabled on gallery_items
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- 2. Allow SELECT for public and authenticated users
DROP POLICY IF EXISTS gallery_items_public_read ON public.gallery_items;
CREATE POLICY gallery_items_public_read ON public.gallery_items
  FOR SELECT TO anon, authenticated USING (true);

-- 3. Allow INSERT, UPDATE, DELETE for public, anon, and authenticated users
DROP POLICY IF EXISTS gallery_items_admin_write ON public.gallery_items;
CREATE POLICY gallery_items_admin_write ON public.gallery_items
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. SECURITY DEFINER RPC helper for guaranteed gallery item updates
CREATE OR REPLACE FUNCTION public.update_gallery_item(
  p_id uuid,
  p_title text DEFAULT NULL,
  p_caption text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_display_order integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result public.gallery_items%ROWTYPE;
BEGIN
  UPDATE public.gallery_items
  SET
    title = COALESCE(p_title, title),
    caption = CASE WHEN p_caption IS NOT NULL THEN p_caption ELSE caption END,
    image_url = COALESCE(p_image_url, image_url),
    display_order = COALESCE(p_display_order, display_order)
  WHERE id = p_id
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gallery item with id % not found', p_id;
  END IF;

  RETURN to_jsonb(v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_gallery_item TO anon, authenticated;

-- 5. PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
