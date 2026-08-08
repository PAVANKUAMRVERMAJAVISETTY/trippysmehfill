# Phase 2 — Customer Order Flow

Scope was the customer ordering experience only. The Admin Dashboard, Kitchen
screens, Analytics and Reports were not modified. Two Phase 2 requirements
reach into those screens; how that was resolved is in **Open items** at the end.

Implemented flow:

```
Home → Menu → Add Items → Cart → Login (if needed) → OTP → Checkout
     → Payment → Order Placed → Track Order
```

---

## 1. Checkout is now its own page

`activeSection` gained a `checkout` route, rendered by
`src/components/customer/CheckoutView.tsx`.

Previously `RightOrderPanel` was cart, address form, payment selector and order
submitter in one component — and it was mounted **twice at once** (the menu
sidebar and the cart drawer), so there were two independent code paths that
could create an order. That is now split:

| Component | Responsibility |
|---|---|
| `RightOrderPanel` | Cart contents, quantities, bill. One button: *Proceed to Checkout*. |
| `CheckoutView` | Contact details, address, payment, order creation, confirmation. |

There is now exactly one place an order can be created.

**Post-OTP routing.** `routeAfterAuth()` in `App.tsx` sends the customer to
`checkout` if the cart has items, and to `menu` if it does not. Signing in from
the cart resumes checkout rather than dropping them back on the menu to find it
again; signing up with an empty cart has no checkout to resume. No intermediate
success screen — Phase 1's 1.2s delay was already removed.

## 2. Payment options

Cash on Delivery and UPI QR Payment, as two radio-role buttons. Neither is
preselected: `paymentMethod` starts `null` and `validateCheckout` rejects a
missing choice, so the customer makes an actual decision rather than inheriting
a default.

`Card` and `Razorpay` exist in the `PaymentMethod` type but are not offered;
`CHECKOUT_PAYMENT_METHODS` is the allowlist and is covered by a test.

## 3. Cash on Delivery

Order is created immediately on submit. The confirmation shows:

- **Order Confirmed** heading
- **Order ID** — both the `#1005` display number and the database UUID
- **Estimated Delivery** — as a clock time (`30 mins (by 7:45 pm)`), from
  `settings.estimated_delivery_mins`
- **Track Order** button, opening live tracking

The ETA is deliberately a clock time rather than a countdown: "in 30 mins"
quietly becomes wrong once the customer leaves the screen and comes back.

## 4. UPI

Choosing UPI does **not** show the QR on the checkout page. The order is saved
first, then the QR appears on the confirmation screen. The reason is stated in
the UI: you should never pay for an order that failed to reach the kitchen.

The confirmation then shows QR code (encoding a proper `upi://pay` URI with the
order number in the note), the UPI ID with a copy button, the amount, a
transaction-reference field, and an **I've Paid** button. State moves
`Payment Pending` → `Payment Success`.

**What "Payment Success" means here.** Nothing in this codebase talks to a
payment gateway. Pressing *I've Paid* records the customer's reference against
the order; the stored `payment_status` stays `pending` until the kitchen
confirms the transfer landed. `ordersService.updatePaymentStatus` carries a
comment saying it must never be called with `'completed'` on the strength of a
button press. The label the customer sees says their reference was sent and the
kitchen will confirm — it does not claim the money arrived.

This replaced the previous behaviour, which set `payment_status: 'completed'`
purely because the customer typed something into a text box.

## 5. Orders are saved, and failure is visible

Three fake-success paths were removed:

1. **Unconfigured backend.** `RightOrderPanel` wrapped the insert in
   `if (isSupabaseConfigured)`. With Supabase unset the block was skipped and
   the success banner rendered anyway — the order existed nowhere. Checkout now
   refuses to proceed and says ordering is unavailable.

2. **Dropped line items.** `ordersService.createOrder` inserted the order row,
   then inserted `order_items`, and on failure only called `console.error`. The
   customer got a confirmation for an order the kitchen would see as a ticket
   with nothing to cook. It now deletes the orphaned order row and throws.

3. **Invented phone number.** The order payload used
   `user.phone || '6301196547'`. Phone is now a validated required field.

On failure the customer is told what happened, that nothing was charged, and
that the cart is intact — the cart is only cleared after `createOrder` resolves.

## 6. Admin receives orders in realtime

The plumbing was already in place and did not require touching admin screens:
`ALTER PUBLICATION supabase_realtime ADD TABLE public.orders`
(`supabase/migrations/0002_rls_policies.sql:230`), an `orders_team_read` RLS
policy for admin/staff/drivers, and an `App.tsx` subscription that re-fetches on
change. Admin views read from `App`'s `orders` state, so they update with it.

