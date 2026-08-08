# Kitchen Flow Report

| Step | Status | Evidence |
|---|---|---|
| Kitchen login | 🔴 | Blocked by the `profiles` grant |
| Receive order | ⚠️ | Filters `pending`/`cooking`/`assigned`; realtime unverified |
| **View payment badge** | ✅ built | Implemented this cycle — see below |
| **Accept order** | ❌ **Does not exist** | No Accept button in `KitchenView` |
| **Preparing** | ❌ **Does not exist** | Nothing writes `'preparing'`; `'cooking'` comes from Live Orders |
| **Ready** | ❌ **Does not exist** | No Ready state in the UI |
| Dispatch | ✅ built | One button — *"Ready for Dispatch"* → `out_for_delivery` |

## Payment badge (built this cycle)

| Payment state | Badge |
|---|---|
| UPI verified | 🟢 Payment Confirmed |
| UPI unsettled | ⚠️ Pending Verification |
| UPI rejected | ⛔ **Payment Rejected — do not prepare** |
| COD | 🚚 Pay on delivery |

Wording and colour come from `paymentLabel()` / `paymentTone()` — the same
helpers the customer screens use, so the kitchen cannot be shown something
different from the customer.

Rejected is deliberately the loudest state: it is the one case where cooking the
food is actively wrong.

Also corrected the header, which claimed *"Paid orders arrive here
automatically."* Untrue — unconfirmed UPI orders arrive too, which is exactly
why the badge was needed.

🔴 **Not exercised live.** No orders exist, and `'rejected'` is not storable
until 0007 is applied. Realtime badge updates unverified.

## The gap in the requested flow

The requested journey is:

```
Receive order → View payment badge → Accept → Preparing → Ready → Dispatch
```

What exists:

```
Receive order → View payment badge → ──────────────────→ Dispatch
```

`KitchenView` has **exactly one action**. There is no Accept, no Preparing, no
Ready.

**Deliberately not built.** Kitchen was declared off-limits in every phase
instruction, and a feature freeze is in force. The database is already prepared —
migration 0007 widened `order_status` to accept `'accepted'`, `'preparing'` and
`'ready'`, and the customer timeline already renders all three. **This is UI
wiring, roughly half a day**, and it is the clearest next piece of work.
