# Driver Flow Report

## The module EXISTS — it does not need building

`src/components/driver/DriverView.tsx`, 134 lines, routed at
`activeSection === 'driver'`, guarded by `RequireRole roles={['driver','admin']}`.

The brief said *"If Driver module does not exist, state clearly. If missing,
build a production-ready Driver module."* **It exists. I did not build a
replacement**, because replacing a working module during a feature freeze would
be the wrong call.

## Requested journey vs. what exists

| Step | Status |
|---|---|
| Driver login | 🔴 Blocked by the `profiles` grant, like every other role |
| Assigned order appears | ✅ Filters `out_for_delivery`, `assigned`, or orders matching the driver's name |
| **Accept delivery** | ❌ **No Accept button.** Orders appear already assigned. |
| Navigate | ⚠️ *Start GPS / Stop GPS* toggle — sets local state only |
| **Picked up** | ❌ **No such action** |
| **Out for delivery** | ❌ Driver cannot set this — it is set upstream by Kitchen's "Ready for Dispatch" |
| Delivered | ✅ *"Mark Delivered"* → `onUpdateOrderStatus(order.id, 'delivered')` |
| Customer notified | ✅ Toast fires via the status-change effect in `App.tsx` |

## What it actually does

**Two buttons per order:**
1. **Start / Stop GPS** — toggles `navigatingOrderId`; local state only
2. **Mark Delivered** — the one status write the driver makes

Plus an assigned-order list and a completed-order list, both filtered on
`driver_name === user.full_name`.

## Findings

| | Severity | Finding |
|---|---|---|
| DF-1 | 🟠 Medium | **Driver matching is by `full_name`, not `driver_id`.** `o.driver_name === user?.full_name` — two drivers sharing a name see each other's orders, and a renamed profile loses its history. `driver_id` exists on `orders` and is the correct key. **Not fixed:** it is a behavioural change to a module outside this cycle's scope, and it needs a data check first (existing rows may have `driver_name` set and `driver_id` null). |
| DF-2 | 🟡 Low | *"Estimated distance: 1.2 km • Time: 5 mins to Campus Hostel"* is **hardcoded**, shown for every order regardless of destination. |
| DF-3 | 🟡 Low | "Start GPS" does not start anything — no geolocation call, no tracking. Label overpromises. |
| DF-4 | 🟡 Low | Three journey steps (Accept, Picked up, Out for delivery) have no control. |

DF-2 and DF-3 are cosmetic but dishonest to a user — the app claims capability it
does not have. Worth a cycle.

## Not verified

Driver login · order assignment end to end · GPS toggle behaviour · Mark
Delivered against a real order · customer notification arriving · mobile layout.
No orders exist and signup is broken, so **no driver journey was executed.**