**One real bug found and fixed.** The subscription effect had `[]` deps, so the
channel joined once at mount — before anyone signed in. `postgres_changes`
events are filtered by RLS against the token the socket joined with, so a
channel opened anonymously stays anonymous: an admin signing in afterwards
received nothing until a full page reload. It is now keyed on `user?.id`.

Related: channel topics were fixed strings. `removeChannel()` resolves
asynchronously, so a re-subscribe could collide with the teardown of the
previous channel. Topics are now uniquely suffixed.

## 7. Kitchen

Kitchen reads the same `orders` state as admin, so the realtime fix above
covers it. `KitchenView` was not modified.

**Status vocabulary — partially deferred, see Open items.** `OrderStatus` was
extended to include `accepted`, `preparing` and `ready` alongside the existing
values. It was extended rather than renamed because `cooking`, `assigned` and
`out_for_delivery` are still written by `KitchenView`, `LiveOrdersView`,
`DashboardView` and `DriverView` — all out of scope.

## 8. Customer live tracking

`OrderTrackerModal` maps both vocabularies onto four customer-facing steps:

| Step | Statuses |
|---|---|
| Order Placed | `pending`, `accepted` |
| Preparing in Kitchen | `preparing`, `cooking`, `assigned` |
| Ready & On the Way | `ready`, `out_for_delivery` |
| Delivered | `delivered` |

`cancelled` maps to `-1` and shows no progress.

**Second bug fixed.** The tracker was opened with a snapshot of the order and
never re-read it, so the progress bar sat frozen at whatever status the order
had when the modal opened. An effect in `App.tsx` now re-syncs the tracked order
from the realtime-updated list.

## 9. Validation

`validateCheckout` in `src/lib/checkout.ts` is a single pure function used by
both the button's `disabled` state and the submit handler, so they cannot
disagree. It requires, in order:

1. Cart not empty — checked first, because with an empty cart the other messages
   are noise
2. Name — via `validateFullName`
3. Phone — via `validatePhone`; the field is digits-only and capped at 10
4. Address — via `validateAddress`
5. Payment method — must be one the checkout actually offers
6. Subtotal ≥ minimum order value, with the shortfall named

## 10. Testing

**Automated — `checkout.test.ts`, 14 tests, all passing. Full suite: 105/105.**

Covers each validation rule independently, the empty-cart-wins-first ordering,
rejection of `Card`/`Razorpay`, the boundary where subtotal exactly equals the
minimum, order-number derivation including unparseable input (`nextOrderNumber`
previously produced `NaN` on a malformed number), ETA formatting, and
`upi://pay` URI construction.

`tsc --noEmit` clean. `npm run build` succeeds.

**Not automated.** There are no component or end-to-end tests in this project —
no testing-library, no Playwright, and no Supabase credentials available here.
So these five Phase 2 checks are **verified by code inspection only, not
executed**:

| Check | Status |
|---|---|
| Order saved to Supabase | Code path verified; not run against a live database |
| Realtime works | Publication, RLS and subscription verified; not observed live |
| Customer receives confirmation | Rendering verified; not run |
| Admin receives order | Not run |
| Kitchen receives order | Not run |
| No fake success screens | Verified by inspection — the three paths above are removed |

To verify manually: sign in as a customer in one browser and an admin in
another, place a COD order, and confirm it appears in Live Orders and Kitchen
without a refresh. That exercise is what would have caught the `[]`-deps
subscription bug, which is why it is worth doing before this ships.

---

## Open items

**Status vocabulary is split.** Phase 2 asked for Pending / Accepted /
Preparing / Ready / Delivered / Cancelled. Implementing that as a rename means
editing `KitchenView`, `LiveOrdersView` and `DashboardView`, which this phase
was told not to touch. The type now carries both sets and every customer-facing
surface reads both, but the kitchen still emits `cooking` and
`out_for_delivery`. **Nothing currently writes `accepted`, `preparing` or
`ready`** — those become live when the kitchen screen is in scope.

Also worth noting: the requested list has no equivalent for `out_for_delivery`
or `assigned`, which the driver flow depends on. A straight rename would lose
that state, so the eventual migration needs a decision on it rather than a
find-and-replace.

**Order numbers can collide.** `#1005`-style numbers are derived client-side
from the orders already loaded. Two customers checking out in the same moment
can derive the same label. It is cosmetic — the primary key is a database UUID
and the orders are distinct rows — but a Postgres sequence would be the honest
fix.

**Security telemetry is dropped on insert.** `createOrder` does not send
`customer_ip`, `order_latitude`, `fraud_risk_level` and the other fields the
checkout collects, so they are captured and discarded. Left alone because the
consumers are admin fraud panels.

**`initialOrders` still seeds four example orders** carrying invented customer
names and phone numbers. Left from Phase 1 because they populate admin and
kitchen views.
