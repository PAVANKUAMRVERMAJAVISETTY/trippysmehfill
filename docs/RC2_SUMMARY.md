# RC2 Summary

| | |
|---|---|
| Release | **RC2** |
| Commit | `6eadb35` |
| Branch | `feat/supabase-auth-otp` (pushed) |
| Supersedes | RC1 (`8092424`) |
| Migrations | **0001 – 0009** |
| Recommendation | 🔴 **NO-GO** — eight blockers, all infrastructure-side |

Detail: [RELEASE_NOTES.md](RELEASE_NOTES.md) · [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) · [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) · [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) · [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) · [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md)

---

## Completed features

### Authentication

| | |
|---|---|
| Email OTP signup | Supabase Auth, Brevo SMTP configured in the dashboard — **no Brevo code in the repository**, and there must not be, since a `VITE_*` key is inlined into the bundle |
| **Session restore** | `sessionStorage` key `trippys_pending_otp_state` — a refresh mid-verification returns to the OTP screen with details intact |
| **OTP state persistence** | Written after the form is submitted *and* after an OTP is dispatched, so both entry paths survive a reload |
| Restore window | 10 minutes; older state is discarded |
| Resend cooldown | Recomputed from the saved timestamp, so a reload cannot reset it and farm OTP emails |
| Password reset | Moved to `signInWithOtp`; Supabase errors sanitised for display, raw error still logged to devtools |
| **Profile creation** | Moved from the client into the `handle_new_user_signup()` database trigger |
| Privileged columns | Migration 0008 blocks a customer changing their own `role`, `is_approved` or `account_status` |

### Checkout

Two payment cards, neither preselected. Cash on Delivery is recommended
*visually* — badge, first position — but the customer still chooses, because if
COD were auto-selected the required validation message could never appear.

- Validation message exactly **"Please select a payment method."**
- Minimum order value enforced, boundary included
- Duplicate submission blocked by a `useRef` lock, not state — a double-tap in
  the same tick reads stale state
- **The UPI payment screen is reachable only after `createOrder` resolves**, so
  nobody is asked to transfer money for an order that then fails to save

### Payments

| | |
|---|---|
| COD | Confirms immediately; reads *Pay on delivery* |
| UPI | QR, UPI ID, copy, `upi://` intent, share screenshot, "I've Paid" |
| **Pending Verification** | Where every UPI order sits until a person checks it |
| **Payment Confirmed** | Only an admin can set this |
| **Payment Rejected** | With *"Please contact the restaurant."* and an optional reason |

"I've Paid" records a **claim**, not a settlement. Nothing in the customer flow
can write `'completed'`.

### Realtime

- `orders` added to the `supabase_realtime` publication by 0007 — it was **never
  published** on the deployed schema, so the client subscribed successfully and
  then received nothing
- Subscription keyed on `user?.id`, because `postgres_changes` is RLS-filtered
  against the token the socket joined with
- Unique channel topics, so a re-subscribe cannot collide with a dying channel
- Tracker re-syncs on `payment_status`, `payment_rejection_reason` and
  `driver_name`, not just `status`
- Confirmation screen reads the live row rather than the insert snapshot

### Admin verification

A tab between Live Orders and Kitchen listing every UPI order:
Order ID · Customer · Phone · Amount · Method · Transaction ID · Created Time ·
Status, with **✅ Verify** and **❌ Reject**.

Search, four filters, pagination (10/page, index clamped). Rejection takes two
deliberate steps. Created Time is absolute so it matches a bank statement. Table
at `lg`+, cards below, all buttons ≥48 px.

### Database

The rule — **nothing marks a payment completed except a person deciding it is** —
holds in three independent places:

| Layer | Guarantee |
|---|---|
| Trigger | A non-team member moving `payment_status` off `'pending'` raises `check_violation`; client writes to audit columns refused |
| RLS | UPDATE on `orders` restricted to team members and, narrowly, the owning customer |
| Application | `'completed'` / `'rejected'` written only by `verifyPayment` / `rejectPayment` |

`payment_verified_at` / `_by` are never sent by the client — the trigger stamps
them from `auth.uid()`. Both service methods guard on `payment_status =
'pending'` in the WHERE clause, so two admins pressing Verify yields one
settlement and one *"already reviewed"*.

---

## Migrations

