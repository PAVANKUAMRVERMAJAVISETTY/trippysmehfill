export type UserRole = 'customer' | 'admin' | 'staff' | 'driver';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  hostel_address?: string;
  role: UserRole;
  account_status?: 'active' | 'pending_verification' | 'blocked_fraud';
  is_whatsapp_verified?: boolean;
  is_approved: boolean;
  is_active: boolean;
  username?: string;
  avatar_url?: string;
  created_at?: string;
  auth_provider?: 'Email' | 'Google' | 'Phone';
  ip_address?: string;
  latitude?: number;
  longitude?: number;
  location_city?: string;
  // ERP Security & Geolocation metadata
  gps_accuracy?: number;
  gps_allowed?: boolean;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  distance_km?: number;
  device_type?: string;
  os_name?: string;
  browser_name?: string;
  timezone?: string;
  google_maps_url?: string;
  fraud_risk_level?: 'low' | 'medium' | 'high';
  fraud_risk_reasons?: string[];
}

export interface GalleryItem {
  id: string;
  title: string;
  caption?: string;
  image_url: string;
  created_at: string;
}

export type FoodCategory = 'All' | 'Biryani' | 'Pizza' | 'Desserts' | 'South Indian' | 'Burgers' | 'Veg' | 'Non-Veg';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_veg: boolean;
  is_available: boolean;
  is_todays_special: boolean;
  display_order?: number;
  created_at?: string;
}

export type OrderStatus = 'pending' | 'cooking' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'COD' | 'UPI' | 'Card' | 'Razorpay';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface OrderItem {
  dish_id: string;
  dish_name: string;
  quantity: number;
  price: number;
  is_veg?: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  landmark?: string;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  upi_transaction_id?: string;
  status: OrderStatus;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  kitchen_notes?: string;
  campus?: string;
  rating?: number;
  created_at: string;
  updated_at?: string;
  // Order ERP Security & Geolocation metadata
  customer_ip?: string;
  order_latitude?: number;
  order_longitude?: number;
  gps_accuracy?: number;
  gps_allowed?: boolean;
  distance_km?: number;
  device_type?: string;
  os_name?: string;
  browser_name?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  google_maps_url?: string;
  fraud_risk_level?: 'low' | 'medium' | 'high';
  fraud_risk_reasons?: string[];
}

export interface InventoryItem {
  id: string;
  item_name: string;
  unit: string; // kg, pcs, L
  quantity: number;
  low_alert_threshold: number;
  updated_at?: string;
}

export interface RecipeDeduction {
  id: string;
  dish_id: string;
  dish_name: string;
  ingredient_id: string;
  ingredient_name: string;
  qty_per_serving: number;
  unit: string;
}

export interface Feedback {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email?: string;
  food_rating: number; // 1-5
  taste_rating: number; // 1-5
  packing_rating: number; // 1-5
  delivery_rating: number; // 1-5
  driver_name?: string;
  comment?: string;
  created_at: string;
}

export interface DriverStats {
  driver_id: string;
  driver_name: string;
  phone: string;
  total_deliveries: number;
  completed_today: number;
  average_rating: number;
  on_time_percentage: number;
  is_online: boolean;
}

export interface KitchenSettings {
  id?: string;
  kitchen_name: string;
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  min_order_value: number;
  free_delivery_above: number;
  delivery_charge: number;
  tax_percent: number;
  estimated_delivery_mins: number;
  restaurant_upi_id: string;
  whatsapp_number: string;
  closed_banner_message: string;
  lat?: number;
  lng?: number;
  max_cod_radius_km?: number;
}

export interface PromotionalBanner {
  id: string;
  title: string;
  poster_url: string;
  link_url?: string;
  is_active: boolean;
  created_at?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}
