# Payment Report

## Cash on Delivery

| | Status |
|---|---|
| Selectable at checkout | ✅ code-verified |
| Recommended, not preselected | ✅ deliberate — if preselected, the required *"Please select a payment method."* validation could never appear |
| Confirms immediately | ✅ `setStep('confirmed')` |
| Reads *"Pay on delivery"* | ✅ 23 tests |
| No payment steps in the timeline | ✅ asserted — showing a cash order "Payment Pending" would invent a wait |
| Excluded from the admin queue | ✅ nothing to verify |

## UPI

| | Status |
|---|---|
| **Order saved before money is requested** | ✅ **verified in source** — `setStep` is inside the `try`, after `await createOrder` |
| QR code | ✅ requested at 400×400, displayed ≤260 px |
| Amount formatting | ✅ `.toFixed(2)` — `250.50`, not `250.5`, which some UPI apps mis-parse |
| Order number in the note | ✅ `tn=` carries it — this is how an admin matches a transfer |
| UPI ID | ✅ from `kitchen_settings.restaurant_upi_id` (verified present live) |
| Copy UPI ID | ✅ with a fallback message naming the ID if the clipboard is blocked |
| `upi://` intent | ⚠️ **not verified** — needs a real phone |
| Transaction ID capture | ✅ "I've Paid" records it |
| **"I've Paid" never settles** | ✅ writes `'pending'`; a claim, not a settlement |

## Payment verification

| | Status |
|---|---|
| Only an admin can verify | ✅ enforced three ways |
| `verifyPayment` → `completed` | 🔴 **cannot run** — 0007 not applied |
| `rejectPayment` → `rejected` | 🔴 **cannot run** — violates the live CHECK constraint |
| Audit trail stamped server-side | ✅ trigger uses `auth.uid()`; client never sends it |
| Concurrent verify safe | ✅ WHERE-clause guard → "already reviewed" |
| Reject leaves `status` alone | ✅ deliberate — a rejected payment is not a cancelled order |

### The rule, enforced three times

| Layer | Guarantee |
|---|---|
| DB trigger | Non-team member moving `payment_status` off `'pending'` → `check_violation` |
| RLS | UPDATE on `orders` restricted to team members |
| Application | `'completed'`/`'rejected'` written only by the two admin methods |

Verified on PostgreSQL 17: *customer cannot mark their own payment completed* ·
*cannot set it to rejected* · *cannot forge the audit trail* · *admin can verify* ·
*`payment_verified_by` stamped server-side*.

⚠️ **In SQL only.** TC-11 exercises this through the running app and has not run.

## Vocabulary

Canonical: `pending · completed · rejected · failed · refunded` — exactly what
migration 0007 constrains the column to.

Backward-compatible reads via `normalizePaymentStatus()`: `paid → completed`,
`pending_verification → pending`, plus gateway variants. **Unknown values fall
back to `pending`, never `completed`** — an unreadable status should invite a
human, not silently mark an order paid.

⚠️ **A parallel build writes `'paid'` and `'pending_verification'`.** Both are
refused by the constraint. Reads here are safe; his writes are not. Unresolved.

## Realtime payment updates

Customer sees the outcome in three places — confirmation screen, tracker, My
Orders — plus a toast. 🔴 **Unverified**: publication status unknown, and 0007
is not applied so no payment can be settled.

## Not verified

`upi://` intent on a device · clipboard on iOS Safari · Web Share · a real
transfer · admin verify/reject end to end · realtime propagation · PDF receipt.
