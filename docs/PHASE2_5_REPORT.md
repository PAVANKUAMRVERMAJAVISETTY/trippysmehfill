# Phase 2.5 — Customer Order Experience

Admin, Kitchen, Reports and Analytics were not modified. One database migration
was added; it changes policy, not those screens. See **Action required**.

---

## 1. Checkout UI

`CheckoutView` was rebuilt around a mobile-first layout.

- **Spacing** — sections are `rounded-3xl` cards at `p-5 sm:p-6` with `space-y-4`
  between them, replacing the previous uniform `p-3.5`/`space-y-2` density.
- **Large payment cards** — `min-h-[112px]`, `border-2`, a 28px icon, title and
  explanatory line, with a check mark on the selected card. Previously a 40px-tall
  button with a 16px icon.
- **Sticky bottom checkout button** — fixed bar below `lg`, with
  `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` so it clears the iOS home
  indicator. The page carries `pb-32` so the last card is never trapped behind it.
  Wide screens keep the button inline instead — a fixed bar on a desktop viewport
  is wasted furniture.
- **Modern order summary** — veg/non-veg dot per line, scrollable item list,
  and a separated totals block.
- **Touch targets** — every interactive element on the checkout and orders
  screens is at least 44px, most 48–52px.

## 2. Payment

| Option | Where |
|---|---|
| Cash on Delivery | Payment card |
| UPI QR | Confirmation screen, after the order is saved |
| **UPI Intent** | `Pay with UPI App` — anchor to the `upi://pay` URI, opens the installed app |
| **Copy UPI ID** | Button beside the ID, with toast confirmation |
| **Share Payment Screenshot** | File picker → Web Share API with the order reference attached |

The QR still appears only *after* the order row exists, so a customer never pays
for an order that failed to save.

`sharePaymentScreenshot` gates on `navigator.canShare({ files })` rather than
`navigator.share` alone, because desktop Chrome exposes `share` but throws on
files. When unsupported it says so instead of silently doing nothing.

## 3. Order Confirmation

A dedicated success page showing Order ID (display number *and* database
reference), estimated delivery as a clock time, the full item list, the totals
breakdown, and payment status as a coloured pill.

- **Track Order** — opens the live tracker
- **Download Receipt (PDF)** — one-page A4 receipt via jsPDF
- **Share Order** — Web Share API, falling back to clipboard

jsPDF is loaded with a dynamic `import()`, so it is code-split: the main bundle
grew 1,222 kB → 1,261 kB (the new components), while jsPDF's 391 kB sits in a
chunk that only downloads when someone actually taps Download.

`shareOrder` returns `'shared' | 'copied' | 'unavailable'` so the toast reports
what actually happened rather than always claiming success.

## 4. My Orders

New route (`activeSection === 'orders'`) and `MyOrdersView`. The header's
existing *My Orders* link pointed at the profile modal; it now opens this page.

- **Current / Previous tabs** with counts, split by `isCurrentOrder`
  (delivered and cancelled are previous)
- **Reorder** — matches by dish id, then by name, because a dish can be
  recreated with a new id. Unavailable items are skipped **and named** in the
  toast; a customer who reorders four items and gets three should be told which
  one is missing. If nothing matches it says so rather than silently clearing
  the cart.
- **Cancel** — only while `pending` or `accepted`
- **Invoice** — same PDF generator as the receipt
- Expandable rows showing items and, for in-flight orders, the progress timeline

## 5. Live Tracking

`OrderProgressTimeline` — a vertical timeline over the five delivery stages,
with cancelled handled as its own terminal state.

Pending → Accepted → Preparing → Out for Delivery → Delivered, plus Cancelled.

Animation: the connector between completed steps grows via `scale-y` (compositor,
not layout), the active node has a ping halo, and all of it is disabled under
`motion-reduce`. Shared by the tracker modal and My Orders, so there is one
definition of what the stages are.

`src/lib/orderStatus.ts` is now the single mapping from stored status to
customer-facing stage, which is where the two vocabularies from Phase 2 get
reconciled — `cooking` → Preparing, `ready`/`assigned` → Out for Delivery.

## 6. Notifications

