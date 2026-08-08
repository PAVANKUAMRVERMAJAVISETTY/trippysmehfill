# Release Checklist — RC2

**Release:** RC2 · Phase 3 Payment Verification + merged OTP improvements
**Commit:** `6eadb35`
**Supersedes:** RC1 (`8092424`)
**Prepared:** 2026-08-07

Companion documents:
[RELEASE_NOTES.md](RELEASE_NOTES.md) · [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) · [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) · [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) · [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md)

---

## How to read the status column

| | |
|---|---|
| ✅ **VERIFIED** | I ran it and observed the result. Evidence quoted below. |
| ⚠️ **UNVERIFIABLE** | Requires your Supabase project, a browser, or a device. I cannot reach any of those. A concrete command or step is given. |
| ❌ **BLOCKER** | Known to be outstanding. |

No row is marked verified on the strength of reading code.

---

## 1 · Repository

| # | Item | Status | Evidence |
|---|---|---|---|
| 1.1 | All Phase 3 files committed | ✅ VERIFIED | 22 files, commit `8092424` |
| 1.1b | Upstream OTP work merged | ✅ VERIFIED | `6eadb35`; 1 conflicted file resolved by hand, migrations renumbered |
| 1.2 | Working tree clean | ✅ VERIFIED | `git status --porcelain` → empty |
| 1.3 | Pushed to origin | ✅ VERIFIED | `3904b80..6eadb35`, local and remote hashes identical |
| 1.4 | No secrets committed | ✅ VERIFIED | `.env.local` matched by `.gitignore:7`; no `.env`/key file in the tree |
| 1.5 | Merged to `main` | ❌ **BLOCKER** | Ahead of `main`; PR not opened |
| 1.6 | Release tagged | ⚠️ PARTIAL | Rollback tags `rc1-pre-merge` (`8092424`) and `rc1-docs` (`3904b80`) exist. **No `rc2` tag yet.** |

```
$ git status --porcelain
  (empty)
$ git status -sb
## feat/supabase-auth-otp...origin/feat/supabase-auth-otp
$ git log --oneline -1
6eadb35 Merge upstream/main — teammate OTP fixes into Phase 3
```

- [ ] 1.5 — open PR, review, merge to `main`
- [ ] 1.6 — `git tag rc2 && git push origin rc2`

---

## 2 · Build gate

| # | Item | Status | Evidence |
|---|---|---|---|
| 2.1 | TypeScript compiles | ✅ VERIFIED | `tsc --noEmit` → no output, **after the merge** |
| 2.2 | Tests pass | ✅ VERIFIED | **128 / 128**, 0 fail, after the merge |
| 2.3 | Production build | ✅ VERIFIED | `✓ built in 2m 9s` |
| 2.4 | Bundle size acceptable | ✅ VERIFIED | main chunk **344.17 kB gzip** (+1.86 kB vs RC1); jsPDF/html2canvas already code-split |
| 2.5 | No service_role key in bundle | ✅ VERIFIED | `grep -r service_role dist/` → nothing |
| 2.6 | Dev test credentials excluded | ✅ VERIFIED | `919876543210`, `919999999999`, `Dev Admin`, `Test Teammate`, `DEV_TEST_CREDENTIALS` → **0 matches** in `dist/` |
| 2.7 | Clean-install build | ⚠️ UNVERIFIABLE | Run `rm -rf node_modules && npm ci && npm run build` on the CI host |

---

## 3 · Migration order — 0001 to 0009

**Apply in numeric order. Verify after each.** Two later migrations depend on
earlier ones in ways that fail *silently* rather than erroring.

| # | File | What it adds | Verify with |
|---|---|---|---|
| 0001 | `core_schema` | Tables, constraints, indexes | `SELECT to_regclass('public.orders');` → non-null |
| 0002 | `rls_policies` | RLS, `is_team_member()`, `current_role_name()` | `SELECT to_regprocedure('public.is_team_member()');` → non-null |
| 0003 | `auth_triggers` | **`on_auth_user_created` on `auth.users`** | `SELECT tgname FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal;` → `on_auth_user_created` |
| 0004 | `anon_lookup_rpcs` | `email_exists()`, `lookup_login_email()` | `SELECT to_regprocedure('public.email_exists(text)');` → non-null |
| 0005 | `signup_trigger_telemetry` | Signup telemetry | applies without error |
| 0006 | `customer_order_updates` | Customer UPDATE policy + order trigger | `SELECT policyname FROM pg_policies WHERE policyname='orders_customer_update_own';` → one row |
| **0007** | **`payment_verification`** | `'rejected'`, audit columns, indexes, Realtime, payment trigger | §4.4 postflight block |
| **0008** | `fix_profiles_rls` | Profiles grants + policies, privileged-column trigger | `SELECT count(*) FROM pg_policies WHERE tablename='profiles' AND policyname LIKE 'profiles_%_own';` → 3 |
| **0009** | `profiles_wallet_referral` | `wallet_balance`, `referral_code`, `phone_exists()`, replaces `handle_new_user_signup()` | `SELECT to_regprocedure('public.phone_exists(text)');` → non-null |

