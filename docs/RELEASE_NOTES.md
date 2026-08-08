# Release Notes — RC2

| | |
|---|---|
| Release | **RC2** — Payment Verification + merged OTP improvements |
| Commit | `6eadb35` — *Merge upstream/main — teammate OTP fixes into Phase 3* |
| Branch | `feat/supabase-auth-otp` (pushed to `origin`) |
| Supersedes | RC1 (`8092424`) — see [RC1 → RC2](#rc1--rc2) |
| Requires | **Migrations 0001 – 0009**, applied in order |
| Status | Code complete and frozen. **Not yet released.** See [RC2_SUMMARY.md](RC2_SUMMARY.md) |

Rollback tags: `rc1-pre-merge` (`8092424`) · `rc1-docs` (`3904b80`)

---

## RC1 → RC2

RC1 was Phase 3 alone. RC2 adds the merge of `upstream/main`, bringing your
teammate's authentication and OTP work alongside it.

| | RC1 | RC2 |
|---|---|---|
| Commit | `8092424` | `6eadb35` |
| Migrations | 0001 – 0007 | **0001 – 0009** |
| Tests | 128 / 128 | 128 / 128 |
| Bundle (gzip) | 342.31 kB | **344.17 kB** |
| Scope | Payment verification | Payment verification **+ OTP, wallet, referral** |

RC2 is **not** a bugfix pass over RC1 — it contains new features from upstream.
The RC1 verification is superseded, not extended.

---

## Features

### Authentication and OTP *(merged from upstream)*

**Session restore across a reload.** A customer who refreshes, switches apps, or
is interrupted mid-verification no longer loses their signup. `AuthModal`
persists the pending state to `sessionStorage` under `trippys_pending_otp_state`
and restores it on open.

```
saved:   email · fullName · phone · hostelAddress · regStep · timestamp
window:  10 minutes (600000 ms) — older state is ignored
restores: the OTP screen, the register tab, and the remaining resend countdown
cleared:  on successful verification, via clearPendingOtpState()
```

The restored resend timer is recomputed from the saved timestamp
(`60 - elapsed`), so a customer who reloads at 40 seconds sees 20 remaining
rather than a fresh 60.

**OTP state persistence** is written at two points — after the registration form
is submitted and after an OTP is dispatched — so both entry paths survive a
reload.

**A resend cooldown that survives a reload.** `emailService` gained:

```ts
getRemainingOtpCooldownSeconds(email): number
recordOtpSentTimestamp(email): void
```

**Reorganised OTP surface** in `src/lib/emailService.ts`:

```ts
sendEmailVerificationOTP()   // signup
sendSignInOTP()              // passwordless sign-in
verifyEmailOTPCode()
sendPasswordResetOTP()       // now uses signInWithOtp, not a reset link
resetPasswordWithOTP()
```

Password reset moved to `signInWithOtp`, and Supabase error messages are
sanitised before display while the raw error is still logged to devtools — so a
customer sees something actionable and you can still diagnose it.

**Profile creation moved into the database.** The client no longer builds the
profile after OTP verification; the `handle_new_user_signup()` trigger does it.
See [Breaking changes](#breaking-changes).

### Payment verification (Phase 3)

Unchanged from RC1 and re-verified after the merge.

A UPI payment stays at **Pending Verification** until a team member confirms the
money arrived, then flips to **Payment Confirmed** or **Payment Rejected** on the
customer's screen with no refresh. Before Phase 3 there was no way to move an
order out of Pending Verification at all.

**Admin — Payment Verification tab** (between Live Orders and Kitchen):

Order ID · Customer · Phone · Amount · Payment Method · Transaction ID ·
Created Time · Payment Status, with **✅ Verify Payment** and **❌ Reject
Payment**.

- Cash orders excluded — there is no transfer to check
- Search across order number, name, phone, reference, amount
- Filters: Pending Verification (default) · Verified · Rejected · All UPI
- Pagination 10/page, page index clamped so a live update cannot blank the screen
- Rejection takes two deliberate steps, with an optional reason
- Created Time is **absolute**, so it matches a bank statement
- Table at `lg`+, cards below, all buttons ≥48 px

**Customer:**

| State | Label | Note |
|---|---|---|
| UPI, unsettled | Pending Verification | We are checking your transfer. |
| UPI, verified | **Payment Confirmed** | — |
| UPI, rejected | **Payment Rejected** | **Please contact the restaurant.** |
| COD, unsettled | Pay on delivery | — |
| COD, collected | Paid | — |

Toasts: **"Payment received and verified."** / **"Payment rejected. Please
contact the restaurant."** Nothing is announced while still pending — no decision
has been made, so there is no news.

### Realtime

- `orders` added to the `supabase_realtime` publication by 0007. On the deployed
  `phase2_schema.sql` database it was **never published**, so the client
  subscribed successfully and then received nothing — indistinguishable from
  "nobody has verified it yet."
- Subscription keyed on `user?.id` rather than `[]`, because `postgres_changes`
  is RLS-filtered against the token the socket joined with. A channel opened
  while anonymous stays anonymous.
- Unique channel topics per subscription, so a re-subscribe cannot collide with
  a channel still tearing down.
- The tracker now re-syncs on `payment_status`, `payment_rejection_reason` and
  `driver_name`, not just `status`.

### Wallet and referral *(merged from upstream)*

Migration **0009** adds to `public.profiles`:

- `wallet_balance` — defaults to `0.00`
- `referral_code` — generated per signup, format `TRIPPY-XXXX-1234`
- `phone_exists(text)` RPC, so signup can check phone availability without
  tripping an RLS 401

`UserProfile` gains `wallet_balance?` and `referral_code?`.

> **No application feature consumes the wallet yet.** The columns and the code
> generation exist; spending, crediting and the 25% OFF referral redemption are
> not wired into checkout. Treat this as schema groundwork, not a shipped
> feature.

---

## Merge conflict resolutions

The merge touched 7 files. **Only one conflicted** — `AuthModal.tsx`, in two
hunks. `types/index.ts`, `validation.ts` and `CustomerDashboardModal.tsx`
auto-merged.

Both hunks were resolved by reading them, not by a strategy flag.

### Hunk 1 — OTP state restore · **kept both sides**

Theirs added the `sessionStorage` restore effect; ours was a comment explaining
why the resend countdown is driven by the timer alone. No actual disagreement, so
both survive.

> **`-X ours` would have been wrong here.** It takes our side of every
> conflicting hunk, which would have silently deleted the OTP restore effect —
> part of the very OTP work being merged. The merge would have reported success
> and quietly shipped less than you asked for.

### Hunk 2 — account creation after OTP · **took theirs**

Ours called `signUp()`, built a `UserProfile`, fired `onRegisterSuccess` and
closed the modal — sitting **after** the `try/catch`, duplicating logic their
version already contained. Theirs additionally calls `clearPendingOtpState()`.

Verified after resolution: **one** `newCustomer` construction remains, not two.

### Migration numbering collision · **renumbered**

Upstream shipped `0006_fix_profiles_rls.sql` and
`0007_profiles_wallet_referral.sql`, colliding with our
`0006_customer_order_updates.sql` and `0007_payment_verification.sql`.

**Git reported no conflict** — the filenames differ, so it saw four unrelated new
files and merged them cleanly. You would have been left with two `0006`s and two
`0007`s and no defined apply order.

Theirs were renumbered to **0008** and **0009**, running after ours. That
ordering was chosen so the Phase 3 documentation and the verification harness
keep referring to the right files.

---

## Breaking changes

### 1. Account creation moved from the client to the database

```tsx
// before — client built the profile after verifyOtp
const created = await signUp({ full_name, phone, hostel_address, email, password });
onRegisterSuccess(newCustomer);

// after — handle_new_user_signup() creates it on INSERT into auth.users
```

**Consequence:** if the `on_auth_user_created` trigger is not installed on your
database, **signups now produce an auth user with no profile row and no role.**
Under RC1 the client would have papered over it. See
[Deployment notes](#deployment-notes) — this is the single most important check
in this release.

### 2. `PaymentStatus` gains `'rejected'`

```ts
type PaymentStatus = 'pending' | 'completed' | 'rejected' | 'failed' | 'refunded';
```

Any exhaustive `switch` outside this repository must handle it.

### 3. `OrderProgressTimeline` prop changed

```tsx
<OrderProgressTimeline status={order.status} />   // before
<OrderProgressTimeline order={order} />            // after
```

### 4. Verified UPI orders read "Payment Confirmed", not "Paid"

Cash collected at the door is still *Paid*. No database value changed meaning.

### 5. Nothing else

No API removed, no table dropped, no column renamed, no existing row rewritten.

---

## Database changes

### Migration order — 0001 to 0009

| # | File | Adds |
|---|---|---|
| 0001 | `core_schema` | Tables, constraints, indexes |
| 0002 | `rls_policies` | RLS + `is_team_member()`, `current_role_name()` |
| 0003 | `auth_triggers` | **`on_auth_user_created` on `auth.users`** → `handle_new_user_signup()` |
| 0004 | `anon_lookup_rpcs` | `email_exists()`, `lookup_login_email()` |
| 0005 | `signup_trigger_telemetry` | Signup telemetry |
| 0006 | `customer_order_updates` | Customer UPDATE policy + order trigger |
| **0007** | **`payment_verification`** | **`'rejected'`, audit columns, indexes, Realtime, payment trigger** |
| **0008** | `fix_profiles_rls` *(upstream, renumbered)* | Profiles grants + policies, privileged-column trigger |
| **0009** | `profiles_wallet_referral` *(upstream, renumbered)* | `wallet_balance`, `referral_code`, `phone_exists()`, replaces `handle_new_user_signup()` |

`0007_payment_verification_down.sql` reverses 0007 only.

### The dependency that is easy to miss

**0009 replaces `handle_new_user_signup()` but does not create the trigger that
calls it.** That trigger — `on_auth_user_created` on `auth.users` — comes from
**0003**.

```
0003  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
        EXECUTE FUNCTION public.handle_new_user_signup();
0009  CREATE OR REPLACE FUNCTION public.handle_new_user_signup()   ← function only
```

If you apply 0009 without 0003 having run, you get a correct function that
**nothing ever calls**, and every signup silently produces no profile. Combined
with breaking change 1, that is a broken signup flow with no error message.

This matters because your deployed database was built from `phase2_schema.sql`,
which contains none of the numbered migrations.

### Two incompatible schemas

`supabase/` still carries two definitions of the same tables:

| | `migrations/0001_core_schema.sql` | `phase2_schema.sql` |
|---|---|---|
| `orders.id` | `text` | `uuid` |
| `payment_status` | `text` + CHECK | **ENUM** |
| `status` | `text` + CHECK | **ENUM** |
| `is_deleted` | absent | present |
| line items | `orders.items` jsonb | `order_items` table |

`src/services/supabase/orders.ts` queries `order_items` and filters `is_deleted`,
so **the deployed database is the `phase2_schema.sql` shape.** Migration 0007
detects which it is running against and takes the matching path. Migrations 0008
and 0009 touch only `profiles`, which is compatible with both.

---

## Bug fixes

**From Phase 3**

- The tracker compared only `status`, so a verification arriving while the
  customer had it open changed nothing on screen.
- The checkout confirmation rendered `placedOrder`, a snapshot from the insert
  that never updates. It now reads the live row.
- `orders` was never published to Realtime on the deployed schema.
- Half of 0006's customer-cancel policy matched nothing: it reads
  `status IN ('pending','accepted')`, but `'accepted'` was not a legal value in
  either base schema. 0007 widens the vocabulary.
- The row→`Order` mapping existed in **three** copies, so a new column added to
  one silently went missing from the others. Consolidated into `mapOrderRow`.

**Caught by the migration harness** — none visible by reading the SQL:

1. Rollback could not narrow the enum — a partial index predicate bound
   `'pending'` to the old type. Index drops now precede the type swap.
2. Rollback could not narrow `order_status` — a live policy referenced the
   column. It is now dropped up front and recreated at the end.
3. **The trigger's maintenance bypass was inverted.** It used
   `current_user NOT IN ('anon','authenticated')`, but inside a `SECURITY
   DEFINER` function `current_user` is the *function owner*, not the caller — so
   the condition was always true and **the "only an admin can verify" guard was
   disabled for everyone.** Now keyed off `request.jwt.claims`, which PostgREST
   sets per request and a direct database session never does.

**From the merge**

- OTP verification no longer lost on refresh (session restore).
- Password reset uses `signInWithOtp` instead of a reset link.
- Profiles RLS 401 / 422 on registration fixed by 0008.
- `handle_new_user_signup()` wrapped in an exception block, so a profile-insert
  failure warns rather than aborting the signup transaction.
- Signup can check phone availability via `phone_exists()` without a 401.

---

## Security

The rule Phase 3 exists to enforce — **nothing marks a payment completed except a
person deciding it is** — holds in three independent places:

| Layer | Guarantee |
|---|---|
| Database trigger | A non-team member moving `payment_status` off `'pending'` raises `check_violation`. Client writes to audit columns refused. |
| RLS | UPDATE on `orders` restricted to team members and, narrowly, the owning customer. |
| Application | `'completed'` / `'rejected'` written only by `verifyPayment` / `rejectPayment`. |

`payment_verified_at` and `payment_verified_by` are **never sent by the client** —
the trigger stamps them from `auth.uid()`.

Both service methods guard on `payment_status = 'pending'` **in the WHERE
clause**, so two admins pressing Verify produces one settlement and one *"already
reviewed"*.

**Re-verified after the merge:** the payment trigger survives 0008 and 0009 on
both schema shapes.

Migration 0008 adds `protect_privileged_profile_columns()`, blocking a customer
from mutating their own `role`, `is_approved` or `account_status`.

**Verified clean:** no Brevo or SMTP credential anywhere in `src/` — SMTP is
dashboard-only, as it must be, since a `VITE_*` key is inlined into the bundle.
`DEV_TEST_CREDENTIALS` is dead code, never accepted by any auth path, and
tree-shaken out of `dist/`. *But* if "Test Phone Numbers" are configured in the
Supabase Auth dashboard, those static codes work in production regardless.

---

## Verification

### Build

```
tsc --noEmit          clean
node:test             128 / 128 pass, 0 fail
npm run build         ✓ built in 2m 9s
```

| Asset | Raw | gzip |
|---|---|---|
| `index-*.js` | 1,288.80 kB | **344.17 kB** |
| `jspdf.es.min-*.js` | 390.77 kB | 128.82 kB |
| `html2canvas.esm-*.js` | 202.38 kB | 48.04 kB |
| `index.es-*.js` | 159.76 kB | 53.56 kB |
| `index-*.css` | 82.15 kB | 13.05 kB |

**+1.86 kB gzip over RC1** for the merged OTP work. Vite warns above 500 kB raw;
not a blocker — the three heaviest dependencies are code-split and load only when
a receipt is generated.

### Migrations

`./supabase/verify/run_migration_checks.sh` builds each schema from scratch on a
real PostgreSQL, applies the chain, asserts behaviour, rolls back, re-applies.

```
== A.  enum schema (phase2_schema.sql)   apply · pre-existing row untouched · re-apply
== A2. 27 behavioural assertions         all PASS
== A3. rollback                          enum restored, audit columns dropped
== A4. re-apply after rollback           forward migration is repeatable
== B.  CHECK schema (0001–0006)          apply · re-apply · widen · roll back · narrow
== C.  full chain with 0008 + 0009       both schemas:
         apply 0008 / 0009 · re-apply (idempotent)
         handle_new_user_signup() present
         payment verification trigger still installed
RESULT: all migration checks passed
```

Section C is new in RC2. It proves the merged migrations apply in order on both
schema shapes and that **nothing upstream added undoes the Phase 3 payment
guard.**

Assertions include: `'rejected'` storable · all four legacy values still insert ·
garbage still refused · enum label order preserved · audit column types and FK ·
pre-existing indexes intact · every index valid · the app's three query shapes
run · every status value storable · **customer cannot mark their own payment
completed** · **cannot set it to rejected** · **cannot forge the audit trail** ·
admin can verify · `payment_verified_by` stamped server-side · admin can reject
with a reason · RLS blocks a stranger · `orders` published to Realtime.

### Test suites

| Suite | Tests |
|---|---|
| `orderStatus.test.ts` | 23 |
| `validation.test.ts` | 21 |
| `checkout.test.ts` | 14 |
| `otpService.test.ts` | 5 |
| `authErrors`, `exportUtils`, `geoUtils`, `initialData`, `sound` | remainder |
| **Total** | **128** |

**Automated tests cover pure logic only.** There is no component or E2E harness.
The [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) has **not been executed** and is a
release gate.

---

## Deployment notes

### Order of operations

```
1. Merge to main
2. Back up the database                    ← record the timestamp
3. Apply migrations 0001 → 0009 in order
4. Verify after each                       ← especially 0003, 0007, 0009
5. Enable Realtime in the dashboard
6. Deploy the application
7. Smoke test, then the two-browser realtime test
```

**Migrations before application.** The reverse leaves the admin screen writing a
value the database cannot store, and signup creating no profile.

### The three checks that matter most

```sql
-- 1. Is the signup trigger wired? Breaking change 1 depends on it entirely.
SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
-- expect: on_auth_user_created

-- 2. Does the function it calls exist?
SELECT to_regprocedure('public.handle_new_user_signup()');
-- expect: non-null

-- 3. Is the payment guard installed?
SELECT tgname, tgenabled FROM pg_trigger
 WHERE tgrelid = 'public.orders'::regclass
   AND tgname = 'trg_enforce_customer_order_update';
-- expect: one row, tgenabled = 'O'
```

### Environment

```
VITE_SUPABASE_URL          https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY     eyJhbGci...   (JWT anon key, NOT sb_publishable_...)
```

**`VITE_*` values are inlined at build time.** Changing them in the hosting
dashboard does nothing until you **redeploy**. The app detects missing values,
placeholders, and a publishable-key-instead-of-JWT, and names the exact problem
on screen.

### Hosting

Both `vercel.json` and `netlify.toml` are present — confirm which is
authoritative. Both configure the SPA rewrite, without which a hard refresh
404s. Netlify pins Node 20; Vercel pins nothing. Built here on Node 24.11.1.

### Realtime

0007 adds `orders` to the publication, but **the Realtime service is a project
setting** and cannot be enabled from SQL: Dashboard → Database → Replication.

---

## Known limitations

1. **Wallet and referral are schema-only.** Columns and code generation exist;
   nothing spends, credits, or redeems. The 25% OFF referral is not wired into
   checkout.
2. **0008 and 0009 carry stale internal headers** reading `0006` and `0007` from
   before the renumber. Cosmetic — the filenames are authoritative — but it will
   confuse anyone reading the file top-down.
3. **Two incompatible schema files** in `supabase/`. Every migration must be
   written twice until reconciled, as 0007 was.
4. **`initialOrders` seeds four example orders** with invented names as a
   pre-Supabase fallback. Flagged since Phase 1.
5. **Order numbers can collide under concurrency.** `nextOrderNumber` reads the
   client's list; two simultaneous checkouts can both compute `#1008`. Needs a
   database sequence.
6. **Nothing writes `'accepted'` / `'preparing'` / `'ready'`.** The database
   accepts them and the timeline renders them, but Kitchen still emits the legacy
   vocabulary. The mapping handles both, so no regression.
7. **A rejected payment does not cancel the order.** Deliberate — the customer
   may still pay another way.
8. **No alert when the verification queue goes unworked.** An unreviewed UPI
   order leaves a paying customer at *Pending Verification* indefinitely. A
   monitoring query is provided; automation is not.
9. **`sessionStorage` OTP restore does not survive a browser restart** or a
   different tab. That is the intended trade-off — `localStorage` would leave
   half-finished signup details on a shared device.

---

## Files

**Added in RC2**

```
supabase/migrations/0008_fix_profiles_rls.sql          (upstream, renumbered)
supabase/migrations/0009_profiles_wallet_referral.sql  (upstream, renumbered)
RC2_SUMMARY.md
```

**Added in RC1, carried forward**

```
src/components/admin/PaymentVerificationView.tsx
supabase/migrations/0007_payment_verification.sql
supabase/migrations/0007_payment_verification_down.sql
supabase/verify/{run_migration_checks.sh,00_supabase_stub.sql,verify_phase2.sql}
DATABASE_MIGRATION_0007.md   PHASE3_PAYMENT_VERIFICATION.md
DEPLOYMENT_CHECKLIST.md      GO_LIVE_CHECKLIST.md
MANUAL_TEST_PLAN.md          ROLLBACK_PLAN.md
RELEASE_NOTES.md             RELEASE_CHECKLIST.md
```

**Modified by the merge**

```
src/components/common/AuthModal.tsx            OTP session restore, signup flow
src/context/AuthContext.tsx                    auth flow
src/lib/emailService.ts                        OTP send/verify/cooldown
src/lib/useAntiFraudRegistration.ts            registration telemetry
src/lib/validation.ts                          validation additions
src/types/index.ts                             wallet_balance, referral_code
src/components/customer/CustomerDashboardModal.tsx
supabase/verify/run_migration_checks.sh        section C
```

**Untouched throughout Phase 3:** Kitchen, Reports, Analytics, Driver.
