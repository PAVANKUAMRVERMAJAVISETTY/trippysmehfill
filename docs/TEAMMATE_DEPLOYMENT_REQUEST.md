# 🚀 Trippy's Mehfill — Production Deployment & Handoff Request

Hi Team,

The Phase 2 migration to a **100% database-driven Supabase ERP** is complete and fully tested locally. Please follow the checklist below to deploy the live database schemas, configure Development OTP testing, and trigger the production build on Vercel.

---

## 📋 Action Checklist

### 1. Database Migration (Supabase SQL Editor)

Open the **SQL Editor** in your [Supabase Dashboard](https://app.supabase.com) (Project `iptjevfvuwrdbqzgrzxg`) and execute the following scripts in sequence from the repository:

1. **`supabase/phase2_schema.sql`**: Creates tables (`orders`, `order_items`, `menu_items`, `categories`, `inventory`, `inventory_transactions`, `feedback`, `banners`, `gallery_items`, `promo_codes`, `payments`, `kitchen_settings`, `notifications`, `audit_logs`, `profiles`), triggers, and indexes.
2. **`supabase/fix_profiles_rls.sql`**: Prevents PostgreSQL `42P17` RLS policy infinite recursion by introducing `public.is_admin()` helper function and setting up safe profile insert/update policies.
3. **`supabase/phase2_rls.sql`**: Enables Row Level Security (RLS) policies and security triggers across all tables.
4. **`supabase/phase2_seed.sql`**: Populates initial food categories, menu items, kitchen settings, gallery, banners, and inventory.

---

### 2. Development OTP & Test Credentials Setup

To test phone authentication without incurring SMS gateway costs during development and staging tests:

1. In Supabase Dashboard $\rightarrow$ **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Phone**:
   - Toggle **Enable Phone Provider** to `ON`.
   - Scroll down to **Test Phone Numbers**.
   - Add the following test credentials:
     - **Phone Number**: `+919876543210` | **OTP**: `123456`
     - **Phone Number**: `+919999999999` | **OTP**: `123456`
2. Save changes. Teammates can now test OTP authentication immediately using `9876543210` with code `123456`.

---

### 3. Supabase Dashboard Settings

1. **Authentication $\rightarrow$ Providers $\rightarrow$ Email**:
   - Ensure **Email Provider** is enabled.
2. **Authentication $\rightarrow$ URL Configuration**:
   - Set **Site URL** to your production Vercel domain (e.g. `https://trippysmehfill.vercel.app`).
3. **Storage $\rightarrow$ Create Bucket**:
   - Bucket Name: `restaurant-assets`
   - Public: `Enabled` (ON)

---

### 4. Vercel Environment Variables & Redeployment

In **Vercel Project Settings $\rightarrow$ Environment Variables**, configure the following variables for **Production**, **Preview**, and **Development**:

| Environment Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://iptjevfvuwrdbqzgrzxg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_mcYrRu-GOqphMJjB2LlDuA_AABdVZ0p` |

> ⚠️ **Important**: After adding or updating environment variables in Vercel, you **MUST trigger a Redeploy** (Deployments $\rightarrow$ Redeploy) because `VITE_*` variables are compiled into static assets at build time.

---

## ✅ Local Verification Completed

- **TypeScript Compilation**: `0` errors (`npm run lint`).
- **Unit Tests**: `37/37` passing (`npm test`).
- **Production Build**: Verified clean static bundle build (`npm run build`).
- **localStorage Usage**: `0` business data dependencies.
- **OTP Development Service**: Verified (`src/lib/otpService.ts`).

---

Thank you! Let me know if you run into any issues during the deployment.
