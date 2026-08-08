# Phase 3 — Customer Payments & Admin Payment Verification

Kitchen, Reports, Analytics and the Driver module were not modified.

```
$ git status --porcelain src/components/admin/KitchenView.tsx \
    src/components/admin/DashboardView.tsx src/components/admin/DriverStatsView.tsx \
    src/components/admin/OrderHistoryView.tsx src/components/driver/
(no output)
```

---

## The one rule this phase exists to enforce

**Nothing marks a payment completed except a person deciding it is.**

That is now true in three independent places, so no single mistake can undo it:

| Layer | Guarantee |
|---|---|
| Database trigger (0007) | A non-team member setting `payment_status` to anything but `'pending'` raises `check_violation`. Also refuses client-supplied writes to the audit columns. |
| RLS | UPDATE on `orders` is restricted to team members and, narrowly, the owning customer. |
| Application | The only calls that write `'completed'` or `'rejected'` are `verifyPayment` / `rejectPayment`, reachable only from the admin screen. |

`payment_verified_at` and `payment_verified_by` are **not sent by the client at
all**. The trigger stamps them from `auth.uid()`, so the audit trail records the
actor the database saw rather than one the browser claimed to be.

---

## Step 1–2 · Database

Covered in full in **[DATABASE_MIGRATION_0007.md](DATABASE_MIGRATION_0007.md)**,
including the verification transcript. The short version:

- `'rejected'` is now a storable `payment_status`; reversible via a down migration.
- Three audit columns added, all nullable, no backfill.
- `order_status` widened to the vocabulary the app already speaks.
- `public.orders` published to Realtime — **it was not, on your deployment.**
- Verified on a real PostgreSQL 17 against **both** schemas in the repo: apply,
  re-apply, behaviour, roll back, re-apply. 26 assertions, all passing.

**One finding worth repeating here:** the repository contains two incompatible
schemas, and your deployed database uses `phase2_schema.sql` (enum types, uuid
ids, `order_items` table) — not the numbered `migrations/` chain. A migration
written against the numbered chain would have succeeded silently and changed
nothing. 0007 detects which it is running against.

**Migration 0007 has not been applied to your Supabase project.** Until it is,
Verify and Reject will fail — Verify with an RLS/policy error, Reject with a
check violation on the missing enum value.

---

## Step 3 · Orders service

`src/services/supabase/orders.ts`

```ts
verifyPayment(orderId): Promise<Order>
rejectPayment(orderId, reason?): Promise<Order>
```

Both:

- guard on `payment_status = 'pending'` **in the WHERE clause**, not just in the
  UI. Between an admin seeing the row and pressing the button, a colleague may
  have already settled it. Zero rows back is reported, not swallowed:
  *"it may already have been reviewed by someone else."*
- return the row the database actually stored, so the caller never has to guess
  what was written.
- omit the audit columns entirely, for the reason above.

`verifyPayment` also clears any stale `payment_rejection_reason`, so an order
rejected and then verified does not keep explaining why it was refused.

`rejectPayment` **leaves `status` alone.** A rejected payment is not a cancelled
order — the customer may still pay another way, and cancelling is a separate
decision an admin makes deliberately.

Authorisation is not checked in the client. A role check there would be a
convenience, not a control; the database is where it has to hold.

While extracting this, the row→`Order` mapping — which was **written out three
times** — was consolidated into one `mapOrderRow`. The Phase 3 columns would
otherwise have been added to one copy and gone silently missing from the others.

---

## Step 4 · Payment Verification view

`src/components/admin/PaymentVerificationView.tsx`

Lists **UPI orders only**. A cash order has no transfer to check, so including it
would be noise for whoever is working the queue.

Defaults to **Pending Verification**; filters for Verified, Rejected, and All UPI
Orders are there because a rejection is a decision people need to be able to look
back at.

| Column | Note |
|---|---|
| Order ID | monospace |
| Customer | |
| Phone | `tel:` link |
| Amount | right-aligned, bold |
| Payment Method | ⚡ UPI |
| Transaction ID | click to copy; *"Not provided"* when absent |
| Created Time | **absolute** — "5 minutes ago" is useless against a bank statement |
| Payment Status | colour-coded chip |

