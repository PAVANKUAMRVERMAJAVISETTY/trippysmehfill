# Manual Test Plan — RC2

There is no component or E2E harness in this project. `npm test` covers pure
logic only (128 assertions over validation, checkout rules, order status and the
tracking timeline). **Everything below has to be done by a person.**

## Setup

| | |
|---|---|
| Environment | Production, or a staging project with migration 0007 applied |
| Accounts | One **customer**, one **admin** (`profiles.role = 'admin'`) |
| Devices | A desktop browser and a real phone. Two browsers side by side for TC-14. |
| Data | A menu with at least two available dishes above the minimum order value |

**Before starting:** confirm migrations **0001–0009** are applied, `orders` is
published to Realtime, and `on_auth_user_created` exists on `auth.users` —
§3, §4.4 and §5 of [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md). Without
those, most of these fail for reasons that have nothing to do with the UI.

**New in RC2:** section **H · Authentication** (TC-16 – TC-22). RC2 moved profile
creation out of the client and into the `handle_new_user_signup()` database
trigger, and added OTP session restore. Both are new code paths with no
automated coverage.

**Recording:** mark each case Pass / Fail / Blocked. A Fail needs the actual
observed behaviour written down, not just the mark.

---

## A · Customer — Cash on Delivery

### TC-01 · COD order completes

| | |
|---|---|
| **Steps** | 1. Sign in as customer. 2. Add two dishes. 3. Open cart → Checkout. 4. Fill name, 10-digit phone, address. 5. Select **🚚 Cash on Delivery**. 6. Press **Continue with Cash on Delivery**. |
| **Expect** | Confirmation screen. Order ID `#NNNN`. Estimated Delivery as a clock time. Payment Method **🚚 Cash on Delivery**. Payment Status **Pay on delivery**. No UPI screen at any point. |
| **Why** | COD must never be routed through payment verification. |

☐ Pass ☐ Fail — observed: `______________________________`

### TC-02 · COD timeline has no payment steps

| | |
|---|---|
| **Steps** | From TC-01, press **Track Order**. |
| **Expect** | Timeline reads **Order Placed → Preparing → Out for Delivery → Delivered**. **No** "Payment Pending" or "Payment Confirmed" step. |
| **Why** | Showing a cash order a payment wait invents a delay that does not exist. |

☐ Pass ☐ Fail — observed: `______________________________`

### TC-03 · COD does not appear in the admin payment queue

| | |
|---|---|
| **Steps** | As admin, open **Payment Verification**. |
| **Expect** | The TC-01 order is **not** listed under any filter, including *All UPI Orders*. |

☐ Pass ☐ Fail — observed: `______________________________`

---

## B · Customer — UPI

### TC-04 · The order is saved before any money is requested

| | |
|---|---|
| **Steps** | 1. Add dishes, go to checkout. 2. Select **⚡ Instant UPI Payment**. 3. Press **Continue with UPI Payment**. |
| **Expect** | Payment screen opens **with a green confirmation that the order is already saved**, showing its number. Amount, QR code, UPI ID, Copy UPI ID, Open UPI App, I've Paid, and the Payment Instructions. |
| **Why** | A customer must never transfer money for an order that then fails to save. |

☐ Pass ☐ Fail — observed: `______________________________`

### TC-05 · "I've Paid" records a claim, never a settlement

| | |
|---|---|
| **Steps** | Enter any reference, press **I've Paid**. |
| **Expect** | Confirmation screen. Payment Status **Pending Verification**, amber. The words "Paid", "Payment Success" or "Payment Confirmed" appear **nowhere**. |
| **Why** | This is the core rule of Phase 2.5 and 3. Pressing a button is not evidence money arrived. |

☐ Pass ☐ Fail — observed: `______________________________`

**Database check:**

```sql
SELECT order_number, payment_status, upi_transaction_id, payment_verified_at, payment_verified_by
  FROM public.orders ORDER BY created_at DESC LIMIT 1;
```

