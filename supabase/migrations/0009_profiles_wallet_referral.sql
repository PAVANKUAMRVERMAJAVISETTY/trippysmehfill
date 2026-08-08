-- ====================================================================
-- 0007 — PROFILES WALLET BALANCE & REFERRAL CODE
-- ====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance numeric NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS referral_code text;

-- RPC for checking phone number availability during signup without triggering RLS 401 errors
CREATE OR REPLACE FUNCTION public.phone_exists(p_phone text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = trim(p_phone)
  );
$$;

REVOKE ALL ON FUNCTION public.phone_exists(text) FROM public;
GRANT EXECUTE ON FUNCTION public.phone_exists(text) TO anon, authenticated;

-- Update handle_new_user_signup trigger to assign default wallet_balance = 0.00
-- and generate a unique referral_code (TRIPPY-XXXX-1234)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  ref_code text;
BEGIN
  ref_code := 'TRIPPY-' || upper(left(coalesce(nullif(meta->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)), 4)) || '-' || (floor(random() * 8999 + 1000)::text);

  INSERT INTO public.profiles (
    id, email, full_name, phone, hostel_address,
    role, account_status, is_whatsapp_verified, is_approved, is_active,
    auth_provider, ip_address, latitude, longitude,
    wallet_balance, referral_code,
    created_at, updated_at
  )
  VALUES (
    new.id,
    new.email,
    coalesce(nullif(meta->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(meta->>'phone', ''),
    coalesce(meta->>'hostel_address', ''),
    'customer',
    'active',
    false,
    false,
    true,
    coalesce(meta->>'auth_provider', 'Email'),
    meta->>'ip_address',
    nullif(meta->>'latitude', '')::double precision,
    nullif(meta->>'longitude', '')::double precision,
    0.00,
    ref_code,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name       = coalesce(nullif(EXCLUDED.full_name, ''), public.profiles.full_name),
    phone           = coalesce(nullif(EXCLUDED.phone, ''), public.profiles.phone),
    hostel_address  = coalesce(nullif(EXCLUDED.hostel_address, ''), public.profiles.hostel_address),
    referral_code   = coalesce(public.profiles.referral_code, EXCLUDED.referral_code),
    updated_at      = now();

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_signup failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$;
