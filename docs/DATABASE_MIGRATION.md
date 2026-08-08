# Phase 2: Database Migration Guide

This guide outlines how to execute the Supabase database migration scripts to transition **Trippy's Mehfill** into a fully database-driven restaurant ERP.

---

## Step 1: Open SQL Editor in Supabase

1. Navigate to your [Supabase Dashboard](https://app.supabase.com).
2. Select your project: **Trippy's Mehfill**.
3. Click on the **SQL Editor** tab in the left navigation sidebar.

---

## Step 2: Execute SQL Scripts in Sequence

Execute the following files located in the [`supabase/`](../supabase) directory:

### 1. [`supabase/phase2_schema.sql`](../supabase/legacy/phase2_schema.sql)
- **Purpose**: Creates PostgreSQL tables (`orders`, `order_items`, `menu_items`, `categories`, `inventory`, `inventory_transactions`, `feedback`, `banners`, `gallery_items`, `promo_codes`, `payments`, `delivery_locations`, `kitchen_settings`, `notifications`, `audit_logs`, `activity_logs`), foreign keys, enums, triggers, and performance indexes.
- **Action**: Copy the contents of `phase2_schema.sql`, paste into the SQL Editor, and click **Run**.

### 2. [`supabase/phase2_rls.sql`](../supabase/legacy/phase2_rls.sql)
- **Purpose**: Enables Row Level Security (RLS) across all tables and installs role-based access control policies (Customer, Staff, Driver, Admin) and anti-privilege escalation triggers.
- **Action**: Copy the contents of `phase2_rls.sql`, paste into the SQL Editor, and click **Run**.

### 3. [`supabase/phase2_seed.sql`](../supabase/legacy/phase2_seed.sql)
- **Purpose**: Populates initial food categories, default menu items, ERP kitchen settings, promotional banners, showcase gallery items, and starting inventory stock levels.
- **Action**: Copy the contents of `phase2_seed.sql`, paste into the SQL Editor, and click **Run**.

---

## Step 3: Verification Query

To verify successful creation and seating, execute this SQL query in Supabase:

```sql
SELECT 'menu_items' AS table_name, COUNT(*) FROM public.menu_items
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL
SELECT 'inventory', COUNT(*) FROM public.inventory
UNION ALL
SELECT 'kitchen_settings', COUNT(*) FROM public.kitchen_settings;
```

Expected result: Every table returns rows without syntax or permission errors.
