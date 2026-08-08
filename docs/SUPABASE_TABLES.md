# Supabase Tables & Schema Reference

Complete schema specification for **Trippy's Mehfill** PostgreSQL database in Supabase.

---

## Tables Matrix

| Table Name | Description | Key Columns | Soft Delete |
|---|---|---|---|
| `profiles` | Extended user account profile | `id` (FK auth.users), `full_name`, `email`, `phone`, `role`, `is_approved`, `is_active`, `hostel_address` | No |
| `categories` | Food menu categories | `id`, `name`, `display_order`, `is_active` | No |
| `menu_items` | Restaurant dishes and items | `id`, `name`, `price`, `category`, `category_id`, `image_url`, `is_veg`, `is_available`, `is_todays_special` | Yes (`is_deleted`) |
| `orders` | Customer order transactions | `id`, `order_number`, `customer_id`, `subtotal`, `tax_amount`, `delivery_fee`, `total_amount`, `payment_method`, `payment_status`, `status`, `driver_id` | Yes (`is_deleted`) |
| `order_items` | Individual line items in an order | `id`, `order_id` (FK), `dish_id` (FK), `dish_name`, `quantity`, `price`, `is_veg` | No (Cascade Delete) |
| `inventory` | Raw material stock levels | `id`, `item_name`, `unit`, `quantity`, `low_alert_threshold` | Yes (`is_deleted`) |
| `inventory_transactions` | Audit log of stock changes | `id`, `inventory_id` (FK), `change_qty`, `reason`, `created_by` | No |
| `feedback` | Customer ratings and reviews | `id`, `order_id`, `customer_id`, `food_rating`, `taste_rating`, `packing_rating`, `delivery_rating`, `comment` | No |
| `banners` | Promotional header banners | `id`, `title`, `poster_url`, `link_url`, `is_active`, `display_order` | No |
| `gallery_items` | Food showcase images | `id`, `title`, `caption`, `image_url`, `display_order` | No |
| `promo_codes` | Discount coupons | `id`, `code`, `discount_percent`, `discount_amount`, `min_order_value`, `is_active`, `valid_until` | No |
| `payments` | Gateway and UPI transactions | `id`, `order_id` (FK), `payment_method`, `payment_status`, `amount`, `upi_transaction_id` | No |
| `delivery_locations` | Serviceable campus zones | `id`, `name`, `lat`, `lng`, `max_cod_radius_km`, `is_active` | No |
| `kitchen_settings` | Single-row operational settings | `id`, `kitchen_name`, `is_open`, `opening_time`, `closing_time`, `min_order_value`, `free_delivery_above`, `delivery_charge`, `tax_percent`, `restaurant_upi_id`, `whatsapp_number` | No |
| `notifications` | In-app user notifications | `id`, `user_id` (FK), `title`, `message`, `type`, `is_read` | No |
| `audit_logs` | Security change history | `id`, `user_id` (FK), `action`, `entity_type`, `entity_id`, `details` | No |
| `activity_logs` | System activity tracking | `id`, `user_id` (FK), `activity` | No |

---

## Relationships & Foreign Keys

- `profiles.id` $\rightarrow$ `auth.users.id` (ON DELETE CASCADE)
- `orders.customer_id` $\rightarrow$ `profiles.id` (ON DELETE SET NULL)
- `orders.driver_id` $\rightarrow$ `profiles.id` (ON DELETE SET NULL)
- `order_items.order_id` $\rightarrow$ `orders.id` (ON DELETE CASCADE)
- `order_items.dish_id` $\rightarrow$ `menu_items.id` (ON DELETE SET NULL)
- `inventory_transactions.inventory_id` $\rightarrow$ `inventory.id` (ON DELETE CASCADE)
- `payments.order_id` $\rightarrow$ `orders.id` (ON DELETE CASCADE)
- `notifications.user_id` $\rightarrow$ `profiles.id` (ON DELETE CASCADE)
