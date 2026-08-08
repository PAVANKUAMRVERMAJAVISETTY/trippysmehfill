# Customer Flow Report

Legend: ✅ verified · ⚠️ code-verified, not run · 🔴 known broken · ❓ not verifiable here

| Step | Status | Evidence |
|---|---|---|
| Visits website | ⚠️ | Builds and serves; **never rendered** — no browser |
| Browse menu | ✅ | `menu_items` returns 4 dishes live, HTTP 200 |
| Search dishes | ⚠️ | `searchQuery` filter in `App.tsx`; not exercised |
| Categories / filters | ⚠️ | `CategoryPills` + `selectedCategory`; not exercised |
| Add items | ⚠️ | `CartContext`; no automated coverage |
| Update quantity | ⚠️ | `CartDrawer`; not exercised |
| Remove items | ⚠️ | `CartDrawer`; not exercised |
| Apply promo | ❓ | **No promo-code feature exists.** `promo_codes` is in `phase2_schema` but absent live and unused in the UI. Reported, not built. |
| Login | 🔴 | **Signup fails in production** — `42501` on `profiles` |
| OTP | ❓ | Requires a real inbox. SMTP config unverified. |
| Profile | ⚠️ | Inside `CustomerDashboardModal`; no standalone page |
| Checkout | ✅ logic | 14 `checkout.test.ts` tests; live query verified |
| COD | ⚠️ | Code path verified; **not run end to end** |
| UPI | ⚠️ | QR at 400×400, amount `.toFixed(2)`, order number in `tn=` |
| Place order | ⚠️ | Single INSERT; every column verified present live |
| Order saved | ⚠️ | **Not exercised** — no write performed against production |
| Track order | ⚠️ | Tracker re-syncs on `payment_status`, `payment_rejection_reason`, `driver_name` |
| Realtime updates | ❓ | Publication unverified |
| Payment updates | 🔴 | 0007 not applied |
| Delivered | ⚠️ | Driver flow; not exercised |

## Verified properties

**"Never fake success" holds.** `setStep('upi_payment' | 'confirmed')` sits
*inside* the `try`, after `await createOrder` resolves — [CheckoutView.tsx:226](../src/components/customer/CheckoutView.tsx#L226).
There is no path to the payment screen without a saved row. On failure the
customer keeps their cart and is told *"Nothing has been charged."*

**Double submission blocked** by a `useRef` lock, not state — state can still
read stale on the second tap of a double-tap in the same tick.

**Timeline correctness** — 23 tests, including an exhaustive sweep of 2 payment
methods × 5 payment statuses × 9 order statuses (90 combinations), asserting
every step renders a state the component can draw.

## Gaps

| | Gap |
|---|---|
| CF-1 | **Promo codes do not exist.** Requested in the journey; no feature, no table live. |
| CF-2 | Profile and Settings are modal sections, not pages |
| CF-3 | Cart has no automated coverage — `CartContext` is untested |
| CF-4 | Nothing verified in a browser |
