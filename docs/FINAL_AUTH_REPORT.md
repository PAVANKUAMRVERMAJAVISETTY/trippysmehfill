# Final Auth Report

Migration of authentication from a custom Express OTP backend to **Supabase Auth
email OTP**. The app is now fully static and deploys to Vercel with no backend.

## Summary of changes

The custom OTP system required an Express server that Vercel never ran, so
`/api/send-verification-otp` returned 404 in production and signup was broken.
Supabase Auth already provides email OTP, so the custom implementation was
deleted rather than ported to serverless functions — less code, less
infrastructure, and no OTP state to manage.

Identity is now derived from the **Supabase session** rather than `localStorage`,
which closes a privilege-escalation hole: the signed-in user object, including
`role`, was previously read from `localStorage` and could be edited to grant
admin.

## Files removed

| File | Lines | Reason |
|---|---|---|
| `server.ts` | ~215 | Express server; not runnable on static hosting |
| `otpStore.ts` | ~125 | In-memory OTP store; Supabase owns this now |
| `otpStore.test.ts` | ~119 | Tests for the removed store |

## Files added

| File | Purpose |
|---|---|
| `src/lib/authErrors.ts` | Supabase/network errors → clear user messages |
| `src/components/common/ProtectedRoute.tsx` | `RequireAuth`, `RequireRole`, `AuthLoading`, `ConfigErrorScreen` |
| `authErrors.test.ts` | 11 tests for error mapping |
| `vercel.json` | Build config + SPA rewrites |
| `AUTH_MIGRATION.md` | Migration and deployment guide |

## Files modified

| File | Change |
|---|---|
| `src/lib/supabase.ts` | Config validation, `persistSession`, `autoRefreshToken`, PKCE |
| `src/lib/emailService.ts` | Wrapper over `signInWithOtp` / `verifyOtp` |
| `src/context/AuthContext.tsx` | Session-based auth; adds `session`, `initializing`, `isConfigured`, `configError`, `refreshProfile` |
| `src/components/common/AuthModal.tsx` | Surfaces `signUp` failures; loading spans verification |
| `src/App.tsx` | `AppGate` config screen; driver portal role-gated |
| `package.json` | Server deps removed; plain Vite scripts |
| `.env.example` | Two Supabase variables only |

## Dependencies removed

| Package | Was used for |
|---|---|
| `express` | HTTP server |
| `resend` | OTP email delivery |
| `dotenv` | Server env loading |
| `esbuild` | Bundling `server.ts` |
| `@types/express` | Types for the removed server |

`npm install` drops from 265 to 245 packages. `@google/genai` is still declared
but never imported — see recommendations.

## Authentication flow

```
REGISTRATION
   User fills signup form
        │
        ▼
   validateRegistration()            src/lib/validation.ts
        │  (name, email, phone, address, password policy)
        ▼
   supabase.auth.signInWithOtp({ shouldCreateUser: true })
        │
        ▼
   Supabase generates + stores + emails the 6-digit code
        │                            (app never sees the code)
        ▼
   User enters code
        │
        ▼
   supabase.auth.verifyOtp({ type: 'email' })
        │
        ├── invalid / expired / rate-limited ──▶ toFriendlyAuthError() ──▶ message
        │
        ▼  success
   SESSION ESTABLISHED
        │
        ▼
   supabase.auth.updateUser({ password })      attaches chosen password
   upsert profiles { is_approved: false }      awaits admin approval
        │
        ▼
   Admin approves ──▶ ordering unlocked


SIGN-IN                          SESSION LIFECYCLE
   email + password                 getSession()        restore on load
        │                           onAuthStateChange() track changes
        ▼                           autoRefreshToken    renew before expiry
   signInWithPassword()             signOut()           clear session + tokens
        │
        ▼
   load profiles row ──▶ blocked?  ──▶ signOut + message
                    └──▶ unapproved? ──▶ signOut + message
                    └──▶ ok ──▶ session active
```

## Verification performed

| Check | Result |
|---|---|
| `npm test` | ✅ 32 passing (21 validation, 11 error mapping) |
| `npm run lint` (`tsc --noEmit`) | ✅ 0 errors |
| `npm run build` | ✅ succeeds, static output only |
| Build without env vars | ✅ falls back to placeholder, config screen compiled in |
| Build with env vars | ✅ real project URL inlined |
| Bundle contains `/api/*`, `resend`, `otpStore` | ✅ 0 occurrences of each |
| Bundle contains Supabase auth calls | ✅ `signInWithOtp`, `verifyOtp`, `signInWithPassword`, `onAuthStateChange` |
| Static preview serves app | ✅ `/` 200, deep link 200 via SPA fallback |
| No backend process required | ✅ `vite preview` only |

### Not verified — requires a live Supabase project

These need real credentials and a configured Supabase project, which are not
available in this environment:

- OTP email actually arriving in an inbox
- End-to-end verify → session → password-set → profile-insert round trip
- Sign-in with the password set during registration
- Token refresh across an access-token expiry
- Supabase rate-limit responses in practice

The error-handling paths for all of these are unit-tested, and the code paths
typecheck and build, but the live round trip is untested. **Run through one real
registration after deploying** before considering the migration complete.

## Remaining recommendations

1. **Row Level Security is the real boundary.** The guards in
   `ProtectedRoute.tsx` improve UX but cannot be trusted — a user controls their
   own browser. Confirm `profiles` has RLS policies so a user can only read/write
   their own row, and that `role` cannot be self-assigned. **Without this, a user
   could set their own `role` to `admin` via the client.** This is the single most
   important follow-up.

2. **Enable Email OTP in Supabase.** Under Authentication → Providers → Email.
   If only magic links are enabled, no 6-digit code is sent and verification fails.

3. **Set env vars in Vercel and redeploy.** The current deployment has
   `placeholder.supabase.co` baked in, so authentication is inert until this is done.

4. **Remove `@google/genai`** — declared but never imported anywhere. Left in place
   because it may be tied to AI Studio integration outside this repo.

5. **Pick one lockfile.** `bun.lock` is committed while all scripts use npm. This
   is the likeliest cause of the failing Netlify build. Commit `package-lock.json`
   and delete `bun.lock`, or switch scripts to bun.

6. **Code-split the bundle.** 1.1 MB minified (302 kB gzipped) trips Vite's size
   warning. Lazy-loading the admin module would cut most of it for customers.

7. **Decide about Netlify.** The Netlify site returns 404 at its root and appears
   unused now that Vercel is the deployment target. Disconnect it or fix it, so a
   broken deploy check stops appearing on pull requests.

8. **`switchDemoRole` is dev-only now** but still exists. Consider removing it
   entirely once demo flows are no longer needed.
