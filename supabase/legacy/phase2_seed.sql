-- ====================================================================
-- TRIPPY'S MEHFILL ERP: PHASE 2 SEED DATA
-- ====================================================================

-- 1. Categories
INSERT INTO public.categories (name, display_order) VALUES
  ('Biryani', 1),
  ('South Indian', 2),
  ('Pizza', 3),
  ('Burgers', 4),
  ('Desserts', 5)
ON CONFLICT (name) DO NOTHING;

-- 2. Kitchen Settings Initial Record
INSERT INTO public.kitchen_settings (
  kitchen_name, is_open, opening_time, closing_time, min_order_value,
  free_delivery_above, delivery_charge, tax_percent, estimated_delivery_mins,
  restaurant_upi_id, whatsapp_number, closed_banner_message, lat, lng, max_cod_radius_km
)
SELECT
  'Trippy''s Mehfill', true, '09:00 AM', '10:00 PM', 80,
  200, 30, 0, 30,
  '7671018757@ybl', '8569955029',
  'RESTAURANT IS CURRENTLY CLOSED (Opening Hours: 9:00 AM to 10:00 PM) - you can still browse the menu.',
  17.4483, 78.3915, 15
WHERE NOT EXISTS (SELECT 1 FROM public.kitchen_settings);

-- 3. Initial Menu Items
INSERT INTO public.menu_items (name, description, price, category, image_url, is_veg, is_available, is_todays_special, display_order) VALUES
  ('Chicken Dum Biryani', 'Slow-cooked on dum with tender chicken, boiled egg, fried onions, and mint.', 180, 'Biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', false, true, true, 1),
  ('Chicken 65 Biryani', 'Crispy Chicken 65 tossed through smoky dum biryani rice with boiled egg and curry leaves.', 190, 'Biryani', 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&q=80', false, true, true, 2),
  ('Trippy''s Mehffil SP CB', 'Crispy fried Chicken 65-style masala pieces with boiled egg layered through satisfying dum biryani rice.', 220, 'Biryani', 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&q=80', false, true, false, 3),
  ('Chicken Fry Piece', 'Golden fried chicken pieces marinated in aromatic spices, served over fragrant basmati rice.', 190, 'Biryani', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80', false, true, false, 4),
  ('Home made Ghee Dosa (3 Pcs)', 'A perfectly crisp dosa generously roasted with pure desi ghee, offering a rich aroma and authentic South Indian flavor.', 100, 'South Indian', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80', true, true, false, 5),
  ('Home made Masala Dosa (2 Pcs)', 'Golden crispy dosa filled with a mildly spiced potato masala, served with fresh chutney.', 100, 'South Indian', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80', true, true, false, 6),
  ('Home Egg Dosa (2 Pcs)', '2 homemade-style egg dosas, freshly prepared with farm fresh eggs and less oil.', 80, 'South Indian', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80', false, true, false, 7);

-- 4. Initial Banners
INSERT INTO public.banners (title, poster_url, link_url, is_active, display_order) VALUES
  ('Flat 20% OFF on First Biryani Order', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1000&q=80', '', true, 1),
  ('Late Night Delivery till 2 AM', 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1000&q=80', '', true, 2);

-- 5. Initial Gallery Items
INSERT INTO public.gallery_items (title, caption, image_url, display_order) VALUES
  ('Signature Dum Biryani', 'Prepared fresh daily with authentic spices and pure ghee.', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80', 1),
  ('Crispy Ghee Dosa', 'Hot off the tawa with fresh coconut & peanut chutney.', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&q=80', 2);

-- 6. Initial Inventory Items
INSERT INTO public.inventory (item_name, unit, quantity, low_alert_threshold) VALUES
  ('Basmati Rice', 'kg', 150.0, 20.0),
  ('Chicken', 'kg', 80.0, 15.0),
  ('Cooking Oil & Ghee', 'L', 45.0, 10.0),
  ('Eggs', 'pcs', 300.0, 50.0),
  ('Onions & Spices', 'kg', 60.0, 10.0);
