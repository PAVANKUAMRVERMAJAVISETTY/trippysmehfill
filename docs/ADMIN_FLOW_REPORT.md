# Admin Flow Report

| Step | Status | Evidence |
|---|---|---|
| Admin login | 🔴 | Signup/login blocked by `42501` on `profiles` |
| Dashboard | ⚠️ | `DashboardView` builds; not rendered |
| Receive new order | ❓ | Realtime publication unverified |
| View customer | ⚠️ | `CustomersView`; not exercised |
| **Verify payment** | 🔴 | **0007 not applied** — `payment_verified_at` does not exist |
| **Reject payment** | 🔴 | `'rejected'` violates the live CHECK constraint |
| Accept order | ⚠️ | Only `LiveOrdersView` writes `'cooking'`, tied to driver assignment |
| Assign driver | ⚠️ | `assignDriver`; not exercised |
| Kitchen notified | ⚠️ | Kitchen sees all orders; no explicit notify step |
| Track driver | ⚠️ | `DriverStatsView` + map links |
| Complete order | ⚠️ | Driver marks delivered |

## Payment Verification tab — code review

Built this cycle. Reviewed, not run.

| Property | Verdict |
|---|---|
| UPI orders only | ✅ COD excluded — nothing to verify |
| Columns | ✅ Order ID · Customer · Phone · Amount · Method · Txn ID · Created · Status |
| Created Time absolute | ✅ Matches a bank statement, unlike "5 minutes ago" |
| Search | ✅ order number, name, phone, reference, amount |
| Filters | ✅ Pending / Verified / Rejected / All UPI |
| Pagination | ✅ 10/page, **index clamped** so a realtime update cannot blank the page |
| Reject needs two steps | ✅ Reason panel then confirm — destructive from the customer's side |
| Buttons disabled in flight | ✅ Prevents double-fire |
| Concurrent verify | ✅ `.eq('payment_status','pending')` → second admin told "already reviewed" |
| Mobile | ✅ table at `lg`+, cards below, ≥48 px targets — **layout not seen** |

## Gaps

| | Gap |
|---|---|
| AF-1 | **No "Accept Order" control.** The admin journey asks for one; only `'cooking'` via driver assignment exists. |
| AF-2 | Admin login untestable until `0008` is applied |
| AF-3 | **At least one admin must exist** — `SELECT count(*) FROM profiles WHERE role='admin'`. Unverified: `profiles` is unreadable. |
