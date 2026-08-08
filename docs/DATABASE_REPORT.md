# Database Report

Live project `iptjevfvuwrdbqzgrzxg`, probed **read-only** over PostgREST. No writes.

## Tables

| Table | Status |
|---|---|
| `orders` | ✅ present, readable, **0 rows** |
| `profiles` | ⚠️ present but **unreadable** — `42501 permission denied` |
| `menu_items` | ✅ present, 4 dishes |
| `inventory` | ✅ present, empty |
| `feedback` | ✅ present |
| `payments` | ✅ present |
| `order_items` | ✅ **correctly absent** — code no longer expects it |
| `notifications`, `banners`, `gallery_items`, `categories` | ❌ absent |

⚠️ `notifications.ts`, `banners.ts`, `gallery.ts` services exist in the codebase
but their tables do not. **Not exercised** — the UI paths that would call them
were not reachable for testing. Flagged, not fixed.

## Which schema is live

| Marker | Belongs to | Live |
|---|---|---|
| `orders.customer_ip`, `fraud_risk_level`, `gps_accuracy`, `campus` | `0001_core_schema` | ✅ present |
| `orders.items` (jsonb) | `0001_core_schema` | ✅ present |
| `orders.is_deleted`, `order_items` table | `phase2_schema` | ❌ absent |
| `orders.utr_number`, `payment_time` | teammate's `0008_fix_orders_schema` | ✅ present |

**The live database is the numbered chain (0001–0005) plus the teammate's
`0008_fix_orders_schema`.** Earlier reports claimed it was `phase2_schema.sql`;
that was wrong and is corrected here. The application was refactored to match
(see [SCHEMA_ALIGNMENT_REPORT.md](SCHEMA_ALIGNMENT_REPORT.md)).

## Migration status

| Migration | Marker | Applied |
|---|---|---|
| 0001–0005 | `customer_ip`, `campus` | ✅ approximately |
| 0006 | policy | ⚠️ unknown |
| **0007** `payment_verification` | `orders.payment_verified_at` | 🔴 **NO** |
| **0008** `fix_profiles_rls` | grants on `profiles` | 🔴 **NO** |
| **0009** `profiles_wallet_referral` | `profiles.wallet_balance` | ⚠️ unknown |
| teammate's `0008_fix_orders_schema` | `utr_number` | ✅ yes |

Evidence:
```
GET /orders?select=payment_verified_at
  400 {"code":"42703","message":"column orders.payment_verified_at does not exist"}
```

**The teammate's migrations are applied. Ours are not.**

## Migrations verified locally

`./supabase/verify/run_migration_checks.sh` on **PostgreSQL 17.10**:

```
== A.  enum schema      apply · pre-existing row untouched · re-apply
== A2. 27 behavioural assertions      all PASS
== A3. rollback         enum restored, audit columns dropped
== A4. re-apply         forward migration repeatable
== B.  CHECK schema     apply · re-apply · widen · roll back · narrow
== C.  0008 + 0009      both schemas · idempotent
                        handle_new_user_signup() present
                        payment verification trigger still installed
RESULT: all migration checks passed
```

## Columns verified present on live `orders`

Every column `createOrder` writes was probed individually: `order_number`,
`customer_id`, `customer_name`, `customer_phone`, `delivery_address`, `landmark`,
`campus`, `items`, `subtotal`, `tax_amount`, `delivery_fee`, `total_amount`,
`payment_method`, `payment_status`, `upi_transaction_id`, `status`, `driver_id`,
`driver_name`, `driver_phone`, `kitchen_notes`. **All present.**

## Not verified — PostgREST does not expose these

| | Why |
|---|---|
| Triggers, incl. `on_auth_user_created` | `pg_trigger` not exposed |
| RLS policy contents | `pg_policies` not exposed |
| Foreign keys, indexes | `pg_catalog` not exposed |
| `payment_status` CHECK contents | `pg_constraint` not exposed |
| Realtime publication | `pg_publication_tables` not exposed |
| RPCs `email_exists`, `lookup_login_email` | Would require calling them with real arguments |

**These require the SQL editor.** Queries are in
[DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md). I did not guess at any of them.

## Data integrity

- ✅ No code path deletes data. Menu "delete" sets `is_available = false`;
  inventory delete refuses rather than hard-deleting.
- ✅ `orders.items` is the single source of truth for line items; no duplicate
  store was introduced.
- ✅ `createOrder` is one INSERT — an order row can no longer exist without its
  items.
- ⚠️ Order numbers can collide under concurrent checkout (`nextOrderNumber`
  reads the client's list). Needs a DB sequence. **Not fixed** — schema change.
