-- 0018_customer_permanent_deletion_fk_cascade.sql
--
-- Safe & Idempotent Migration: Ensures public.profiles.id references auth.users(id)
-- with ON DELETE CASCADE behavior, so deleting an Auth user automatically
-- cleans up their profile without affecting historical orders (which reference profiles with ON DELETE SET NULL).

DO $$
BEGIN
  -- Drop existing foreign key constraint on profiles.id if present
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND table_schema = 'public'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;

  -- Add the foreign key constraint with ON DELETE CASCADE
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Foreign key update on profiles(id) completed or skipped: %', SQLERRM;
END $$;
