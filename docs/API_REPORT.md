# API Report

No REST API of our own — the client talks to Supabase PostgREST, Auth and
Realtime directly. "Endpoints" below are service-layer methods.

## Live endpoint probes (read-only)

| Query | Before refactor | After |
|---|---|---|
| `fetchOrders` | `PGRST200` no FK to `order_items` | ✅ **HTTP 200** |
| `fetchCustomerOrders` | `PGRST200` | ✅ **HTTP 200** |
| `menu_items` fetch | `42703` `is_deleted` missing | ✅ **HTTP 200**, 4 dishes |
| `inventory` fetch | `42703` | ✅ **HTTP 200** |
| `profiles` fetch | `42501` permission denied | 🔴 **still failing** — needs 0008 |
| REST root | 401 (expected without a row-level grant) | — |
| Auth health | ✅ **HTTP 200** | — |

## `ordersService`

| Method | Status |
|---|---|
| `fetchOrders` | ✅ verified live |
| `fetchCustomerOrders` | ✅ verified live |
| `fetchOrderById` | ⚠️ not exercised — no rows exist |
| `createOrder` | ⚠️ **not exercised** — would write; every column verified present |
| `updatePaymentStatus` | ⚠️ not exercised — would write |
| `verifyPayment` | 🔴 **cannot work** — 0007 not applied |
| `rejectPayment` | 🔴 **cannot work** — `'rejected'` violates the CHECK constraint |
| `cancelOrder` | ⚠️ not exercised |
| `updateOrderStatus`, `assignDriver` | ⚠️ not exercised |

**No write was performed against production.** Writing test orders into a live
restaurant database is not something to do without being asked.

## Error handling — reviewed in source

| Behaviour | Verdict |
|---|---|
| Errors thrown, not swallowed | ✅ every method logs and rethrows |
| `createOrder` failure keeps the cart | ✅ *"Nothing has been charged."* |
| Concurrent verify | ✅ `.eq('payment_status','pending')` in the WHERE clause → second caller told "already reviewed" |
| Malformed jsonb | ✅ `parseOrderItems` returns `[]`; one bad row cannot break the list |
| Unknown `payment_status` | ✅ normalised to `pending` — never silently `completed` |

## Realtime

`postgres_changes` on `orders` and `inventory`. Channel keyed on `user?.id`
(events are RLS-filtered against the joining token) with unique topics per
subscription. Cleanup verified.

🔴 **Whether it delivers is unverified** — the publication is not readable over
PostgREST, and the Realtime service is a dashboard setting.

## Auth RPCs

`email_exists`, `lookup_login_email` — defined only in
`0004_anon_lookup_rpcs.sql`. **Presence on the live project unverified.** If
absent: phone/username sign-in and password reset both answer *"No account
found"*, while email sign-in keeps working — so it fails quietly.
