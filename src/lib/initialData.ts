import { MenuItem, KitchenSettings, InventoryItem, UserProfile, Order, Feedback, PromotionalBanner, GalleryItem } from '../types';

export const initialKitchenSettings: KitchenSettings = {
  kitchen_name: "Trippy's Mehfill",
  is_open: true,
  opening_time: "09:00 AM",
  closing_time: "10:00 PM",
  min_order_value: 80,
  free_delivery_above: 200,
  delivery_charge: 30,
  tax_percent: 0,
  estimated_delivery_mins: 30,
  // Empty on purpose -- see services/supabase/settings.ts. Never ship a
  // payment destination as a default; an unconfigured kitchen must show no QR
  // rather than a QR pointing at someone else's account.
  restaurant_upi_id: "",
  whatsapp_number: "8569955929",
  closed_banner_message: "RESTAURANT IS CURRENTLY CLOSED (Opening Hours: 9:00 AM to 10:00 PM) - you can still browse the menu.",
  lat: 17.4483,
  lng: 78.3915,
  max_cod_radius_km: 15
};

export const initialMenuItems: MenuItem[] = [
  {
    id: 'm1',
    name: "Chicken Dum Biryani",
    description: "Slow-cooked on dum with tender chicken, boiled egg, fried onions, and mint.",
    price: 180,
    category: "Biryani",
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80",
    is_veg: false,
    is_available: true,
    is_todays_special: true,
    display_order: 1
  },
  {
    id: 'm2',
    name: "Chicken 65 Biryani",
    description: "Crispy Chicken 65 tossed through smoky dum biryani rice with boiled egg and curry leaves.",
    price: 190,
    category: "Biryani",
    image_url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&q=80",
    is_veg: false,
    is_available: true,
    is_todays_special: true,
    display_order: 2
  },
  {
    id: 'm3',
    name: "Trippy's Mehffil SP CB",
    description: "Crispy fried Chicken 65-style masala pieces with boiled egg layered through satisfying dum biryani rice.",
    price: 220,
    category: "Biryani",
    image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&q=80",
    is_veg: false,
    is_available: true,
    is_todays_special: false,
    display_order: 3
  },
  {
    id: 'm4',
    name: "Chicken Fry Piece",
    description: "Golden fried chicken pieces marinated in aromatic spices, served over fragrant basmati rice.",
    price: 190,
    category: "Biryani",
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80",
    is_veg: false,
    is_available: true,
    is_todays_special: false,
    display_order: 4
  },
  {
    id: 'm5',
    name: "Home made Ghee Dosa (3 Pcs)",
    description: "A perfectly crisp dosa generously roasted with pure desi ghee, offering a rich aroma and authentic South Indian flavor.",
    price: 100,
    category: "South Indian",
    image_url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80",
    is_veg: true,
    is_available: true,
    is_todays_special: false,
    display_order: 5
  },
  {
    id: 'm6',
    name: "Home made Masala Dosa (2 Pcs)",
    description: "Golden crispy dosa filled with a mildly spiced potato masala, served with fresh chutney.",
    price: 100,
    category: "South Indian",
    image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80",
    is_veg: true,
    is_available: true,
    is_todays_special: false,
    display_order: 6
  },
  {
    id: 'm7',
    name: "Home Egg Dosa (2 Pcs)",
    description: "2 homemade-style egg dosas, freshly prepared with farm fresh eggs and less oil. Served with our signature peanut chutney.",
    price: 80,
    category: "South Indian",
    image_url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80",
    is_veg: false,
    is_available: true,
    is_todays_special: false,
    display_order: 7
  },
  {
    id: 'm8',
    name: "Home Made Onion Dosa (4 Pcs)",
    description: "3 mini homemade-style onion dosas made with fresh onions, carrot and coriander and less oil, served with our signature peanut chutney.",
    price: 100,
    category: "South Indian",
    image_url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80",
    is_veg: true,
    is_available: true,
    is_todays_special: false,
    display_order: 8
  },
  {
    id: 'm9',
    name: "Andhra Pulihara",
    description: "A traditional Andhra favorite made with fragrant rice, roasted peanuts, fresh curry leaves, and authentic South Indian spices.",
    price: 50,
    category: "South Indian",
    image_url: "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&q=80",
    is_veg: true,
    is_available: true,
    is_todays_special: false,
    display_order: 9
  },
  {
    id: 'm10',
    name: "Andhra Special Chicken Pakodi - 200gm",
    description: "Crispy, juicy chicken pakodi marinated with signature Andhra spices, perfectly fried and served with fresh onion slices and lemon wedges.",
    price: 200,
    category: "Non-Veg",
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80",
    is_veg: false,
    is_available: true,
    is_todays_special: false,
    display_order: 10
  },
  {
    id: 'm11',
    name: "Butter Naan",
    description: "Freshly baked tandoori naan brushed with pure butter.",
    price: 40,
    category: "Veg",
    image_url: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&q=80",
    is_veg: true,
    is_available: true,
    is_todays_special: false,
    display_order: 11
  },
  {
    id: 'm12',
    name: "Special Paneer Butter Masala",
    description: "Rich creamy tomato gravy with tender cottage cheese cubes.",
    price: 190,
    category: "Veg",
    image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80",
    is_veg: true,
    is_available: true,
    is_todays_special: false,
    display_order: 12
  }
];

