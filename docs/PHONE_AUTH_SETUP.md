# Supabase Phone Auth Setup & SMS Gateway Integration

This document outlines how to set up **Supabase Phone Authentication** for **Trippy's Mehfill** using SMS OTP (`+91` default for India).

---

## 1. Supabase Dashboard Configuration

1. Open your [Supabase Dashboard](https://app.supabase.com).
2. Go to **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Phone**.
3. Toggle **Enable Phone Provider** to `ON`.

---

## 2. SMS Gateway Configuration

Supabase supports native integrations with major SMS Gateway providers:

### Option A: Twilio (Recommended for Global & India Delivery)

1. Sign up for a [Twilio Account](https://www.twilio.com).
2. Retrieve your **Account SID**, **Auth Token**, and **Twilio Phone Number** / **Messaging Service SID**.
3. In Supabase Dashboard $\rightarrow$ **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Phone**:
   - Set **SMS Provider** to `Twilio`.
   - Paste Account SID, Auth Token, and Sender Phone Number.
   - Save changes.

### Option B: MessageBird / Vonage / AWS SNS

1. In Supabase Dashboard $\rightarrow$ **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Phone**:
   - Select your provider (`MessageBird`, `Vonage`, or `AWS SNS`).
   - Enter your API Key, Access Key Secret, and Sender ID.
   - Save changes.

---

## 3. Test Phone Numbers (Zero-Cost Development & Testing)

To test the mobile login flow without spending SMS credits:

1. In Supabase Dashboard $\rightarrow$ **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Phone**.
2. Scroll to **Test Phone Numbers**.
3. Add test numbers and static 6-digit OTP codes:
   - **Phone Number**: `+919876543210`
   - **OTP Code**: `123456`
4. Now, entering `9876543210` in the app login screen will send code `123456` without hitting an external SMS API.

---

## 4. Frontend Code Flow Summary

The application uses native Supabase Auth methods via `src/lib/phoneAuthService.ts` (removed — phone OTP now lives in [otpService.ts](../src/lib/otpService.ts)):

### Send SMS OTP Code
```typescript
import { sendPhoneOTP } from './lib/phoneAuthService';

const result = await sendPhoneOTP('+919876543210', 'Baji Yadav');
// Executes: supabase.auth.signInWithOtp({ phone: '+919876543210' })
```

### Verify SMS OTP Code
```typescript
import { verifyPhoneOTPCode } from './lib/phoneAuthService';

const result = await verifyPhoneOTPCode('+919876543210', '123456');
// Executes: supabase.auth.verifyOtp({ phone: '+919876543210', token: '123456', type: 'sms' })
```

---

## 5. Production Deployment Steps

1. In Supabase Dashboard, confirm your SMS provider credentials are live.
2. In Vercel Project Settings $\rightarrow$ Environment Variables:
   - `VITE_SUPABASE_URL` = `https://iptjevfvuwrdbqzgrzxg.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_mcYrRu-GOqphMJjB2LlDuA_AABdVZ0p`
3. Trigger a redeploy on Vercel.
4. Test login with a live Indian mobile number.
