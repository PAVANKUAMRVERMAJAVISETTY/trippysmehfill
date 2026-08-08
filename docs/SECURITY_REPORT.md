# Security Report

Static audit plus live read-only probes. **No penetration testing was performed** —
that requires a running authenticated session and explicit authorisation.

## Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| SEC-1 | 🟠 Medium | "Switch Role to Admin" button shipped to production | ✅ Fixed (BUG-04) |
| SEC-2 | 🔴 Critical | `public.profiles` has no table grants — signup fails for everyone | 🔴 **Open** — DBA |
| SEC-3 | 🟡 Info | Dev test OTP credentials exist in source | ✅ Verified safe |

### SEC-1 — Demo role switcher (fixed)
Rendered unconditionally on the admin guard screen. **Not exploitable** —
`switchDemoRole()` no-ops outside development, and even in dev only sets local
React state, with RLS still governing data. The defect was a dead button
advertising role switching on a security screen. Now removed from the bundle
(`grep` 1 → 0).

### SEC-2 — Missing table grants (open, external)
```
GET /rest/v1/profiles?select=*&limit=1
401 {"code":"42501","message":"permission denied for table profiles",
     "hint":"GRANT SELECT ON public.profiles TO anon;"}
```
Postgres names the fix itself. **Availability defect, not a data exposure** — it
fails closed. Fix: `0008_fix_profiles_rls.sql`.

### SEC-3 — Dev credentials (verified safe)
`DEV_TEST_CREDENTIALS` in `otpService.ts` is dead code, never consulted by any
auth path — every verification calls `supabase.auth.verifyOtp`. Confirmed
tree-shaken: `919876543210`, `919999999999`, `Dev Admin`, `Test Teammate`,
`DEV_TEST_CREDENTIALS` all return **0 matches** in `dist/`.

⚠️ **Residual risk outside the code:** if "Test Phone Numbers" are configured in
the Supabase Auth dashboard, those static codes work in production regardless.
**Not verified** — requires dashboard access.

## Checks performed

| Check | Result |
|---|---|
| XSS sinks (`dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`) | ✅ **Zero occurrences** |
| Hardcoded secrets / API keys | ✅ None |
| `service_role` or `sb_secret_` in `src/` | ✅ None (only the guard that rejects them) |
| `service_role` in built bundle | ✅ Absent |
| `target="_blank"` without `rel` | ✅ All 5 have `rel="noreferrer"` |
| Secrets committed to git | ✅ `.env.local` ignored via `.gitignore:7` |
| Client-side key format guard | ✅ Hardened this pass — secret keys now refused |

## Authorization model

Defence in depth on the payment path, verified on a real PostgreSQL:

| Layer | Guarantee |
|---|---|
| DB trigger (0007) | Non-team member moving `payment_status` off `'pending'` → `check_violation` |
| DB trigger | Client writes to `payment_verified_at` / `_by` refused; server stamps from `auth.uid()` |
| RLS | UPDATE on `orders` restricted to team members and, narrowly, the owning customer |
| Application | `'completed'` / `'rejected'` written only by `verifyPayment` / `rejectPayment` |

Harness assertions passing: *customer cannot mark their own payment completed* ·
*cannot set it to rejected* · *cannot forge the audit trail* · *admin can verify* ·
*`payment_verified_by` stamped server-side* · *RLS blocks a stranger*.

⚠️ **These hold in SQL. TC-11 exercises them through the running application and
has not been executed.** A guarantee nobody has tried to break is a claim.

## SQL injection
The app uses the Supabase JS client exclusively — parameterised PostgREST calls,
no string-concatenated SQL. **No injection surface found.** Not fuzzed.

## CSRF
Supabase auth uses bearer tokens in headers, not cookies, so classic CSRF does
not apply. **Not verified** against a live session.

## Not verified

- **Penetration testing** — no authorisation, no running authenticated session
- **Dashboard settings** — test phone numbers, SMTP, RLS toggles
- **Live RLS policy contents** — `pg_policies` not exposed over PostgREST
- **Session handling in a browser** — no browser available