export const initialInventory: InventoryItem[] = [
  { id: 'inv1', item_name: 'Chicken', unit: 'kg', quantity: 25, low_alert_threshold: 5 },
  { id: 'inv2', item_name: 'Eggs', unit: 'pcs', quantity: 200, low_alert_threshold: 30 },
  { id: 'inv3', item_name: 'Masala', unit: 'kg', quantity: 10, low_alert_threshold: 2 },
  { id: 'inv4', item_name: 'Oil', unit: 'L', quantity: 25, low_alert_threshold: 5 },
  { id: 'inv5', item_name: 'Packaging Materials', unit: 'pcs', quantity: 500, low_alert_threshold: 50 },
  { id: 'inv6', item_name: 'Rice', unit: 'kg', quantity: 50, low_alert_threshold: 10 },
  { id: 'inv7', item_name: 'Vegetables', unit: 'kg', quantity: 20, low_alert_threshold: 5 }
];

export const initialStaffAndDrivers: UserProfile[] = [
  {
    id: 'u-admin-1',
    email: 'nagapavankumarjavisetty@gmail.com',
    full_name: 'Javisetty Naga Pavan Kumar',
    phone: '6301196547',
    role: 'admin',
    is_approved: true,
    is_active: true,
    username: 'admin'
  },
  {
    id: 'u-admin-2',
    email: 'narendrakumar@gmail.com',
    full_name: 'Narendra Kumar',
    phone: '9851816577',
    role: 'admin',
    is_approved: true,
    is_active: true,
    username: 'narendra'
  },
  {
    id: 'u-admin-3',
    email: 'nithishnaruboina@gmail.com',
    full_name: 'Nithish Naruboina',
    phone: '7671018717',
    role: 'admin',
    is_approved: true,
    is_active: true,
    username: 'nithish'
  },
  {
    id: 'u-staff-1',
    email: 'arpityadav@gmail.com',
    full_name: 'Arpit Yadav',
    phone: '8604005653',
    role: 'staff',
    is_approved: true,
    is_active: true
  },
  {
    id: 'u-staff-2',
    email: 'sajid@gmail.com',
    full_name: 'Sajid',
    phone: '7396475834',
    role: 'staff',
    is_approved: true,
    is_active: true
  },
  {
    id: 'u-driver-1',
    email: 'mchenna@gmail.com',
    full_name: 'M Chenna',
    phone: '6301050250',
    role: 'driver',
    is_approved: true,
    is_active: true
  },
  {
    id: 'u-driver-2',
    email: 'sandeep@gmail.com',
    full_name: 'Sandeep',
    phone: '8555952001',
    role: 'driver',
    is_approved: true,
    is_active: true
  },
  {
    id: 'u-driver-3',
    email: 'nithishdriver@gmail.com',
    full_name: 'Nithish',
    phone: '7671018717',
    role: 'driver',
    is_approved: true,
    is_active: true
  }
];

export const initialPendingRegistrations: UserProfile[] = [];

export const initialOrders: Order[] = [];

// Emptied in Phase 1: these were fabricated customer records (real-looking
// names, emails and phone numbers) shipped in the bundle and seeded straight
// into state. Real customers now come from Supabase.
export const initialCustomers: UserProfile[] = [];

export const initialGalleryItems: GalleryItem[] = [];

export const initialFeedback: Feedback[] = [];

export const initialBanners: PromotionalBanner[] = [
  {
    id: 'b1',
    title: 'Hyderabad Dum Biryani Feast - 20% OFF',
    poster_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80',
    is_active: true
  }
];