Expect `payment_status = pending`, the reference stored, **both audit columns NULL**.

☐ Confirmed

### TC-05a · Validation refuses an unselected payment method

| | |
|---|---|
| **Steps** | On checkout with a valid form, select no payment method and try to continue. |
| **Expect** | Exactly **"Please select a payment method."** The button stays disabled. |

☐ Pass ☐ Fail — observed: `______________________________`

---

## C · Admin — Payment Verification

### TC-06 · Tab is present and correct

| | |
|---|---|
| **Steps** | Sign in as admin, open the admin section. |
| **Expect** | **Payment Verification** tab between Live Orders and Kitchen. Count badge when UPI orders are pending. All twelve pre-existing tabs still present and working. |

☐ Pass ☐ Fail — observed: `______________________________`

### TC-07 · Every required column is shown

| | |
|---|---|
| **Steps** | Open Payment Verification with at least one pending UPI order. |
| **Expect** | Order ID · Customer · Phone · Amount · Payment Method · Transaction ID · Created Time · Payment Status · Verify / Reject. Created Time is an **absolute** date-time, not "5 minutes ago". Missing reference reads *"Not provided"*. |

☐ Pass ☐ Fail — observed: `______________________________`

### TC-08 · Search, filter, pagination

| | |
|---|---|
| **Steps** | 1. Search an order number, then a customer name, then a phone, then an amount. 2. Cycle all four filters. 3. With more than 10 matching orders, page forward and back. |
| **Expect** | Search matches on all five fields. Filters show only their status; *All UPI Orders* shows every UPI order and no COD order. Pagination is 10 per page and the counter is accurate. |

☐ Pass ☐ Fail — observed: `______________________________`

### TC-09 · Verify Payment

| | |
|---|---|
| **Steps** | Press **Verify Payment** on a pending order. |
| **Expect** | Chip flips to **Verified**, buttons replaced by *Reviewed*. No error. |

☐ Pass ☐ Fail — observed: `______________________________`

```sql
SELECT order_number, payment_status, payment_verified_at, payment_verified_by
  FROM public.orders WHERE order_number = '#____';
```

Expect `completed`, **both audit columns populated**, and `payment_verified_by`
equal to the admin's `profiles.id` — **not** sent by the browser, stamped by the
database trigger.

☐ Confirmed

### TC-10 · Reject Payment

| | |
|---|---|
| **Steps** | 1. Press **Reject Payment** on a pending order. 2. Confirm the reason panel appears. 3. Press **Cancel** — verify nothing changed. 4. Press Reject again, type a reason, press **Confirm Rejection**. |
| **Expect** | Rejection takes two deliberate steps. Cancel is a true no-op. After confirming: chip **Rejected**, reason displayed. |
| **Why** | Rejecting is destructive from the customer's side; one stray tap must not do it. |

☐ Pass ☐ Fail — observed: `______________________________`

```sql
SELECT payment_status, payment_rejection_reason, payment_verified_by
  FROM public.orders WHERE order_number = '#____';
```

Expect `rejected`, the reason stored, `payment_verified_by` populated.

☐ Confirmed

### TC-11 · A customer cannot settle their own payment — SECURITY

**The single most important case here. If it fails, do not go live.**

| | |
|---|---|
| **Steps** | Signed in as the **customer** who owns a pending UPI order, in the browser console: |

```js
const { data, error } = await window.supabase
  .from('orders')
  .update({ payment_status: 'completed' })
  .eq('id', '<their own order id>')
  .select();
console.log({ data, error });
```

> If `window.supabase` is not exposed, use any REST client with the customer's
> access token against
> `PATCH /rest/v1/orders?id=eq.<id>` and body `{"payment_status":"completed"}`.