**Verify Payment** settles immediately. **Reject Payment** opens an inline panel
with an optional reason, a line stating what the customer will be told, and a
Cancel. Rejecting is destructive from the customer's point of view, so it takes
two deliberate taps rather than one.

Search covers order number, customer name, phone, transaction reference and
amount. Pagination is 10 per page, and the page index is **clamped** rather than
trusted — a realtime update can shrink the list under someone sitting on the last
page, and they should not be dropped onto a blank screen.

Both buttons disable while their request is in flight, and again once the order
is settled, so a double-tap cannot fire twice.

**Layout:** table at `lg`+, cards below. Every button is `min-h-[48px]`; on a
phone the two actions stack full-width.

---

## Step 5 · Admin navigation

One tab added after Live Orders — **Payment Verification**, with a pulsing count
badge for pending reviews, matching the existing Pending Registrations badge.
The other twelve tabs are untouched.

---

## Step 6 · Customer sees the result, live

An admin verifying a payment reaches the customer through the existing
`postgres_changes` subscription on `orders`. Three things had to change for it to
be *visible*:

**1. The tracker was only watching `status`.**

```ts
// before — a verification while the tracker was open changed nothing on screen
if (fresh && fresh.status !== activeTrackingOrder.status) setActiveTrackingOrder(fresh);
```

It now also compares `payment_status`, `payment_rejection_reason` and
`driver_name`. Field-by-field rather than by reference, because `orders` is
rebuilt on every refetch and an identity check would reset state on each poll.

**2. The confirmation screen rendered a frozen snapshot.**

`placedOrder` is what the insert returned and never changes. A customer sitting
on that screen while an admin verifies the transfer would have watched nothing
happen. It now reads the live row out of `existingOrders`, falling back to the
snapshot before the subscription has delivered anything.

**3. `orders` was not published to Realtime** on the deployed schema — see
Step 1–2. Without that fix none of the above would have fired at all.

Where the customer sees payment state:

| Screen | Shows |
|---|---|
| Order confirmation | Payment Status chip, tone-coloured, live |
| Order tracker | Order Status · Payment Status · Estimated Delivery · Timeline |
| My Orders | Payment label, tone-coloured, plus a rejection banner |

---

## Step 7 · Order tracking timeline

`buildTrackingTimeline()` in `src/lib/orderStatus.ts` — a pure function, so the
sequence is decided in one testable place rather than in JSX.
`OrderProgressTimeline` just draws what it is handed.

**UPI**

```
Order Placed → Payment Pending → Payment Confirmed → Preparing → Out for Delivery → Delivered
```

**Cash on delivery**

```
Order Placed → Preparing → Out for Delivery → Delivered
```

The payment steps appear only for UPI. Showing a cash order "Payment Pending"
would invent a wait that does not exist.

**A rejected payment marks its step `failed` and renames it to "Payment
Rejected"** — it does not truncate the timeline. The order still exists and the
kitchen steps are still reachable once the customer sorts the payment out;
cutting it short there would misrepresent what happened.

`'accepted'` is a real stored state but not a step of its own, so it renders as
Preparing/current with the blurb *"The kitchen has accepted your order."*

The tracker header now carries the four facts as a grid above the timeline —
Order Status, Payment Status, Estimated Delivery — because someone opening it
wants to know where things stand without reading a diagram.

---

## Step 8 · Notifications

A second toast effect in `App.tsx`, deliberately separate from the status one:
the two move independently, and an admin can verify a transfer long before the
kitchen accepts.

| Payment status | Toast |
|---|---|
| `completed` | **Payment received and verified.** — Your order is confirmed. |
| `rejected` | **Payment rejected.** — Please contact the restaurant. |
| `pending` | *(nothing — no decision has been made, so there is no news)* |

Both use the same seed-on-first-pass guard as the status toasts. Without it,
opening the app would fire "Payment received and verified" for every order ever
paid for, because this reads a list rather than an event stream.

Copy, everywhere the customer can see it:

| State | Label | Note beneath |
|---|---|---|
| UPI, unsettled | Pending Verification | We are checking your transfer. |
| UPI, verified | **Payment Confirmed** | — |
| UPI, rejected | **Payment Rejected** | **Please contact the restaurant.** |
| COD, unsettled | Pay on delivery | — |
| COD, collected | Paid | — |

