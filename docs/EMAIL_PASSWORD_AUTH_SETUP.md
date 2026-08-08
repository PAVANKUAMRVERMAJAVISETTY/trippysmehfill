# Supabase Email + Password Authentication Setup

Guide for configuring **Supabase Email + Password Authentication** for **Trippy's Mehfill**.

---

## 1. Overview

Authentication runs directly on Supabase Auth without OTP requirements or external SMS gateways:

- **Sign Up**: Full Name, Mobile Number (`+91`), Email Address, Password.
- **Sign In**: Email Address, Password.
- **Password Reset**: Standard email password reset link.
- **Mobile Number Storage**: Stored in `public.profiles` (`phone` column) for order delivery & contact.

---

## 2. Supabase Dashboard Configuration

1. Open your [Supabase Dashboard](https://app.supabase.com).
2. Go to **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**.
3. Toggle **Enable Email Provider** to `ON`.
4. Ensure **Enable Confirm Email** is toggled according to your preference (disabled for instant signup verification in single-step testing, or enabled for email verification links).

---

## 3. Frontend Authentication API

Implemented in [`src/context/AuthContext.tsx`](../src/context/AuthContext.tsx) and [`src/components/common/AuthModal.tsx`](../src/components/common/AuthModal.tsx):

### Sign Up
```typescript
const result = await signUp({
  full_name: 'Baji Yadav',
  phone: '9876543210',
  email: 'baji@example.com',
  hostel_address: 'GLS Homes, Sohna',
  password: 'Str0ngPass!2026'
});
// Executes: supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })
```

### Sign In
```typescript
const result = await signIn('baji@example.com', 'Str0ngPass!2026');
// Executes: supabase.auth.signInWithPassword({ email, password })
```

### Password Reset
```typescript
const result = await resetPassword('baji@example.com');
// Executes: supabase.auth.resetPasswordForEmail(email)
```

---

## 4. Verification & Testing

- **TypeScript compilation**: `npm run lint`
- **Unit test suite**: `npm test`
- **Production bundle**: `npm run build`