| # | File | Adds |
|---|---|---|
| 0001 | `core_schema` | Tables, constraints, indexes |
| 0002 | `rls_policies` | RLS, `is_team_member()`, `current_role_name()` |
| 0003 | `auth_triggers` | **`on_auth_user_created` on `auth.users`** |
| 0004 | `anon_lookup_rpcs` | `email_exists()`, `lookup_login_email()` |
| 0005 | `signup_trigger_telemetry` | Signup telemetry |
| 0006 | `customer_order_updates` | Customer UPDATE policy + order trigger |
| **0007** | **`payment_verification`** | `'rejected'`, audit columns, indexes, Realtime, payment trigger |
| **0008** | `fix_profiles_rls` *(upstream, renumbered)* | Profiles grants, policies, privileged-column trigger |
| **0009** | `profiles_wallet_referral` *(upstream, renumbered)* | `wallet_balance`, `referral_code`, `phone_exists()`, replaces `handle_new_user_signup()` |

**Renumbering:** upstream shipped its two as `0006` and `0007`, colliding with
ours. Git reported **no conflict** — the filenames differ, so it saw four
unrelated new files and merged cleanly, leaving two `0007`s and no defined apply
order. Theirs were moved to 0008/0009.

### Verified on real PostgreSQL 17

```
== A.  enum schema (phase2_schema.sql)    apply · pre-existing row untouched · re-apply
== A2. 27 behavioural assertions          all PASS
== A3. rollback                           enum restored, audit columns dropped
== A4. re-apply after rollback            repeatable
== B.  CHECK schema (0001–0006)           apply · re-apply · widen · roll back · narrow
== C.  full chain with 0008 + 0009        both schemas · idempotent
                                          handle_new_user_signup() present
                                          payment trigger still installed
RESULT: all migration checks passed
```

```
tsc --noEmit    clean
tests           128 / 128
build           ✓ 2m 9s · 344.17 kB gzip
```

---

## Known limitations

1. **Wallet and referral are schema-only.** Columns exist and codes are
   generated; nothing spends, credits or redeems. The 25% OFF referral is not
   wired into checkout. Dormant, not broken.
2. **0008 / 0009 carry stale internal headers** reading `0006` / `0007`. The
   filenames are authoritative.
3. **Two incompatible schema files** in `supabase/`. Every migration must be
   written twice until reconciled, as 0007 was.
4. **`initialOrders` seeds four example orders** with invented names as a
   pre-Supabase fallback. Flagged since Phase 1.
5. **Order numbers can collide under concurrency.** Two simultaneous checkouts
   can both compute `#1008`. Needs a database sequence.
6. **Nothing writes `'accepted'` / `'preparing'` / `'ready'`.** Kitchen still
   emits the legacy vocabulary; the mapping handles both.
7. **A rejected payment does not cancel the order.** Deliberate.
8. **No alert when the verification queue goes unworked.** A monitoring query
   exists; automation does not.
9. **Session restore does not survive a browser restart** or a different tab.
   Intended — `localStorage` would leave signup details on a shared device.
10. **No component or E2E harness.** 128 automated tests cover pure logic only.

---

## Outstanding risks

### 🔴 High

**R1 · The signup trigger may not exist, and failure is silent.**
RC2 moved profile creation out of the client into `handle_new_user_signup()`.
**0009 replaces that function but never creates the trigger that calls it** —
that comes from 0003. Your database was built from `phase2_schema.sql`, which has
none of the numbered migrations, so 0003 has very likely never run. The result is
an auth user with no profile and no role, and a browser that reports success.
RC1 masked this; RC2 does not.
→ Verify per [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) §4.7, and run TC-19.

**R2 · The security guarantee has never been exercised through the UI.**
Verified in SQL, never in a browser. A guarantee nobody has tried to break is a
claim, not a control.
→ **TC-11.**

**R3 · Realtime may not be delivering.** 0007 publishes `orders`, but the
Realtime *service* is a dashboard setting SQL cannot reach. Without it the app
still works — but every "instant" update silently becomes "after a refresh".
→ **TC-14.**

### 🟡 Medium

**R4 · The verification queue is a human dependency.** An unreviewed UPI order
leaves a paying customer at *Pending Verification* indefinitely. Nothing alerts
anyone.
→ Brief staff; use the monitoring query in [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) step 10.

