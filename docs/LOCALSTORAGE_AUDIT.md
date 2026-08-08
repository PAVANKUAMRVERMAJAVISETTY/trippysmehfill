# LocalStorage & Business Data Audit

This document lists every file, storage key, hardcoded fallback data, and required Supabase replacement for Phase 2 of **Trippy's Mehfill**.

---

## Summary of Findings

| Category | Occurrences | Location(s) | Target Supabase Replacement |
|---|---|---|---|
| Menu Items | `localStorage.getItem('trippys_menu')`<br>`localStorage.setItem('trippys_menu')` | [`src/App.tsx`](../src/App.tsx) | `public.menu_items` table via [`menuService`](../src/services/supabase/menu.ts) |
| Customer Orders | `localStorage.getItem('trippys_orders')`<br>`localStorage.setItem('trippys_orders')` | [`src/App.tsx`](../src/App.tsx) | `public.orders` & `public.order_items` via [`ordersService`](../src/services/supabase/orders.ts) |
| Pending Approvals | `localStorage.getItem('trippys_pending')`<br>`localStorage.setItem('trippys_pending')` | [`src/App.tsx`](../src/App.tsx) | `public.profiles` (`is_approved = false`) via [`AuthContext`](../src/context/AuthContext.tsx) & profiles query |
| Staff List | `localStorage.getItem('trippys_staff')`<br>`localStorage.setItem('trippys_staff')` | [`src/App.tsx`](../src/App.tsx) | `public.profiles` (`role = 'staff' OR role = 'driver'`) |
| Customers List | `localStorage.getItem('trippys_customers')`<br>`localStorage.setItem('trippys_customers')` | [`src/App.tsx`](../src/App.tsx) | `public.profiles` (`role = 'customer'`) |
| Food Gallery | `localStorage.getItem('trippys_gallery')`<br>`localStorage.setItem('trippys_gallery')` | [`src/App.tsx`](../src/App.tsx) | `public.gallery_items` table via [`galleryService`](../src/services/supabase/gallery.ts) |
| Kitchen Inventory | `localStorage.getItem('trippys_inventory')`<br>`localStorage.setItem('trippys_inventory')` | [`src/App.tsx`](../src/App.tsx) | `public.inventory` & `public.inventory_transactions` via [`inventoryService`](../src/services/supabase/inventory.ts) |
| Customer Feedback | `localStorage.getItem('trippys_feedback')`<br>`localStorage.setItem('trippys_feedback')` | [`src/App.tsx`](../src/App.tsx) | `public.feedback` table via [`feedbackService`](../src/services/supabase/feedback.ts) |
| Promo Banners | `localStorage.getItem('trippys_banners')`<br>`localStorage.setItem('trippys_banners')` | [`src/App.tsx`](../src/App.tsx) | `public.banners` table via [`bannersService`](../src/services/supabase/banners.ts) |
| Hardcoded Defaults | [`src/lib/initialData.ts`](../src/lib/initialData.ts) | Entire file | Migrate to Database Seed (`supabase/phase2_seed.sql`) & Supabase API calls |

---

## Detailed File-by-File Breakdown

### 1. `src/App.tsx`
- **Current State**: Uses 9 `localStorage.getItem(...)` calls inside `useState` initializers and 9 `useEffect` synchronization blocks that write back to `localStorage` on state changes.
- **Action Required**: Remove all `localStorage` state initializers and `useEffect` sync blocks. Replace with `useEffect` async data fetcher calling Supabase service methods. Subscribe to Supabase `postgres_changes` Realtime channels.

### 2. `src/lib/initialData.ts`
- **Current State**: Contains hardcoded arrays `initialMenuItems`, `initialOrders`, `initialInventory`, `initialKitchenSettings`, `initialBanners`, `initialGallery`.
- **Action Required**: Convert all initial seed arrays into [`supabase/phase2_seed.sql`](../supabase/legacy/phase2_seed.sql). Keep initial structure as fallback empty defaults or remove after Supabase setup.

### 3. `src/context/CartContext.tsx`
- **Current State**: Cart state managed in React state.
- **Action Required**: Maintain session cart in state, with optional sync to Supabase `cart_items` or active session memory. Ensure zero business data persistence in `localStorage`.

### 4. Auth Session Storage (`src/context/AuthContext.tsx` & `src/lib/supabase.ts`)
- **Current State**: Uses `@supabase/supabase-js` built-in auth session storage (`persistSession: true`).
- **Action Required**: **Do NOT modify or break auth session storage.** Standard Supabase SDK auth tokens are system credentials managed by Supabase JS client and will remain as-is.

---

## Replacement Strategy & Mapping Matrix

```
[Browser localStorage / Hardcoded Arrays]
               │
               ▼ (MIGRATED TO)
[Supabase PostgreSQL Database Tables]
  ├── public.menu_items
  ├── public.orders & order_items
  ├── public.inventory & inventory_transactions
  ├── public.feedback
  ├── public.banners
  ├── public.gallery_items
  ├── public.kitchen_settings
  ├── public.promo_codes
  └── public.profiles (roles: admin, staff, driver, customer)
               │
               ▼ (ACCESSED VIA)
[Type-Safe Supabase Services] (src/services/supabase/*)
  ├── menuService
  ├── ordersService
  ├── inventoryService
  ├── feedbackService
  ├── galleryService
  ├── bannersService
  ├── settingsService
  └── storageService
```
