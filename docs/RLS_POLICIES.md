# Row Level Security (RLS) Policies Reference

Security rules matrix for **Trippy's Mehfill** Supabase database.

---

## Security Helper Functions

To eliminate infinite recursion policy errors, security checks are encapsulated in `SECURITY DEFINER` SQL functions:

- `public.is_admin()`: Returns `true` if current `auth.uid()` has `role = 'admin'`.
- `public.is_staff_or_admin()`: Returns `true` if `role IN ('admin', 'staff')`.
- `public.is_driver_staff_or_admin()`: Returns `true` if `role IN ('admin', 'staff', 'driver')`.

---

## Role Access Matrix

| Table | Customer Policy | Staff / Driver Policy | Admin Policy |
|---|---|---|---|
| `profiles` | Read/Update own row (`id = auth.uid()`) | Read all customer & staff profiles | Full Read/Write/Delete |
| `menu_items` | Read active items (`is_deleted = false`) | Read active items | Full CRUD |
| `orders` | Read/Create own orders (`customer_id = auth.uid()`) | Read & Update status/driver for all orders | Full CRUD |
| `order_items` | Read/Create items for own orders | Read & Create items for all orders | Full CRUD |
| `inventory` | No Access | Read & Update stock levels | Full CRUD |
| `inventory_transactions` | No Access | Read & Insert stock logs | Full CRUD |
| `feedback` | Read all; Insert own feedback | Read all feedback | Full CRUD |
| `banners` | Read active banners | Read active banners | Full CRUD |
| `gallery_items` | Read all gallery items | Read all gallery items | Full CRUD |
| `kitchen_settings` | Read operational settings | Read operational settings | Full CRUD |
| `notifications` | Read/Update own notifications (`user_id = auth.uid()`) | Read own notifications | Full CRUD |

---

## Anti-Privilege Escalation Trigger

To block unauthorized users from changing their own `role`, `account_status`, or `is_approved` status via the client SDK, the `profiles_prevent_privilege_escalation` PostgreSQL trigger is active:

```sql
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only administrators can change profile roles.';
    END IF;
    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'Only administrators can change account status.';
    END IF;
    IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
      RAISE EXCEPTION 'Only administrators can approve accounts.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```
