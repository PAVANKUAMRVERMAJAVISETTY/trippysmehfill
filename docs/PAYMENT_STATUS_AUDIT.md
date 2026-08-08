# Payment Status Audit

| | |
|---|---|
| Scope | Every `payment_status` reference and value in the repository |
| Outcome | ✅ One canonical vocabulary, enforced by the database, with backward-compatible reads |
| Code changed | 2 files + 1 test file |

---

## 1 · Where every value is used

### The headline finding

**`'paid'` and `'pending_verification'` do not exist as payment values anywhere
in this branch.**

```
$ grep -rn "'paid'\|'pending_verification'" src/ *.test.ts supabase/
  src/types/index.ts:10                 account_status?: 'active' | 'pending_verification' | ...
  src/components/admin/CustomersView.tsx:43,169   account_status
  supabase/migrations/0001_core_schema.sql:23,77  account_status
  supabase/phase2_schema.sql:15                   account_status
```

Every hit is **`account_status`** — a different column, describing whether a
*user* is verified, not whether a *payment* is. There is no collision inside this
repository. The vocabulary conflict is with a parallel build that has not been
merged here (`upstream/main` commit `298c6a9`), which settles UPI payments as
`'paid'` and holds them at `'pending_verification'`.

### Values in use

| Value | Read | Written | Where |
|---|---|---|---|
| `pending` | ✅ | ✅ | `CheckoutView` (order draft), `updatePaymentStatus`, WHERE guards in `verifyPayment`/`rejectPayment`, `paymentLabel`, `paymentNote`, `paymentTone`, `awaitsPaymentVerification`, `buildTrackingTimeline`, admin filter + `isSettled`, pending-count badges |
| `completed` | ✅ | ✅ | `verifyPayment` (only writer), `paymentLabel`, `paymentTone`, `paymentToastCopy`, timeline `settled`, `initialData` seeds |
| `rejected` | ✅ | ✅ | `rejectPayment` (only writer), `paymentLabel`, `paymentNote`, `paymentTone`, `paymentToastCopy`, timeline `refused`, `MyOrdersView` banner, `OrderTrackerModal` |
| `failed` | ✅ | ❌ | Read-only — `paymentLabel`, `paymentNote`, `paymentTone`, `paymentToastCopy`, timeline `refused`, `OrderTrackerModal`. **Nothing in this codebase writes it.** |
| `refunded` | ✅ | ❌ | Read-only — `paymentLabel`, `paymentTone`, `paymentToastCopy`. **Nothing writes it.** |
| `paid` | ❌ | ❌ | Absent. Now handled on read via normalisation. |
| `pending_verification` | ❌ | ❌ | Absent as a payment value. Now handled on read. |

### Full reference list

| File | Role |
|---|---|
| `src/types/index.ts` | `PaymentStatus` type definition |
| `src/lib/orderStatus.ts` | All presentation helpers + the new vocabulary module |
| `src/services/supabase/orders.ts` | Reads and writes; the only place values are persisted |
| `src/components/customer/CheckoutView.tsx` | Writes `'pending'` on the draft; reads for display |
| `src/components/customer/MyOrdersView.tsx` | Reads `'rejected'` for the banner |
| `src/components/customer/OrderTrackerModal.tsx` | Reads `'rejected'` / `'failed'` for tone |
| `src/components/customer/OrderProgressTimeline.tsx` | Reads via `buildTrackingTimeline` |
| `src/components/admin/PaymentVerificationView.tsx` | Reads for chip, filter, `isSettled` |
| `src/components/admin/KitchenView.tsx` | Reads via `paymentTone` / `paymentLabel` |
| `src/App.tsx` | Reads for toasts, tracker re-sync, pending badge |
| `src/lib/initialData.ts` | Seeds `'completed'` on 4 example orders |

---

## 2 · Which values are written

Only three, from exactly four call sites:

| Value | Written by | Guard |
|---|---|---|
| `pending` | `CheckoutView` order draft | — |
| `pending` | `updatePaymentStatus` ("I've Paid") | A claim, never a settlement |
| `completed` | `ordersService.verifyPayment` | `.eq('payment_status','pending')` + DB trigger restricts to team members |
| `rejected` | `ordersService.rejectPayment` | Same |

**No customer-facing path can write `'completed'` or `'rejected'`.** Enforced
three times over: application, RLS, and migration 0007's `BEFORE UPDATE` trigger.

---

## 3 · Which values are only read

`failed` and `refunded` are **read-only**. Every helper renders them, but nothing
in this codebase writes them. They exist because the database permits them and a
gateway, an admin, or a manual correction could set them — so the UI must not
break when it meets one.

