# Auth Migration: Custom OTP Backend → Supabase Auth Email OTP

This migration removes the custom Express OTP backend and moves email verification
onto Supabase Auth. The application is now **fully static** and runs on Vercel with
no separate backend service.

## Why

The previous flow required an Express server (`server.ts`) to generate, store and
verify OTP codes. Vercel serves static files and does not run that process, so
`/api/send-verification-otp` returned **404 in production** and signup could not
complete. Supabase Auth already provides email OTP — generation, storage, expiry,
rate limiting and delivery — so the custom backend was reproducing functionality
that already existed.

## Files removed

| File | Reason |
|---|---|
| `server.ts` | Express server. No longer needed; Supabase handles auth. |
| `otpStore.ts` | In-memory OTP store. Supabase owns OTP state now. |
| `otpStore.test.ts` | Tests for the removed store. |

## Files added

| File | Purpose |
|---|---|
| `src/lib/authErrors.ts` | Maps Supabase/network errors to clear user-facing messages. |
| `src/components/common/ProtectedRoute.tsx` | `RequireAuth`, `RequireRole`, `AuthLoading`, `ConfigErrorScreen`. |
| `authErrors.test.ts` | 11 tests for the error mapping. |
| `vercel.json` | Build config and SPA rewrites. |

## Files modified

| File | Change |
|---|---|
| `src/lib/supabase.ts` | Config validation with actionable errors; `persistSession`, `autoRefreshToken`, PKCE flow. |
| `src/lib/emailService.ts` | Now a thin wrapper over `signInWithOtp` / `verifyOtp`. No OTP generation. |
| `src/context/AuthContext.tsx` | Rebuilt on Supabase sessions instead of `localStorage`. Adds `session`, `initializing`, `isConfigured`, `configError`, `refreshProfile`. |
| `src/components/common/AuthModal.tsx` | Handles `signUp` failures; loading state spans verification. UI unchanged. |
| `src/App.tsx` | `AppGate` shows a config error when Supabase is unset; driver portal is role-gated. |
| `package.json` | Removed `express`, `resend`, `dotenv`, `esbuild`, `@types/express`. Scripts now plain Vite. |
| `.env.example` | Only the two Supabase variables remain. |

## New authentication flow

### Registration

1. User fills the signup form. Validation runs client-side via `src/lib/validation.ts`.
2. `sendEmailVerificationOTP()` → `supabase.auth.signInWithOtp({ shouldCreateUser: true })`.
   Supabase generates the code, stores it, and emails it.
3. User enters the code. `verifyEmailOTPCode()` → `supabase.auth.verifyOtp()`.
   On success **Supabase establishes a session**.
4. `signUp()` attaches the chosen password via `supabase.auth.updateUser()` and
   upserts the `profiles` row with `is_approved: false`.
5. Admin approves the account before ordering is unlocked.

### Sign-in

`signIn()` → `supabase.auth.signInWithPassword()`. The profile is loaded from
`profiles`; blocked or unapproved customers are rejected and signed back out.

### Session lifecycle

`getSession()` restores a persisted session on load, and `onAuthStateChange`
tracks sign-in/sign-out/token-refresh. `supabase-js` refreshes the access token
automatically. `initializing` is true until the first restore completes, so route
guards do not flash "signed out" on reload.

### Sign-out

`supabase.auth.signOut()` clears the session and persisted tokens, then local
state is reset.

## Security notes

**Identity now comes from the Supabase session, not `localStorage`.** Previously
the signed-in user — including `role` — was read from `localStorage`, so editing
one value in devtools granted admin. The role is now read from the `profiles` row
belonging to the authenticated session.

The client-side guards in `ProtectedRoute.tsx` are a **usability** layer. Anything
sensitive must be enforced by **Row Level Security** in Supabase, because a user
controls everything running in their browser. See "Remaining recommendations" in
`FINAL_AUTH_REPORT.md`.

`VITE_SUPABASE_ANON_KEY` is a public, browser-safe key by design; access is
governed by RLS. **Never** put the `service_role` key in a `VITE_` variable — it
would be inlined into the bundle and readable by anyone.

## Environment variables

```bash
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

Both are **required**. If either is missing or still a placeholder, the app renders
a configuration screen naming the missing variable instead of failing at runtime.

`VITE_*` values are inlined at **build time**, so changing them in Vercel requires
a **redeploy** before the running app picks them up.

## Deployment (Vercel)

1. **Settings → Environment Variables**: add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` for Production, Preview and Development.
2. **Redeploy.** Changing env vars alone does not update an existing build.
3. Build settings are in `vercel.json` (`vite`, `npm run build`, output `dist`).

### Required Supabase configuration

1. **Authentication → Providers → Email**: enable Email, and enable
   "Email OTP" so a 6-digit code is sent rather than only a magic link.
2. **Authentication → URL Configuration**: set Site URL to your Vercel domain.
3. **Authentication → Rate Limits**: configuring custom SMTP resets the email
   limit to 30/hour — raise it to suit your signup volume.
4. **Database**: run the migrations in `supabase/migrations/` in order. They
   create every table the app queries, enable RLS and install the signup
   trigger.
5. **Project Settings → Authentication → SMTP Settings**: custom SMTP is
   mandatory — without it Supabase only delivers to your organisation's members
   and caps you at 2 emails/hour. See `supabase/README.md` for the Brevo
   configuration.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev                  # vite dev server, no Express
npm test                     # 32 tests
npm run lint                 # tsc --noEmit
npm run build                # production build
```
