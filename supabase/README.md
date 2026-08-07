# Supabase configuration

## Migrations

Run these in order in the SQL Editor (or `supabase db push`). All are idempotent
and safe to re-run on the existing project.

| File | What it does |
|---|---|
| `migrations/0001_core_schema.sql` | Creates `profiles`, `orders`, `menu_items`, `kitchen_settings`, `feedback`, `inventory` and every column the client writes |
| `migrations/0002_rls_policies.sql` | Enables Row Level Security and creates the policies + role helper functions |
| `migrations/0003_auth_triggers.sql` | Signup → profile trigger, `updated_at` triggers, admin bootstrap |

These replace the old top-level `schema.sql`, which could not run on a fresh
project (it did `ALTER TABLE public.orders` without ever creating `orders`).

## Email OTP delivery — Brevo SMTP

Supabase Auth generates, stores, expires and rate-limits the 6-digit code; the
only thing SMTP does is deliver it. **The provider is configured entirely in the
Supabase dashboard — no application code references it.**

### Why not `onboarding@resend.dev`

Resend's shared testing sender may only deliver to the address that owns the
Resend account. Every real customer address is rejected with a 403, Supabase
surfaces the failed send as an HTTP 500, and because the email send is part of
the signup transaction the `auth.users` row is rolled back — so no OTP arrives
*and* no profile is created.

### Configure Brevo

**Project Settings → Authentication → SMTP Settings** → *Enable Custom SMTP*:

| Field | Value |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | your Brevo SMTP login (shown under Brevo → SMTP & API → SMTP) |
| Password | your Brevo SMTP key (**not** the v3 API key) |
| Sender email | your **verified** Brevo sender address |
| Sender name | `Trippy's Mehfill` |
| Minimum interval between emails | `60` seconds |

Then **Authentication → Rate Limits**: enabling custom SMTP caps email at
**30/hour**; raise it to match your signup volume.

Brevo free tier is 300 emails/day.

### Sender address

Add the sender under Brevo → **Senders, Domains & Dedicated IPs → Senders** and
confirm the 6-digit code Brevo emails you. A single verified address works
without owning a domain.

Caveat worth knowing: `gmail.com` publishes a strict DMARC policy, so mail
"from" a Gmail address relayed through Brevo fails alignment. Brevo documents
that it rewrites the From address to a compliant one in that case, and Gmail /
Yahoo / Outlook may still filter it to spam. It unblocks registration today, but
authenticating your own domain in Brevo is the durable fix — free sender domains
(gmail, yahoo, outlook) cannot be authenticated.

### Other required Auth settings

- **Authentication → Providers → Email**: Email enabled, *Confirm email* on.
- **Authentication → URL Configuration**: Site URL set to the production domain,
  with the Vercel/Netlify preview domains listed as redirect URLs.

## Environment variables

Only two, both public and both inlined at **build time** (so a change needs a
redeploy, not just a restart) — in Vercel set them for Production, Preview and
Development:

| Name | Notes |
|---|---|
| `VITE_SUPABASE_URL` | Project URL from Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | The JWT anon key (`eyJhbGci...`), **not** an `sb_publishable_...` key |

No SMTP, Brevo or Resend credential belongs in the app environment — the SMTP
key lives only in the Supabase dashboard. Never put the `service_role` key in a
`VITE_` variable; it would ship to the browser and bypass every RLS policy.
