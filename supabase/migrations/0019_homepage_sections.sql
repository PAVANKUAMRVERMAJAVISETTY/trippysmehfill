-- ====================================================================
-- 0019 — HOMEPAGE SECTIONS CMS & RESTAURANT EMAIL SCHEMA UPDATE
-- ====================================================================

-- 1. Create homepage_sections table for dynamic website CMS
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  image_url TEXT,
  mobile_image_url TEXT,
  button_text TEXT,
  button_link TEXT,
  secondary_button_text TEXT,
  secondary_button_link TEXT,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 2. Ensure RLS is enabled and policies allow public reading & staff editing
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS homepage_sections_public_read ON public.homepage_sections;
CREATE POLICY homepage_sections_public_read ON public.homepage_sections
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS homepage_sections_staff_write ON public.homepage_sections;
CREATE POLICY homepage_sections_staff_write ON public.homepage_sections
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Add email column to restaurant_settings if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_settings' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.restaurant_settings ADD COLUMN email TEXT DEFAULT 'trippysmehfill.kitchen@gmail.com';
  END IF;
END $$;

-- 4. Seed initial default section records
INSERT INTO public.homepage_sections (section_key, title, subtitle, description, image_url, button_text, button_link, secondary_button_text, secondary_button_link, is_visible, display_order)
VALUES
  (
    'hero',
    'Great Food. Memorable Celebrations. Comfortable Stays.',
    'RESTAURANT • CLOUD KITCHEN • VENUE • GUEST HOUSE',
    'Authentic multi-cuisine dining, event celebrations, catering and comfortable guest-house stays at GLS Sohna.',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1600&q=80',
    '🍽️ Explore Menu',
    'menu-section',
    '🎉 Plan Your Celebration',
    'events-section',
    true,
    1
  ),
  (
    'chef_corner',
    'Crafted by an Experienced Continental Chef',
    'EXPERIENCED CULINARY TEAM',
    'At Trippy''s Mehfill, every dish is an artful fusion of authentic flavors, premium ingredients, and expert culinary techniques. Guided by an experienced Continental Chef, our kitchen prepares authentic multi-cuisine delicacies, signature specials, and party platters fresh to order.',
    'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80',
    'Explore Menu',
    'menu-section',
    NULL,
    NULL,
    true,
    2
  ),
  (
    'food_dining',
    'Everything You Need Under One Roof',
    'ALL-IN-ONE HOSPITALITY HUB',
    'Experience premium multi-cuisine dining, memorable party celebrations, function hall venue hosting, and comfortable guest house stays at GLS Sohna.',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
    'Explore Menu',
    'menu-section',
    NULL,
    NULL,
    true,
    3
  ),
  (
    'events_parties',
    'Celebrate Your Special Moments',
    'CELEBRATIONS & VENUE',
    'From intimate birthday gatherings to grand family functions and corporate meetups, Trippy''s Mehfill offers full event planning, venue setups, and exquisite multi-cuisine catering at GLS Sohna.',
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
    'WhatsApp Us',
    'https://wa.me/918569955929',
    'Call Us',
    'tel:8569955929',
    true,
    4
  ),
  (
    'function_hall',
    'Spacious Function Hall at GLS Sohna',
    'EVENT VENUE SHOWCASE',
    'Host your next birthday party, private dinner, family gathering, or corporate function in our ambient event hall. Supported by our on-site cloud kitchen, we provide seamless catering, custom seating, and attentive service.',
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
    'Enquire Hall Availability',
    'https://wa.me/918569955929',
    'Call Venue Manager',
    'tel:8569955929',
    true,
    5
  ),
  (
    'guest_house',
    'Stay Comfortable at GLS Sohna',
    'GUEST ACCOMMODATIONS',
    'Whether visiting for campus events, late-night stays, or regional trips in Sohna, our guest house rooms offer clean, comfortable, and peaceful accommodations with direct food delivery from our kitchen.',
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80',
    'Enquire About Rooms',
    'https://wa.me/918569955929',
    'Call Desk',
    'tel:8569955929',
    true,
    6
  ),
  (
    'gallery_intro',
    'Gallery & Ambience',
    'VISUAL HOSPITALITY SHOWCASE',
    'Sharp high-resolution photography of multi-cuisine food, birthday party setups, function hall, and guest house rooms at GLS Sohna.',
    NULL,
    'Launch Fullscreen Slideshow',
    'gallery-section',
    NULL,
    NULL,
    true,
    7
  ),
  (
    'offers_intro',
    'LATEST PROMO OFFERS',
    'EXCLUSIVE SAVINGS',
    'Exclusive discount promo codes for multi-cuisine food delivery & party orders',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true,
    8
  ),
  (
    'contact_intro',
    'We Are Here For You',
    'FIND & CONTACT US',
    'Have questions about food delivery, birthday party venue bookings, catering menus, or guest house room stays? Reach out to us directly.',
    NULL,
    'Chat on WhatsApp',
    'https://wa.me/918569955929',
    'Call Us Now',
    'tel:8569955929',
    true,
    9
  )
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  updated_at = timezone('utc', now());

-- 5. PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