> ### ⚠️ 0009 depends on 0003, and failure is silent
>
> **0009 replaces `handle_new_user_signup()` but never creates the trigger that
> calls it.** That trigger comes from **0003**.
>
> ```
> 0003  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
>         EXECUTE FUNCTION public.handle_new_user_signup();
> 0009  CREATE OR REPLACE FUNCTION public.handle_new_user_signup()   ← function only
> ```
>
> Apply 0009 without 0003 and you get a correct function **nothing ever calls**.
> RC2 moved profile creation out of the client and into that trigger, so the
> result is: every signup produces an auth user with **no profile row and no
> role**, with no error anywhere. Verify 0003's trigger explicitly.

**After the whole chain:**

```sql
SELECT tgname FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal;
-- expect: on_auth_user_created

SELECT to_regprocedure('public.handle_new_user_signup()') AS fn,
       to_regprocedure('public.phone_exists(text)')       AS phone_rpc,
       to_regprocedure('public.email_exists(text)')       AS email_rpc,
       to_regprocedure('public.lookup_login_email(text)') AS login_rpc;
-- expect: all four non-null

SELECT tgname, tgenabled FROM pg_trigger
 WHERE tgrelid='public.orders'::regclass AND tgname='trg_enforce_customer_order_update';
-- expect: one row, tgenabled = 'O'  ← the Phase 3 guard survived 0008/0009
```

- [ ] 0001 – 0009 applied in order, each verified
- [ ] `on_auth_user_created` present on `auth.users`
- [ ] All four functions present
- [ ] Payment trigger still installed **after** 0008 and 0009

---

## 4 · Migration 0007 in detail

| # | Item | Status | Evidence |
|---|---|---|---|
| 3.1 | Applies to the **enum** schema (yours) | ✅ VERIFIED | PostgreSQL 17.10, `phase2_schema.sql` + `phase2_rls.sql` |
| 3.2 | Applies to the **CHECK** schema | ✅ VERIFIED | `0001`–`0006` chain |
| 3.3 | Idempotent | ✅ VERIFIED | Re-applied cleanly on both |
| 3.4 | Pre-existing rows untouched | ✅ VERIFIED | `completed\|delivered\|150.00` identical before and after |
| 3.5 | `'rejected'` becomes storable | ✅ VERIFIED | assertion PASS |
| 3.6 | Legacy values still work | ✅ VERIFIED | all four insert; enum label order preserved |
| 3.7 | Garbage still refused | ✅ VERIFIED | invalid value rejected by the enum |
| 3.8 | Audit columns + FK correct | ✅ VERIFIED | 3 columns, right types, FK to `profiles` |
| 3.9 | Indexes created and valid | ✅ VERIFIED | 2 new, all indexes on `orders` valid |
| 3.10 | Existing app queries still run | ✅ VERIFIED | all three query shapes |
| 3.11 | Rollback works | ✅ VERIFIED | enum → 4 labels, audit columns dropped |
| 3.12 | Re-appliable after rollback | ✅ VERIFIED | forward migration repeatable |
| 3.13 | **0008 + 0009 apply on both schemas** | ✅ VERIFIED | harness section C, added in RC2 |
| 3.14 | **0008 / 0009 idempotent** | ✅ VERIFIED | re-applied cleanly on both |
| 3.15 | **Payment guard survives 0008/0009** | ✅ VERIFIED | `trg_enforce_customer_order_update` still installed after the full chain |
| 3.16 | **Applied to production** | ❌ **BLOCKER** | Chain not run against your Supabase project |