| | |
|---|---|
| **Expect** | An error, **not** success. Either `check_violation` — *"Payment settlement is confirmed by the restaurant, not the customer"* — or zero rows from RLS. `payment_status` unchanged in the database. |
| **Why** | Enforced by the migration 0007 trigger, independently of the UI. |

☐ Pass ☐ Fail — observed: `______________________________`

**Also try forging the audit trail:**

```js
await window.supabase.from('orders')
  .update({ payment_verified_at: new Date().toISOString() })
  .eq('id', '<their own order id>').select();
```

Expect *"Payment verification details are written by the restaurant only"*.

☐ Confirmed

### TC-12 · Two admins, same order

| | |
|---|---|
| **Steps** | Open Payment Verification as admin in two browsers. Both looking at the same pending order. Press **Verify** in one, then **Verify** in the other. |
| **Expect** | First succeeds. Second reports **"This payment could not be verified — it may already have been reviewed by someone else."** and does not double-write. |
| **Why** | The `payment_status = 'pending'` guard is in the WHERE clause, not just the UI. |

☐ Pass ☐ Fail — observed: `______________________________`

---

## D · Customer sees the outcome

### TC-13 · The three payment states read correctly

| State | Label | Note beneath | Tone | ☐ |
|---|---|---|---|---|
| UPI, unsettled | Pending Verification | We are checking your transfer. | amber | ☐ |
| UPI, verified | **Payment Confirmed** | — | green | ☐ |
| UPI, rejected | **Payment Rejected** | **Please contact the restaurant.** | red | ☐ |
| COD, unsettled | Pay on delivery | — | gold | ☐ |

Check each in **all three** places:

| Screen | Pending | Confirmed | Rejected |
|---|---|---|---|
| Checkout confirmation | ☐ | ☐ | ☐ |
| Order tracker | ☐ | ☐ | ☐ |
| My Orders | ☐ | ☐ | ☐ |

Also on the tracker:

- ☐ **Order Status** shown
- ☐ **Payment Status** shown
- ☐ **Estimated Delivery** shown
- ☐ **Order Timeline** shown

And on the UPI timeline:

- ☐ Reads Order Placed → Payment Pending → Payment Confirmed → Preparing → Out for Delivery → Delivered
- ☐ When rejected, that step is red and renamed **Payment Rejected**, and the
      later steps still exist (the order is not dead — it can still be paid for)

---

## E · Realtime — two browsers

### TC-14 · End to end, nothing refreshed

**The case that proves Phase 3.** Windows side by side.
**Do not press refresh at any point.** A refresh invalidates the test.

Browser A — customer, signed in.
Browser B — admin, on Payment Verification.

| Step | Do this in | Expect in the other window | ☐ |
|---|---|---|---|
| 1 | **A** places a UPI order | **B**: appears in the queue within ~2s | ☐ |
| 2 | **A** opens the tracker and leaves it open | — | ☐ |
| 3 | **B** presses **Verify Payment** | **A**: flips to **Payment Confirmed** *while the tracker is open*, plus toast **"Payment received and verified."** | ☐ |
| 4 | **A** places a second UPI order | **B**: appears | ☐ |
| 5 | **B** rejects it with a reason | **A**: **Payment Rejected**, toast **"Payment rejected. Please contact the restaurant."** | ☐ |
| 6 | — | **B**: the pending badge count decreases as each is settled | ☐ |

Time observed for step 3: `______ seconds`

**If nothing arrives:** Realtime is not delivering. Check `orders` is in
`supabase_realtime`, the Realtime service is on, and the browser console shows no
`CHANNEL_ERROR`. §5 of [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).

### TC-15 · Toasts do not fire on sign-in

| | |
|---|---|
| **Steps** | As a customer with several past orders — some verified, some delivered — sign out and back in. |
| **Expect** | **No** burst of "Payment received and verified" or "Delivered" toasts for historical orders. |
| **Why** | The code reads a list, not an event stream, so it seeds on first pass. This verifies the seeding still works after the Phase 3 additions. |