That is deliberate, not an oversight: the application is tolerant of states it
does not itself produce.

---

## 4 · Recommended canonical vocabulary

```
pending  ·  completed  ·  rejected  ·  failed  ·  refunded
```

**This is not a preference. It is what the database accepts.**

```sql
-- supabase/migrations/0007_payment_verification.sql:60
payment_status IN ('pending', 'completed', 'failed', 'refunded', 'rejected')

-- supabase/migrations/0001_core_schema.sql:201  (before 0007)
payment_status IN ('pending', 'completed', 'failed', 'refunded')
```

You directed that the production database is the source of truth. Applied here,
that settles the argument without appeal to taste: **writing `'paid'` or
`'pending_verification'` raises a check violation.** They are not alternative
spellings — they are values the column will refuse.

Worth flagging to your teammate: `'paid'` is rejected by the **current** live
constraint too, since 0001 never permitted it. His verification path may already
be failing in production for that reason.

### Meaning

| Value | Means | Set by |
|---|---|---|
| `pending` | No decision yet. COD not yet collected, or a UPI transfer awaiting review. | Order creation, "I've Paid" |
| `completed` | Money confirmed received. | Admin only |
| `rejected` | Reviewed and refused — never arrived, or did not match. | Admin only |
| `failed` | A gateway declined it. Distinct from `rejected`, which is a human decision. | External |
| `refunded` | Returned to the customer. | External |

---

## 5 · Backward compatibility on read

`normalizePaymentStatus()` in `src/lib/orderStatus.ts`, applied in `mapOrderRow`
so **every** row passes through it — `fetchOrders`, `fetchCustomerOrders`,
`fetchOrderById`, `createOrder`, `verifyPayment`, `rejectPayment`.

| Stored value | Reads as | Why |
|---|---|---|
| `paid` | `completed` | The parallel build's settled state |
| `pending_verification` | `pending` | Its awaiting-review state |
| `success`, `successful`, `complete` | `completed` | Gateway and hand-edit variants |
| `declined` | `rejected` | |
| `cancelled` | `failed` | |
| `refund` | `refunded` | |
| anything unrecognised | `pending` | **Safe direction** |

Case-insensitive and whitespace-trimmed, so `"  PAID  "` resolves correctly.

**Unknown values fall back to `pending`, never `completed`.** That direction is
chosen deliberately: an unreadable status shows as awaiting review, so a human
looks at it. Defaulting to `completed` would let a corrupt or unexpected value
silently mark an order paid — the one outcome with real money attached.

The opposite risk is covered too: a payment the restaurant *did* confirm must
never display as unpaid. That is why `paid` maps to `completed` rather than
falling through, and there is a test asserting exactly that.

---

## 6 · Canonical values only, going forward

- `PAYMENT_STATUS_VALUES` is the single exported list
- `PaymentStatus` in `src/types/index.ts` already contained exactly these five
- All four write sites use canonical literals, type-checked against `PaymentStatus`
- Non-canonical values cannot be written: TypeScript rejects them at compile
  time, and the database rejects them at runtime

---

## Changes made

| File | Change |
|---|---|
| `src/lib/orderStatus.ts` | Added `PAYMENT_STATUS_VALUES`, `LEGACY_PAYMENT_STATUS`, `normalizePaymentStatus()` |
| `src/services/supabase/orders.ts` | `mapOrderRow` normalises `payment_status` on read |
| `orderStatus.test.ts` | +7 tests |

**No UI file changed.** Customer, admin and kitchen screens all read through
`paymentLabel()` / `paymentTone()` / `buildTrackingTimeline()`, which already
consume canonical values — so normalising at the service boundary corrected every
screen at once. That is the payoff from having one presentation layer.

**No migration changed**, as instructed.

### Tests added

- the canonical vocabulary is exactly what the database will accept
- canonical values pass through unchanged
- another client's vocabulary is translated, not dropped
- **a verified payment never reads as unpaid**
- casing and whitespace do not defeat normalisation
- **an unrecognised value falls back to pending, never to completed**
- normalised output is always renderable by the presentation helpers

```
tsc --noEmit    clean
node:test       144 / 144   (was 137)
```

---

## Remaining risk

The vocabulary is now canonical **in this repository**. It is not agreed **between
the two builds**. Your teammate's branch still writes `'paid'` and
`'pending_verification'`, and if his code merges unchanged those writes will fail
against the constraint.

This audit makes that failure survivable rather than silent: rows he has already
written read correctly here. It does not remove the need for the conversation.