`ToastContext` + `ToastHost`. Bottom-centre on phones (above the sticky bar),
top-right from `sm` up. Max three visible, auto-dismiss at 5s, manual dismiss,
`role="status"` + `aria-live="polite"`.

Fired for: order received, kitchen accepted, preparing, out for delivery,
delivered, cancelled — plus UPI ID copied, payment reference sent, reorder
results and every failure path.

**Two suppression mechanisms, both necessary.** `showToast` takes an optional
`key` so the same (order, status) pair announces once. And the effect seeds
itself on first pass: without that, opening the app would fire a "Delivered"
toast for every order the customer had ever received, because the effect reads a
list rather than an event stream. Toasts now fire on *transitions* only.

## 7. Validation

Unchanged from Phase 2 (`validateCheckout`) — empty cart, name, phone, address,
payment method, minimum order value — plus:

**Duplicate submission prevention.** `handlePlaceOrder` is guarded by a `useRef`
lock, not the `isPlacing` state flag. A double-tap can deliver both events in the
same tick, before React has re-rendered, so `isPlacing` would still read `false`
on the second one. The ref flips synchronously. It is released only on failure —
after success the confirmation screen replaces the form, so there is nothing left
to submit.

The button is additionally `disabled` while placing and whenever validation fails.

## 8. Mobile

- Single-column below `sm`, two columns above
- `min-w-0` + `break-words` on every flex row containing order text, and
  `truncate` on the UPI ID — long dish names and addresses were the realistic
  overflow sources
- `inputMode="numeric"` on phone and UPI reference fields
- Safe-area padding on the sticky bar
- Inputs at 48px, buttons 44–52px

---

## Action required before this works in production

**Run `supabase/migrations/0006_customer_order_updates.sql`.**

While building Cancel I found that customers have **no UPDATE policy** on
`public.orders`. Migration 0002 grants them SELECT and INSERT only; the sole
UPDATE policies are `orders_team_write` (admin/staff) and `orders_driver_update`.

This means Cancel would fail — and so would **Phase 2's "I've Paid"**, which has
been shipping into a policy that silently matched zero rows. That is why
`cancelOrder` checks the returned row count rather than trusting a missing error.

The migration adds one narrow policy plus a `BEFORE UPDATE` trigger, because a
row-level policy cannot express *"you may set status to cancelled, but not to
delivered"*. The trigger blocks a customer from changing totals, `customer_id`,
`order_number`, or setting any status other than `cancelled`, and from marking
their own payment as settled. Team members and the assigned driver bypass it.

Until it is run, Cancel and I've Paid will report an error rather than appear to
work — which is the correct failure mode, but it is a failure.

## Verification

`tsc --noEmit` clean · **115/115 tests pass** · `npm run build` succeeds.

`orderStatus.test.ts` adds 10 tests covering stage mapping for all nine stored
statuses, the invariant that the lifecycle only ever moves forward, cancellation
eligibility, current/previous partitioning, toast copy, payment labels and share
text.

**Not verified by execution.** There are still no component or end-to-end tests
in this project, and no Supabase credentials here. These need a browser:

| Needs manual check | Why |
|---|---|
| Cancel and I've Paid | Depend on migration 0006 being run |
| Toast on kitchen status change | Needs a second session moving the order |
| PDF receipt contents | jsPDF output is not asserted |
| UPI intent link | Needs a device with a UPI app |
| Share / share screenshot | Web Share API is unavailable in headless environments |
| Sticky bar vs. iOS safe area | Real device only |

## Carried forward

- **Nothing writes `accepted`, `preparing` or `ready`.** The customer timeline
  renders all five stages, but the kitchen still emits `cooking` and
  `out_for_delivery`. Until KitchenView is in scope, an order visibly moves
  Pending → Preparing → Out for Delivery, skipping Accepted.
- Order numbers are still derived client-side and can collide under concurrency
  (cosmetic; the primary key is a UUID).
- `createOrder` still drops the security telemetry the checkout collects.
- `initialOrders` still seeds four example orders with invented customer names.
- `CustomerDashboardModal` retains its own older orders tab, now overlapping
  My Orders. Consolidating it means touching a 1,285-line modal that also holds
  wallet, coupons and referral tabs — left alone deliberately.
