# Phase 2.5 Enhancement — Payment Experience

Customer checkout only. Admin, Kitchen, Reports and Analytics were not modified
(`git status src/components/admin/` is empty).

---

## Order flow

Checkout is now three explicit screens rather than one:

```
form  →  (UPI only) upi_payment  →  confirmed
```

COD skips the middle step entirely. **The payment screen is only reachable after
`createOrder` resolves**, so a customer is never asked to transfer money for an
order that then fails to save. If the insert fails they stay on the form with the
error, the cart intact, and nothing requested of them.

## Payment options

Two cards, stacked full-width so both read clearly on a phone.

### ① 🚚 Cash on Delivery — `Recommended`

> Pay our delivery partner when your food arrives. No advance payment required.

Carries a green **Recommended** badge. Button label becomes
**"Continue with Cash on Delivery"** once selected.

### ② ⚡ Instant UPI Payment — `Optional`

> Pay now using any UPI app.

Lists Google Pay · PhonePe · Paytm · BHIM · Any UPI App as chips. Button becomes
**"Continue with UPI Payment"**.

**Neither is preselected.** Cash on Delivery is recommended *visually* — badge,
first position, softer framing — but the customer still has to choose. That is
deliberate: if COD were auto-selected, the required validation message could
never appear. Recommending is not the same as deciding for them.

## UPI payment screen

Shown only after the order row exists. Opens with a green confirmation that
**Order #NNNN is saved** before asking for anything.

| Element | Detail |
|---|---|
| Amount | 4xl, top of card — the number you are paying, unmissable |
| QR code | `w-full max-w-[260px] aspect-square`, requested at 400×400 so it stays sharp when scaled |
| UPI ID | Full-width 52px monospace field |
| Copy UPI ID | 52px button, toast confirmation, and a fallback message naming the ID if the clipboard API is blocked |
| Open UPI App | 56px, `upi://` intent |
| I've Paid | 56px, records the reference |
| Share Payment Screenshot | File picker → Web Share API with the order reference attached |
| Payment Instructions | Verbatim as specified |

> "Please complete your payment after placing the order. Once payment is
> received, our team will verify and begin preparing your food."

There is also an **"I'll pay later — view my order"** exit. Without it a customer
who could not complete the transfer would be stranded on a screen with no way
forward, and their order already exists regardless.

`upi://` links only resolve where a UPI app is installed. On a non-mobile user
agent the button stays visible but carries a line explaining it needs a phone and
to scan the QR instead — hiding it would be wrong on tablets we cannot classify,
and leaving it silent would be worse.

## Payment is never marked successful automatically

This is the substantive behavioural change from the previous build.

| | Before | Now |
|---|---|---|
| Stored `payment_status` | `'pending'` | `'pending'` (unchanged) |
| UI after "I've Paid" | **"Payment Success"** | **"Pending Verification"** |

The database was already correct — `updatePaymentStatus` has always been called
with `'pending'`, and Phase 2 removed the code that set `'completed'` on a
button press. But the *interface* said "Payment Success", which told the customer
something nobody had checked. `paymentLabel()` in `src/lib/orderStatus.ts` now
returns `Pending Verification` for any unsettled UPI order, and only says "Paid"
once `payment_status` is genuinely `'completed'` — which only an admin can set.

Pressing "I've Paid" records the customer's reference so an admin can match the
transfer. It is a claim, not a settlement, and the wording now matches.

## Order confirmation

```
✅ Order Confirmed
```

A four-row detail list, one fact per row:

- **Order ID** — `#1005`, monospace
- **Estimated Delivery** — as a clock time (`30 mins (by 7:45 pm)`)
- **Payment Method** — 🚚 Cash on Delivery or ⚡ Instant UPI Payment
- **Payment Status** — `Pay on delivery` (COD, gold) or `Pending Verification` (UPI, amber)

Then items and total, and the two primary actions: **Track Order** (56px) and
**Back to Menu** (52px).

Receipt and Share are kept as small secondary text buttons below. They were
delivered in the previous phase and still work, but the spec asked to keep this
simple, so they no longer compete with the two actions that matter.

## Validation

Selecting nothing and attempting to continue shows exactly:

> Please select a payment method.

It appears in the sticky bar on mobile and above the button on desktop, and the
button stays `disabled`. `validateCheckout` is the single source for this — the
same function drives both the disabled state and the submit guard, so they cannot
disagree.

## Mobile

- QR scales with the viewport (`w-full max-w-[260px] aspect-square`) rather than
  a fixed pixel box, and is fetched at 400×400 so it stays crisp
- Primary buttons 56px, secondary 48–52px, all inputs 52px
- UPI ID row is full-width with the copy button beside it — a large target on
  both, rather than a small icon
- `min-w-0` + `truncate` on the UPI ID, `break-words` on item names and the
  address, so long values cannot push the layout sideways
- Sticky bar keeps `env(safe-area-inset-bottom)`; page padding raised to `pb-40`
  for the taller button
- `inputMode="numeric"` on phone and UPI reference

## Verification

`tsc --noEmit` clean · **115/115 tests pass** · `npm run build` succeeds ·
jsPDF still code-split into its own 391 kB chunk.

Tests updated for the two copy changes: `Please select a payment method.` is now
asserted exactly, and the payment-label test asserts `Pending Verification` with
a comment explaining why it must not say anything stronger.

**Still needs a real device**, unchanged from the previous report: the `upi://`
intent, Web Share, clipboard behaviour on iOS Safari, and the sticky bar against
the iPhone home indicator. There is no component or E2E harness in this project.

**Migration 0006 is still outstanding.** "I've Paid" writes an UPDATE to
`orders`, and customers have no UPDATE policy until
`supabase/migrations/0006_customer_order_updates.sql` is run. Until then that
button reports an error rather than appearing to work — the correct failure mode,
but still a failure. This is the same item flagged in `PHASE2_5_REPORT.md`.

## Note on admin verification

The customer side now correctly holds UPI orders at *Pending Verification*
indefinitely. **Nothing currently moves an order out of that state** — marking
`payment_status = 'completed'` needs a control on the admin order view, which is
out of scope here. Until that exists, a paid UPI order will read as pending
forever. Worth scheduling in whichever phase opens up Admin.