**R5 · Auth RPCs may be missing.** `email_exists` and `lookup_login_email` live
only in 0004. Absent, sign-in by phone/username and password reset both answer
*"No account found"* — while email sign-in keeps working, so it goes unnoticed.

**R6 · Test phone numbers in the dashboard.** If any are configured, their static
codes work in production regardless of application code. `DEV_TEST_CREDENTIALS`
in the repo is dead code and tree-shaken out of `dist/` (verified) — this risk is
purely a dashboard setting.

**R7 · Wallet/referral shipped dormant.** Customers may see a referral code with
nothing to do with it. Decide whether that is acceptable or whether to defer 0009.

### 🟢 Low

**R8 · Order number collision** under simultaneous checkout.
**R9 · Bundle size** 344 kB gzip — above Vite's raw warning, below anything that
matters in practice.
**R10 · Node version drift** — built on 24.11.1, Netlify pins 20, Vercel pins
nothing.

---

## Recommended go-live order

```
 1. Merge to main                                      Dev
 2. Tag rc2                                            Dev
 3. Decide: ship wallet/referral dormant?              Product
 4. Preflight SQL — trigger, RPCs, RLS, admin count    DBA
 5. BACK UP THE DATABASE — record the timestamp        DBA
 6. Apply 0001 → 0009 in order, verifying after each   DBA
      0003 → confirm on_auth_user_created exists
      0007 → run the postflight block
      0009 → confirm phone_exists + wallet columns
 7. Confirm the payment trigger survived 0008/0009     DBA
 8. Enable Realtime in the dashboard                   DBA
 9. Deploy the application                             Dev
10. Smoke test — signup FIRST, then payments           QA
      a real signup must create a profiles row
11. Execute the manual test plan                       QA
      must pass: TC-04 TC-05 TC-09 TC-10 TC-11 TC-13 TC-14 TC-19
12. Watch for the first hour, then the first day       All
```

**Signup is tested before payments, deliberately.** If R1 has bitten, every
account created during payment testing is broken, and you will be debugging the
wrong layer.

---

## GO / NO-GO

### 🔴 NO-GO

**The code is not the problem.** Everything verifiable from a repository is
verified, **after the merge rather than before it**:

```
tsc --noEmit    clean
tests           128 / 128
build           ✓ 344.17 kB gzip
migrations      27 assertions, both schemas, forward + rollback + re-apply,
                plus proof that 0008/0009 do not undo the Phase 3 payment guard
```

That includes proof that a customer cannot mark their own payment completed,
cannot reject it, and cannot forge the audit trail.

**Eight blockers remain, every one of them requiring your Supabase project, your
hosting dashboard, or a person with a browser.**

| | Blocker |
|---|---|
| B1 | Migrations 0001–0009 not applied to production |
| B2 | Not merged to `main` |
| B3 | No `rc2` tag |
| B4 | Manual test plan: 49 cases, 0 executed |
| B5 | Realtime service state unknown |
| B6 | **`on_auth_user_created` presence unknown — now severe** |
| B7 | Admin account existence unconfirmed |
| B8 | Wallet/referral dormant — product decision outstanding |

Three are not paperwork:

- **B1** — until the migrations are applied, the feature this release exists to
  deliver does not work at all.
- **B6** — RC2 raised the stakes on a pre-existing risk. Profile creation now
  depends entirely on a trigger that may not be installed, and the failure is
  invisible from the browser.
- **B4** — TC-11, TC-14 and TC-19 are the three cases that decide whether this
  release does what it claims.

### When it becomes GO

Work the twelve steps above. When they are done and these eight cases are green —

```
TC-04  order saved before payment is requested
TC-05  "I've Paid" records a claim, never a settlement
TC-09  admin Verify works, audit stamped server-side
TC-10  admin Reject works, with a reason
TC-11  a customer CANNOT settle their own payment
TC-13  all three payment states read correctly
TC-14  two browsers, no refresh, updates arrive
TC-19  signup creates a profiles row via the trigger
```

— then this release is **READY FOR PRODUCTION**.

Until then, the honest statement is: **RC2 is code-complete, frozen, and verified
to the limit of what can be verified without your infrastructure.**

---

| Role | Name | Date | Signature |
|---|---|---|---|
| Prepared | | | |
| DBA sign-off | | | |
| QA sign-off | | | |
| Approved for production | | | |