☐ Pass ☐ Fail — observed: `______________________________`

---

## F · Mobile

Real phone, not a desktop emulator. Emulators do not catch tap targets,
safe areas, or the on-screen keyboard.

| | Check | ☐ |
|---|---|---|
| F-01 | Admin Verify/Reject buttons are comfortably tappable (48px minimum) | ☐ |
| F-02 | Admin list renders as cards, not a squeezed table | ☐ |
| F-03 | Reject reason panel is usable with the keyboard open | ☐ |
| F-04 | Customer payment page fits with no horizontal scroll | ☐ |
| F-05 | QR code scales and stays sharp | ☐ |
| F-06 | Sticky checkout bar clears the iPhone home indicator | ☐ |
| F-07 | Long dish names and addresses wrap rather than pushing the layout sideways | ☐ |
| F-08 | Payment Verification tab reachable in the scrolling admin nav | ☐ |
| F-09 | Toasts do not cover the primary button | ☐ |

**Known items still needing a real device**, carried from Phase 2.5 and not
resolved since — verify these too:

| | Check | ☐ |
|---|---|---|
| F-10 | `upi://` intent opens a UPI app | ☐ |
| F-11 | Copy UPI ID works on iOS Safari | ☐ |
| F-12 | Share Payment Screenshot opens the share sheet | ☐ |
| F-13 | Download Receipt produces a valid PDF | ☐ |

---

## G · Regression — nothing else broke

Phase 3 changed `src/App.tsx`, `orders.ts`, `orderStatus.ts` and the shared
timeline component, all of which other screens use.

| | Check | ☐ |
|---|---|---|
| G-01 | Live Orders still lists and updates | ☐ |
| G-02 | Kitchen view unchanged and working | ☐ |
| G-03 | Order History unchanged | ☐ |
| G-04 | Dashboard / analytics figures still render | ☐ |
| G-05 | Driver portal unchanged | ☐ |
| G-06 | Pending Registrations approve/reject still works | ☐ |
| G-07 | Menu, Inventory, Gallery, Feedback, Staff, Customers, Settings all load | ☐ |
| G-08 | Customer can still cancel an order before the kitchen accepts | ☐ |
| G-09 | Reorder from My Orders works | ☐ |
| G-10 | Feedback after delivery works | ☐ |
| G-11 | Sign-in by **email** works | ☐ |
| G-12 | Sign-in by **phone/username** works — *depends on the `lookup_login_email` RPC; see preflight §3* | ☐ |

---

## H · Authentication — new in RC2

RC2 changed how a customer account comes into existence. These paths have **no
automated coverage** — `otpService.test.ts` tests pure helpers, not the flow.

### TC-16 · Email signup reaches the OTP screen

| | |
|---|---|
| **Steps** | 1. Open the site signed out. 2. Register. 3. Enter name, 10-digit phone, hostel address, email. 4. Submit. |
| **Expect** | OTP screen appears. A real code arrives by email within ~60s. Resend link is disabled with a visible countdown. |
| **Why** | Confirms Brevo SMTP and the Auth Site URL are correct in production. |

☐ Pass ☐ Fail — observed: `______________________________`

### TC-17 · Refresh during OTP does not lose the signup

**The headline RC2 fix.**

| | |
|---|---|
| **Steps** | 1. From TC-16, on the OTP screen, **press F5 / pull-to-refresh**. 2. Reopen the auth modal if it does not reopen itself. |
| **Expect** | You land back on the **OTP screen**, not the start of registration. Email, name, phone and address are all still filled in. The register tab is selected. |
| **Why** | `sessionStorage` key `trippys_pending_otp_state`, restored on modal open. |

☐ Pass ☐ Fail — observed: `______________________________`

### TC-18 · The restored countdown is honest

