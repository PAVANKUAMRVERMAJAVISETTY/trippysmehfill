# Go-Live Report

## Verdict: 🟡 READY AFTER FIXING THE FOLLOWING ITEMS

Every defect found in the code has been fixed, retested and committed. Three
blockers remain and **none of them are code** — all require database credentials
or a merge.

## Where the code stands

```
tsc --noEmit     clean  (and, for the first time, actually checking JSX)
node:test        144 / 144
npm run build    ✓ 344.65 kB gzip
migrations       0001–0009 verified on PostgreSQL 17, both schema shapes
live queries     order, menu and inventory fetches all HTTP 200
```

Fixed this pass: 6 bugs, including one critical tooling defect that had made
every previous "tsc clean" claim weaker than it sounded.

## Blockers

| | Blocker | Fix | Owner |
|---|---|---|---|
| **EXT-1** | `profiles` has no grants — **signup fails for every user** | apply `0008_fix_profiles_rls.sql` | DBA |
| **EXT-2** | Migration 0007 not applied — payment verification impossible | apply `0007_payment_verification.sql` | DBA |
| **EXT-3** | Not merged to `main` — live site runs pre-merge code | merge PR #2 | Dev |
| ⚠️ EXT-4 | `on_auth_user_created` may be absent → signup creates no profile, silently | one query; apply `0003` if needed | DBA |

## Untested territory — be honest about this

**No browser exists in this environment**, and the project has no browser tooling.
Consequently **nothing below was verified at all**:

- Every page as rendered — layout, styling, visual correctness
- Responsive behaviour on any device or viewport
- Cross-browser: Chrome, Safari, Firefox, Edge
- Keyboard navigation, focus order, screen readers, contrast
- Any end-to-end journey — customer, admin, kitchen or driver
- Realtime propagation between two clients
- OTP delivery
- `upi://` intents, clipboard, Web Share, PDF generation

The 49-case [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) exists precisely for this
and has **0 cases executed**.

## Features requested but absent

Reported rather than built, because inventing modules during a feature freeze
would be the wrong call:

| | Status |
|---|---|
| Promo codes | ❌ No feature; `promo_codes` absent from the live database |
| Kitchen Accept / Preparing / Ready | ❌ Kitchen has one action, "Ready for Dispatch". DB is ready; ~half a day of UI wiring. |
| Admin "Accept Order" | ❌ Only `'cooking'` via driver assignment |
| Driver Accept / Picked up | ❌ Driver has two buttons: GPS toggle and Mark Delivered |
| Careers, Jobs, Consultants, Resources, Forms | ❌ Zero references. These appear to belong to a different brief. |

**Driver module: exists.** No build required.

## Path to 🟢

```
1. Back up the database                                     DBA
2. Verify on_auth_user_created; apply 0003 if absent        DBA
3. Apply 0008_fix_profiles_rls.sql                          DBA
4. Apply 0007_payment_verification.sql                      DBA
5. Confirm ≥1 admin account exists                          DBA
6. Enable Realtime on orders in the dashboard               DBA
7. Merge PR #2, tag rc2, deploy                             Dev
8. Execute MANUAL_TEST_PLAN.md — 49 cases                   QA
     must pass: TC-04 TC-05 TC-09 TC-10 TC-11 TC-13 TC-14 TC-19
9. Open the site on a real phone                            QA
10. Agree the payment vocabulary with your teammate         You
```

Steps 1–6 are about half an hour. Step 8 is the real work.

## Why not 🟢

Two reasons, both honest:

1. **Three external blockers.** Signup fails for every user in production right
   now. That alone forecloses green.
2. **An entire category of testing did not happen.** Declaring a food-delivery
   app production-ready without anyone having opened it on a phone would be
   asserting something I did not verify.

## Why not 🔴

Because nothing in the codebase blocks deployment. Every code defect found was
fixed and retested, the schema mismatch that broke every order path is resolved
and verified against the live database, and the remaining work is a half-hour of
SQL plus a merge.