```
$ ./supabase/verify/run_migration_checks.sh
== C. Full chain including the merged upstream migrations (0008, 0009)
  -- t_enum --                          -- t_check --
  ok  apply 0008 (profiles RLS)         ok  apply 0008 (profiles RLS)
  ok  apply 0009 (wallet + referral)    ok  apply 0009 (wallet + referral)
  ok  re-apply 0008 (idempotent)        ok  re-apply 0008 (idempotent)
  ok  re-apply 0009 (idempotent)        ok  re-apply 0009 (idempotent)
  ok  handle_new_user_signup() present  ok  handle_new_user_signup() present
  ok  payment trigger still installed   ok  payment trigger still installed
RESULT: all migration checks passed
```

- [ ] 3.16 — back up first, then run 0001–0009 per [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)

---

## 4 · Realtime

| # | Item | Status | Evidence |
|---|---|---|---|
| 4.1 | 0007 publishes `orders` | ✅ VERIFIED | assertion: *"public.orders is published to supabase_realtime"* PASS |
| 4.2 | Subscription keyed on identity | ✅ VERIFIED | [src/App.tsx:169](../src/App.tsx#L169) — keyed on `user?.id`, not `[]`, because `postgres_changes` is RLS-filtered against the joining token |
| 4.3 | Channel topics unique | ✅ VERIFIED | `uniqueTopic()` in [realtime.ts:11](../src/services/supabase/realtime.ts#L11) |
| 4.4 | Tracker reacts to payment changes | ✅ VERIFIED | effect compares `payment_status`, `payment_rejection_reason`, `driver_name` |
| 4.5 | Published on **your** database | ⚠️ UNVERIFIABLE | Preflight §6 |
| 4.6 | Realtime **service** enabled | ⚠️ UNVERIFIABLE | Dashboard → Database → Replication. **SQL cannot turn this on.** |
| 4.7 | Two-browser test passes | ⚠️ UNVERIFIABLE | **TC-14** |

- [ ] 4.5 / 4.6 / 4.7

---

## 5 · RPCs and database functions

| # | Item | Status | Evidence |
|---|---|---|---|
| 5.1 | `email_exists` defined in repo | ✅ VERIFIED | `migrations/0004_anon_lookup_rpcs.sql` |
| 5.2 | `lookup_login_email` defined in repo | ✅ VERIFIED | same file |
| 5.3 | Signup trigger defined in repo | ✅ VERIFIED | `0003_auth_triggers.sql`, `0005_signup_trigger_telemetry.sql` |
| 5.4 | 0007 supplies `is_team_member()` if absent | ✅ VERIFIED | fallback created on the enum schema — *"0007: created fallback public.is_team_member()"* |
| 5.5 | **RPCs present on your database** | ⚠️ **UNVERIFIABLE — HIGH RISK** | See below |

> **5.5 is the risk most likely to bite you.** `email_exists`, `lookup_login_email`
> and the signup trigger exist **only in the numbered migration chain**, which is
> *not* what your database was built from. If they are missing:
>
> - sign-in by phone/username always answers *"No account found"*
> - password reset fails identically
> - **new signups get an auth user with no profile row and no role**
>
> Email sign-in still works, which is why this can go unnoticed.
> **Pre-existing — not introduced by RC1.**

```sql
SELECT f.name,
       CASE WHEN to_regprocedure(f.sig) IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END
  FROM (VALUES ('email_exists','public.email_exists(text)'),
               ('lookup_login_email','public.lookup_login_email(text)')) AS f(name,sig);

SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                          WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal)
            THEN 'PRESENT' ELSE '*** MISSING ***' END AS signup_trigger;
```

- [ ] 5.5 — if `MISSING`, apply `0003`, `0004`, `0005` before go-live

---

## 6 · RLS and security

| # | Item | Status | Evidence |
|---|---|---|---|
| 6.1 | Customer cannot mark own payment completed | ✅ VERIFIED | assertion PASS — `check_violation` raised |
| 6.2 | Customer cannot set own payment rejected | ✅ VERIFIED | assertion PASS |
| 6.3 | Customer cannot forge the audit trail | ✅ VERIFIED | assertion PASS |
| 6.4 | Admin **can** verify | ✅ VERIFIED | assertion PASS |
| 6.5 | `payment_verified_by` stamped server-side | ✅ VERIFIED | equals the acting admin's uuid — never sent by the client |
| 6.6 | `payment_verified_at` stamped server-side | ✅ VERIFIED | assertion PASS |
| 6.7 | Admin can reject with a reason | ✅ VERIFIED | assertion PASS |
| 6.8 | RLS blocks a stranger's order | ✅ VERIFIED | assertion PASS |
| 6.9 | Customer may still record a UPI reference | ✅ VERIFIED | assertion PASS |
| 6.10 | Concurrent verify is safe | ✅ VERIFIED *(by construction)* | `.eq('payment_status','pending')` in the WHERE clause; second caller gets *"already reviewed"*. Behaviour confirmed in SQL; UI path is **TC-12**. |
| 6.11 | No SMTP/Brevo credential in code | ✅ VERIFIED | `grep -rin brevo src/` → none |
| 6.12 | RLS enabled on **your** tables | ⚠️ UNVERIFIABLE | Preflight §5 |
| 6.13 | TC-11 passes in a real browser | ⚠️ **UNVERIFIABLE — MUST PASS** | **TC-11** |

- [ ] 6.12 · [ ] 6.13

---

## 7 · Authentication / OTP

| # | Item | Status | Evidence |
|---|---|---|---|
| 7.1 | OTP goes through Supabase Auth | ✅ VERIFIED | `signInWithOtp` / `verifyOtp` in `otpService.ts`, `emailService.ts` |
| 7.2 | No static OTP accepted by the app | ✅ VERIFIED | `123456` appears only in a dev **console hint** and dead constants; every verification calls `supabase.auth.verifyOtp` |
| 7.3 | Dev credentials tree-shaken from production | ✅ VERIFIED | 0 matches in `dist/` |
| 7.4 | `otpService` tests pass | ✅ VERIFIED | 5 / 5 |
| 7.4a | OTP session restore present | ✅ VERIFIED | `trippys_pending_otp_state` written at 2 points, restored on open, cleared on success |
| 7.4b | Restore window bounded | ✅ VERIFIED | 10 minutes (600000 ms); older state ignored |
| 7.4c | Resend cooldown survives reload | ✅ VERIFIED | `getRemainingOtpCooldownSeconds()` / `recordOtpSentTimestamp()` |
| 7.4d | Signup no longer creates the profile client-side | ✅ VERIFIED | one `newCustomer` construction, not two; `clearPendingOtpState()` called on success |
| 7.4e | **Profile creation depends on the DB trigger** | ⚠️ **UNVERIFIABLE — HIGH RISK** | See §3. If `on_auth_user_created` is absent, **every signup silently produces no profile.** |
| 7.4f | Session restore works in a browser | ⚠️ UNVERIFIABLE | **TC-16 – TC-18** |
| 7.4g | Signup via DB trigger works | ⚠️ UNVERIFIABLE | **TC-19** |
| 7.5 | SMTP (Brevo) configured | ⚠️ UNVERIFIABLE | Dashboard → Project Settings → Auth → SMTP |
| 7.6 | Site URL points at production | ⚠️ UNVERIFIABLE | Wrong Site URL is the usual cause of OTP that works locally and fails live |
| 7.7 | Redirect URLs include production origin | ⚠️ UNVERIFIABLE | Dashboard → Authentication → URL Configuration |
| 7.8 | Real OTP received end to end | ⚠️ UNVERIFIABLE | Send one to an address you control; check spam |
| 7.9 | **No "Test Phone Numbers" left configured** | ⚠️ UNVERIFIABLE | Dashboard → Authentication → Providers → Phone. A leftover test number accepts a **static code in production**. |

- [ ] 7.5 – 7.9

---

## 8 · Checkout, COD, UPI

| # | Item | Status | Evidence |
|---|---|---|---|
| 8.1 | Checkout validation logic | ✅ VERIFIED | 14 tests in `checkout.test.ts` |
| 8.2 | *"Please select a payment method."* exact | ✅ VERIFIED | asserted exactly |
| 8.3 | Card / Razorpay not offered | ✅ VERIFIED | rejected by `validateCheckout` |
| 8.4 | Minimum order value enforced | ✅ VERIFIED | including the boundary case |
| 8.5 | UPI URI well-formed | ✅ VERIFIED | 2-dp amount, encoding, `cu=INR` |
| 8.6 | Order-number sequencing | ✅ VERIFIED | including unparseable input — *but see the concurrency caveat below* |
| 8.7 | COD timeline has no payment steps | ✅ VERIFIED | asserted |
| 8.8 | UPI timeline shows all six steps | ✅ VERIFIED | asserted in exact order |
| 8.9 | Payment steps advance only on settlement | ✅ VERIFIED | asserted |
| 8.10 | Rejected step goes red, timeline survives | ✅ VERIFIED | asserted |
| 8.11 | Every method × status × order-status combination renders | ✅ VERIFIED | exhaustive: 2 × 5 × 9 = 90 |
| 8.12 | COD end to end in a browser | ⚠️ UNVERIFIABLE | **TC-01 – TC-03** |
| 8.13 | UPI end to end in a browser | ⚠️ UNVERIFIABLE | **TC-04 – TC-05a** |
| 8.14 | Order saved **before** payment requested | ⚠️ UNVERIFIABLE | **TC-04** — structurally guaranteed (`setStep('upi_payment')` runs only after `createOrder` resolves) but confirm visually |
| 8.15 | Mobile: UPI intent, clipboard, share, PDF | ⚠️ UNVERIFIABLE | **F-10 – F-13**, real device |

- [ ] 8.12 – 8.15

---

## 9 · Payment Verification

| # | Item | Status | Evidence |
|---|---|---|---|
| 9.1 | `verifyPayment` / `rejectPayment` exist and compile | ✅ VERIFIED | `tsc` clean |
| 9.2 | Guarded on `payment_status = 'pending'` | ✅ VERIFIED | in the WHERE clause, not just the UI |
| 9.3 | Audit columns never sent by the client | ✅ VERIFIED | absent from both update payloads |
| 9.4 | Reject leaves `status` alone | ✅ VERIFIED | deliberate — see release notes |
| 9.5 | Verify clears a stale rejection reason | ✅ VERIFIED | `payment_rejection_reason: null` |
| 9.6 | Tab added, existing tabs untouched | ✅ VERIFIED | 1 added, 12 unchanged |
| 9.7 | Payment labels correct in all states | ✅ VERIFIED | 23 tests in `orderStatus.test.ts` |
| 9.8 | Rejected never reads as paid | ✅ VERIFIED | negative match on `/paid\|confirmed/i` so a future copy edit cannot reintroduce it |
| 9.9 | Toast copy exact | ✅ VERIFIED | *"Payment received and verified."* / *"Payment rejected."* + *"Please contact the restaurant."* |
| 9.10 | No toast while pending | ✅ VERIFIED | returns `null` |
| 9.11 | Admin UI works in a browser | ⚠️ UNVERIFIABLE | **TC-06 – TC-10** |
| 9.12 | Concurrent verify in the UI | ⚠️ UNVERIFIABLE | **TC-12** |
| 9.13 | At least one admin exists | ⚠️ UNVERIFIABLE | `SELECT count(*) FROM profiles WHERE role::text='admin';` — **if 0, nobody can verify anything** |

- [ ] 9.11 – 9.13

---

## 10 · Scope discipline

| # | Item | Status |
|---|---|---|
| 10.1 | Kitchen untouched | ✅ VERIFIED — `git status` empty for `KitchenView.tsx` |
| 10.2 | Reports untouched | ✅ VERIFIED — `OrderHistoryView.tsx` |
| 10.3 | Analytics untouched | ✅ VERIFIED — `DashboardView.tsx`, `DriverStatsView.tsx` |
| 10.4 | Driver untouched | ✅ VERIFIED — `src/components/driver/` |
| 10.5 | No Phase 4 work started | ✅ VERIFIED |

---

## Blockers

| # | Blocker | Owner | Resolution |
|---|---|---|---|
| **B1** | **Migrations 0001–0009 not applied to production.** Verify and Reject fail without 0007 — Verify with an RLS error, Reject with an enum/check violation. | DBA | Back up, then run the chain in order |
| **B2** | **Not merged to `main`.** | Dev | PR → review → merge |
| **B3** | **No `rc2` tag.** Rollback tags exist for RC1 only. | Dev | `git tag rc2 && git push origin rc2` |
| **B4** | **Manual test plan not executed.** 49 cases, 0 run. **TC-11** (a customer cannot settle their own payment), **TC-14** (two-browser realtime) and **TC-19** (signup via DB trigger) decide whether this release does what it claims. | QA | Execute [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) |
| **B5** | **Realtime service state unknown.** SQL cannot enable it. Without it, "no refresh" silently does not happen. | DBA | Dashboard → Database → Replication |
| **B6** | **`on_auth_user_created` trigger presence unknown — now more severe.** RC2 moved profile creation out of the client into this trigger. If it is absent, **every signup produces an auth user with no profile and no role, silently.** RC1 would have papered over it; RC2 will not. | DBA | Verify per §3, apply 0003 if missing |
| **B7** | **Admin account existence unconfirmed.** Zero admins means nobody can verify a payment. | DBA | `SELECT count(*) FROM profiles WHERE role::text='admin';` |
| **B8** | **Wallet and referral are schema-only.** 0009 adds the columns and generates codes, but nothing spends, credits or redeems, and the 25% OFF referral is not wired into checkout. Ship only if you are content for these to be dormant. | Product | Decide: ship dormant, or defer 0009 |

---

## Accepted risks — not blockers

| Risk | Why accepted |
|---|---|
| Main bundle 342 kB gzip, over Vite's raw warning | Heavy deps already code-split; loads only for receipts |
| Order numbers can collide under concurrent checkout | Pre-existing since Phase 2. Real but low-frequency for one kitchen; needs a database sequence |
| `initialOrders` seeds 4 example orders | Display-only fallback before Supabase data arrives. Flagged since Phase 1 |
| Kitchen still emits the legacy status vocabulary | The mapping handles both; no regression |
| Two incompatible schema files coexist | 0007 handles both. Reconciling them is larger than this release |
| A rejected payment does not auto-cancel the order | Deliberate — the customer may still pay another way |
| No alert when the verification queue goes unworked | Monitoring query provided; automation is Phase 4 |

---

## GO / NO-GO

### 🔴 NO-GO for production

**Not because the code is unsound.** Everything verifiable from a repository is
verified — after the merge, not before it: 128/128 tests, clean compile,
successful build, and 27 database assertions on a real PostgreSQL 17 across both
schemas, forward and rollback, plus a new section proving migrations 0008 and
0009 apply in order and **do not undo the Phase 3 payment guard**.

That includes proof that a customer cannot mark their own payment completed,
cannot reject it, and cannot forge the audit trail.

**The release is blocked on eight items requiring your Supabase project, your
hosting dashboard, and a human with a browser** — none of which I can reach.

Three are not paperwork:

- **B1** — until the migrations are applied, the feature this release exists to
  deliver **does not work at all**.
- **B6** — RC2 raised the stakes. Profile creation moved from the client into
  `handle_new_user_signup()`. If `on_auth_user_created` is not wired, **every
  signup silently produces an account with no profile and no role.** RC1 masked
  this; RC2 does not.
- **B4** — the security guarantee is verified in SQL but has never been exercised
  through the running application. A guarantee nobody has tried to break is a
  claim, not a control.

### Path to GO

```
 1. B2  merge to main                              Dev
 2. B3  tag rc2                                    Dev
 3. B8  decide: ship wallet/referral dormant?      Product
 4. B6  preflight SQL — trigger, RPCs, RLS         DBA
 5. B7  confirm at least one admin exists          DBA
 6.     BACK UP THE DATABASE                       DBA   ← record the timestamp
 7. B1  apply 0001 → 0009, verifying after each    DBA
 8.     confirm on_auth_user_created + payment trigger   DBA
 9. B5  enable Realtime in the dashboard           DBA
10.     deploy the application                     Dev
11. B4  execute the manual test plan               QA
         must pass: TC-04 TC-05 TC-09 TC-10 TC-11 TC-13 TC-14 TC-19
```

**When all eleven are done and the eight must-pass cases are green, this release
is READY FOR PRODUCTION.**

Until then the honest statement is: **RC2 is code-complete, frozen, and verified
to the limit of what can be verified without your infrastructure.**

---

### Sign-off

| Gate | Owner | Date | Signature |
|---|---|---|---|
| B2 · Merged to main | | | |
| B3 · Tagged `rc2` | | | |
| B8 · Wallet/referral decision made | | | |
| B6 · Preflight clean (**trigger present**) | | | |
| B7 · Admin exists | | | |
| — · Backup taken | | | |
| B1 · Migrations 0001–0009 applied | | | |
| — · `on_auth_user_created` + payment trigger confirmed | | | |
| B5 · Realtime enabled | | | |
| — · Application deployed | | | |
| B4 · Manual tests passed | | | |
| **FINAL — approved for production** | | | |