| | |
|---|---|
| **Steps** | 1. On the OTP screen, wait ~40 seconds. 2. Refresh. |
| **Expect** | Roughly **20 seconds** remaining, not a fresh 60. The resend link becomes available at the right moment. |
| **Why** | The timer is recomputed from the saved timestamp, not restarted. A reset timer would let someone farm OTP emails by refreshing. |

☐ Pass ☐ Fail — observed: `______________________________`

**Also check the window expires:**

| | |
|---|---|
| **Steps** | Start a signup, leave it **more than 10 minutes**, then refresh. |
| **Expect** | State is **discarded** — you start fresh, not on a stale OTP screen. |

☐ Confirmed

### TC-19 · Signup creates the profile via the database trigger — **MUST PASS**

**If this fails, do not go live.** RC2 removed the client-side profile creation.

| | |
|---|---|
| **Steps** | Complete a signup end to end with a fresh email, entering the OTP. |
| **Expect** | Signed in and landed on the menu. A success message appears briefly before the modal closes. |

☐ Pass ☐ Fail — observed: `______________________________`

**Database check — this is the actual test:**

```sql
SELECT p.id, p.email, p.full_name, p.phone, p.role,
       p.wallet_balance, p.referral_code, p.is_approved
  FROM public.profiles p
 WHERE p.email = '<the address you used>';
```

| Expect | ☐ |
|---|---|
| Exactly **one** row | ☐ |
| `role = 'customer'` | ☐ |
| `full_name` and `phone` match what was typed | ☐ |
| `wallet_balance = 0.00` | ☐ |
| `referral_code` populated, shaped `TRIPPY-XXXX-1234` | ☐ |

**Zero rows means `on_auth_user_created` is not wired.** The signup will still
*appear* to succeed — that is exactly the silent failure this case exists to
catch. Fix by applying migration 0003.

**Also confirm no duplicate:**

```sql
SELECT email, count(*) FROM public.profiles GROUP BY 1 HAVING count(*) > 1;
```

Expect no rows. A duplicate would mean both the trigger and a client path are
creating profiles.

☐ Confirmed

### TC-20 · Login

| | |
|---|---|
| **Steps** | Sign out, then sign in with the account from TC-19. |
| **Expect** | Signed in, role applied correctly, lands on the menu. |

☐ Pass ☐ Fail — observed: `______________________________`

**Sign in by phone or username** — depends on the `lookup_login_email` RPC:

☐ Pass ☐ Fail — observed: `______________________________`

### TC-21 · Logout

| | |
|---|---|
| **Steps** | Sign out. Then hard-refresh. |
| **Expect** | Signed out and stays signed out. Admin entry point gone. Cart and order history not visible. No leftover session in `localStorage` under `trippys-auth`. |

☐ Pass ☐ Fail — observed: `______________________________`

### TC-22 · Password reset by OTP

| | |
|---|---|
| **Steps** | Use "forgot password" with a **real** registered address, then with an address that has no account. |
| **Expect** | Registered: an OTP arrives and the reset completes. Unregistered: a clear *"No account found"* rather than a silent failure or a raw Supabase error. |
| **Why** | RC2 moved reset to `signInWithOtp` and sanitises error messages. The unregistered path depends on the `email_exists` RPC. |

☐ Pass ☐ Fail — observed: `______________________________`

---

## Summary

| Section | Cases | Pass | Fail | Blocked |
|---|---|---|---|---|
| A · COD | 3 | | | |
| B · UPI | 3 | | | |
| C · Admin | 7 | | | |
| D · Customer states | 1 | | | |
| E · Realtime | 2 | | | |
| F · Mobile | 13 | | | |
| G · Regression | 12 | | | |
| **H · Authentication (new)** | **8** | | | |
| **Total** | **49** | | | |

**Must pass to go live:** TC-04, TC-05, TC-09, TC-10, **TC-11**, TC-13, TC-14,
**TC-19**.

Failures:

```
_______________________________________________________________
_______________________________________________________________
```

| | Name | Date |
|---|---|---|
| Tested by | | |
| Reviewed by | | |