Cash handed over at the door is *"Paid"*; a verified transfer is *"Payment
Confirmed"*, which is the wording the customer was promised while waiting.

---

## Step 9 · Testing

```
tsc --noEmit          clean
node:test             128/128 pass  (was 115; +13 for Phase 3)
npm run build         succeeds in 8.96s
migration harness     26/26 assertions, both schemas, incl. rollback
```

New tests in `orderStatus.test.ts`:

- a rejected payment says so and **never reads as paid** (asserted with a
  negative match on `/paid|confirmed/i`, so a future copy change cannot quietly
  reintroduce it)
- a rejection tells the customer what to do next
- payment tone separates settled / waiting / refused
- only a settled payment raises a toast; `pending` returns `null`
- `awaitsPaymentVerification` is false for cash
- a UPI order shows the six steps in the specified order
- a cash order shows no payment steps at all
- payment steps advance only when an admin settles the transfer
- a rejected payment marks its step failed, renames it, and keeps the rest
- the timeline tracks the kitchen through the lifecycle
- an accepted order reads as the kitchen having started
- a cancelled order ends the timeline rather than pretending to progress
- **exhaustive:** every combination of 2 payment methods × 5 payment statuses ×
  9 order statuses produces steps with a state the renderer knows how to draw

The Phase 2.5 assertion `paymentLabel(UPI, completed) === 'Paid'` was updated to
`'Payment Confirmed'`, per this phase's specified copy.

### What still needs a real browser

There is no component or E2E harness in this project, so these were reasoned
about but not executed:

1. A verification arriving over the websocket while the tracker is open.
2. Two admins pressing Verify on the same order at the same moment — the
   `.eq('payment_status','pending')` guard should make the second one report
   *"already reviewed"*.
3. The admin table's horizontal scroll on a narrow laptop.
4. Toast behaviour when several orders settle in quick succession
   (`ToastContext` caps at 3 visible).
5. Copy-to-clipboard for the transaction reference on iOS Safari.

---

## Files

**Added**

```
supabase/migrations/0007_payment_verification.sql
supabase/migrations/0007_payment_verification_down.sql
supabase/verify/run_migration_checks.sh
supabase/verify/00_supabase_stub.sql
supabase/verify/verify_phase2.sql
src/components/admin/PaymentVerificationView.tsx
DATABASE_MIGRATION_0007.md
PHASE3_PAYMENT_VERIFICATION.md
```

**Modified**

```
src/types/index.ts                                 PaymentStatus + 'rejected', audit fields
src/lib/orderStatus.ts                             paymentNote/Tone/ToastCopy, buildTrackingTimeline
src/services/supabase/orders.ts                    verifyPayment, rejectPayment, mapOrderRow
src/components/admin/AdminHeaderNav.tsx            one tab + badge
src/App.tsx                                        handlers, payment toasts, tracker re-sync
src/components/customer/OrderProgressTimeline.tsx  payment-aware steps
src/components/customer/OrderTrackerModal.tsx      status/payment/ETA grid
src/components/customer/CheckoutView.tsx           live payment status on confirmation
src/components/customer/MyOrdersView.tsx           tone-coloured payment, rejection banner
orderStatus.test.ts                                +13 tests
```

---

## Outstanding

1. **Migration 0007 is not applied.** Nothing in Phase 3 works until it is.
2. **Realtime may be off for your project.** 0007 adds `orders` to the
   publication, but the Realtime service itself is a dashboard setting.
3. **The two schema files should be reconciled.** Every future migration has to
   be written twice until they are, as this one was.
4. **`initialOrders` still seeds four example orders** with invented customer
   names. They are display-only fallbacks, but they appear in the admin list
   before Supabase data arrives. Flagged since Phase 1 and still outstanding.
5. **Order numbers can collide under concurrency** — `nextOrderNumber` reads the
   client's current list. Two customers checking out simultaneously can both
   compute `#1008`. Needs a database sequence. Flagged in Phase 2.
6. **Nothing writes `'accepted'`, `'preparing'` or `'ready'` yet.** The database
   now accepts them and the timeline renders them, but the Kitchen screen —
   which is off-limits — still emits the legacy vocabulary. No regression; the
   mapping handles both. Worth picking up whenever Kitchen opens.
