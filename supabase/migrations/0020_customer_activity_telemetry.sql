-- MIGRATION: CUSTOMER LAST ACTIVITY & LAST KNOWN LOCATION TELEMETRY
-- Safe and idempotent migration script for public.profiles

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_location_update_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION DEFAULT 15.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gps_allowed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'Desktop';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS os_name TEXT DEFAULT 'Windows';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS browser_name TEXT DEFAULT 'Chrome';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';

-- Create index on last_seen_at for performance sorting in admin panel
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at DESC);

-- Ensure RLS allows users to update their own activity telemetry
DROP POLICY IF EXISTS "Users can update own profile telemetry" ON public.profiles;
CREATE POLICY "Users can update own profile telemetry" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
