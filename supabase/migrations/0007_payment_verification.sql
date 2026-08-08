-- 0007 — admin payment verification
--
-- Phase 3. A UPI order is held at "Pending Verification" until a team member
-- confirms the transfer actually arrived. Three things are needed for that:
--
--   1. A 'rejected' payment_status. Today the value is not storable.
--   2. An audit trail -- who settled it, when, and why it was refused.
--   3. A server-side guarantee that only a team member can settle a payment,
--      so the rule survives anything the client does.
--
-- ---------------------------------------------------------------------------
-- TWO SCHEMAS EXIST IN THIS REPOSITORY, AND THEY DISAGREE
-- ---------------------------------------------------------------------------
-- `supabase/phase2_schema.sql` (what the deployed database was built from --
-- it is the only one with `order_items` and `orders.is_deleted`, both of which
-- src/services/supabase/orders.ts queries) declares payment_status and
-- order_status as PostgreSQL ENUM types.
--
-- `supabase/migrations/0001_core_schema.sql` declares the same columns as text
-- with CHECK constraints, and gives orders.id type text rather than uuid.
--
-- Widening an enum and widening a CHECK are entirely different operations, so
-- this migration detects which shape it is running against and does the right
-- one. It is correct on either, and idempotent on both. Nothing is dropped and
-- no existing row is rewritten.
--
-- Reverse with 0007_payment_verification_down.sql.
--
-- NOTE ON TRANSACTIONS: PostgreSQL forbids *using* a new enum value in the
-- same transaction that added it. This file only adds values and never
-- compares against them at DDL time, so it is safe to run whole. If your
-- client reports "unsafe use of new value", run section 1 by itself first.

-- ---------------------------------------------------------------------------
-- 1. Make 'rejected' a storable payment_status
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  is_enum boolean;
BEGIN
  SELECT data_type = 'USER-DEFINED' INTO is_enum
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status';

  IF is_enum IS NULL THEN
    RAISE EXCEPTION 'public.orders.payment_status not found -- apply the base schema first';
  END IF;

  IF is_enum THEN
    -- Enum schema (phase2_schema.sql). Additive: existing labels keep their
    -- sort order and every stored value stays valid.
    EXECUTE 'ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS ''rejected''';
    RAISE NOTICE '0007: payment_status enum extended with ''rejected''';
  ELSE
    -- Text + CHECK schema (0001_core_schema.sql). Widening a CHECK can never
    -- reject an existing row, because the new set is a superset of the old.
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (
      payment_status IN ('pending', 'completed', 'failed', 'refunded', 'rejected')
    );
    RAISE NOTICE '0007: orders_payment_status_check widened with ''rejected''';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Make the application's full order_status vocabulary storable
--
-- Not strictly payment work, but it blocks Phase 3's timeline. Both base
-- schemas allow only ('pending','cooking','assigned','out_for_delivery',
-- 'delivered','cancelled'), while the application -- and migration 0006's own
-- customer-cancel policy, which reads `status IN ('pending','accepted')` --
-- also speak 'accepted', 'preparing' and 'ready'. Under the old vocabulary an
-- order could never reach 'accepted', so half of that policy matched nothing.
--
-- Purely additive. The six original values remain legal, so no existing row
-- and no existing query changes behaviour.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  is_enum boolean;
BEGIN
  SELECT data_type = 'USER-DEFINED' INTO is_enum
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status';

  IF is_enum THEN
    EXECUTE 'ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS ''accepted''';
    EXECUTE 'ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS ''preparing''';
    EXECUTE 'ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS ''ready''';
    RAISE NOTICE '0007: order_status enum extended with accepted/preparing/ready';
  ELSE
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
      status IN ('pending', 'accepted', 'preparing', 'ready',
                 'cooking', 'assigned', 'out_for_delivery',
                 'delivered', 'cancelled')
    );
    RAISE NOTICE '0007: orders_status_check widened';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Audit columns
--
-- Nullable with no default, so every pre-existing row reads as "never
-- reviewed", which is the truth about them.
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_rejection_reason text;

COMMENT ON COLUMN public.orders.payment_verified_at IS
  'When a team member settled this payment (verified or rejected). NULL = never reviewed.';
COMMENT ON COLUMN public.orders.payment_verified_by IS
  'profiles.id of the team member who settled it. Stamped by trigger, never trusted from the client.';
COMMENT ON COLUMN public.orders.payment_rejection_reason IS
  'Optional note explaining why a payment was refused.';

-- ---------------------------------------------------------------------------
-- 4. Index the verification queue
--
-- The admin view reads "UPI orders not yet settled" -- a selective slice of a
-- table that only grows.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS orders_payment_status_idx
  ON public.orders (payment_status);

CREATE INDEX IF NOT EXISTS orders_payment_pending_idx
  ON public.orders (created_at DESC)
  WHERE payment_method = 'UPI' AND payment_status = 'pending';

-- ---------------------------------------------------------------------------
-- 4b. Make sure orders are actually published to Realtime
--
-- Phase 3 requires the customer, admin and kitchen screens to reflect a
-- verification without a refresh. That depends entirely on public.orders being
-- a member of the supabase_realtime publication -- if it is not, the client
-- subscribes successfully and then simply never receives anything, which looks
-- identical to "no one has verified it yet".
--
-- 0002_rls_policies.sql adds it, but phase2_schema.sql / phase2_rls.sql (the
-- pair the deployed database was built from) never do, so on that deployment it
-- is only enabled if somebody remembered to tick it in the dashboard.
--
-- REPLICA IDENTITY is deliberately left at its default. FULL would be needed to
-- receive the previous row on UPDATE/DELETE, but the client refetches on any
-- event rather than diffing payloads, so it would buy nothing and cost WAL
-- volume on every order write.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE '0007: publication supabase_realtime not found -- enable Realtime in the dashboard first';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    RAISE NOTICE '0007: public.orders added to the supabase_realtime publication';
  ELSE
    RAISE NOTICE '0007: public.orders was already published to Realtime';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Only a team member may settle a payment
--
-- A row-level policy cannot express "you may set status to cancelled but not
-- to delivered", so the rule lives in a BEFORE UPDATE trigger. It:
--
--   * stamps payment_verified_at / payment_verified_by on the server, so the
--     audit trail records the actor the database saw, not one the client
--     claimed to be;
--   * refuses a settlement from anyone who is not a team member, including a
--     direct PostgREST call that never touches the UI;
--   * carries over the customer rules introduced in 0006 unchanged.
--
-- Both helper functions come from 0002. If that migration was never applied
-- (the enum-schema deployment uses phase2_rls.sql instead), the fallbacks
-- below stand in for them.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regprocedure('public.is_team_member()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_team_member() RETURNS boolean
      LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $body$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles
           WHERE id = auth.uid() AND role::text IN ('admin', 'staff', 'driver')
        );
      $body$;
    $fn$;
    RAISE NOTICE '0007: created fallback public.is_team_member()';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_customer_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  payment_changed boolean := NEW.payment_status IS DISTINCT FROM OLD.payment_status;
  settled boolean := NEW.payment_status::text IN ('completed', 'rejected', 'refunded', 'failed');
BEGIN
  -- This trigger polices requests arriving through PostgREST. A direct database
  -- session -- a migration, a maintenance script, the Supabase SQL editor --
  -- has auth.uid() NULL and would otherwise fall through to the customer branch
  -- below and be refused, which would block the rollback script and any routine
  -- data fix. Such a session is not subject to RLS in the first place.
  --
  -- PostgREST sets request.jwt.claims on every request it serves, including
  -- anonymous ones; a direct session never does. That, not current_user, is the
  -- discriminator: inside a SECURITY DEFINER function current_user is the
  -- function's owner, so it reports the same value no matter who called.
  IF current_setting('request.jwt.claims', true) IS NULL
     AND current_setting('request.jwt.claim.sub', true) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Staff, admin and drivers are governed by their own policies and legitimately
  -- move orders through the full lifecycle.
  IF public.is_team_member() THEN
    -- Settling a payment is an auditable act. Stamp it here rather than
    -- trusting the caller to send honest values.
    IF payment_changed AND settled THEN
      NEW.payment_verified_at := timezone('utc', now());
      NEW.payment_verified_by := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.driver_id IS NOT NULL AND OLD.driver_id::text = auth.uid()::text THEN
    RETURN NEW;
  END IF;

  -- From here the actor is the owning customer.

  -- The only status transition a customer may make is to cancel.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text <> 'cancelled' THEN
    RAISE EXCEPTION 'A customer may only cancel their own order (attempted %)', NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Money and identity are immutable once the order exists.
  IF NEW.total_amount    IS DISTINCT FROM OLD.total_amount
     OR NEW.subtotal     IS DISTINCT FROM OLD.subtotal
     OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
     OR NEW.tax_amount   IS DISTINCT FROM OLD.tax_amount
     OR NEW.customer_id  IS DISTINCT FROM OLD.customer_id
     OR NEW.order_number IS DISTINCT FROM OLD.order_number THEN
    RAISE EXCEPTION 'Order amounts and identity cannot be changed after creation'
      USING ERRCODE = 'check_violation';
  END IF;

  -- A customer may claim a payment reference, never confirm settlement.
  IF payment_changed AND NEW.payment_status::text <> 'pending' THEN
    RAISE EXCEPTION 'Payment settlement is confirmed by the restaurant, not the customer'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Nor may they forge the audit trail on the way past.
  IF NEW.payment_verified_at         IS DISTINCT FROM OLD.payment_verified_at
     OR NEW.payment_verified_by      IS DISTINCT FROM OLD.payment_verified_by
     OR NEW.payment_rejection_reason IS DISTINCT FROM OLD.payment_rejection_reason THEN
    RAISE EXCEPTION 'Payment verification details are written by the restaurant only'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_customer_order_update ON public.orders;

CREATE TRIGGER trg_enforce_customer_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_customer_order_update();

-- ---------------------------------------------------------------------------
-- 6. The customer UPDATE policy from 0006, repeated
--
-- 0007 must be applicable on its own: on the enum deployment 0006 was never
-- run, and without this policy "I've Paid" and "Cancel" match zero rows under
-- RLS and fail silently. Where 0006 did run, these statements are no-ops.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS orders_customer_update_own ON public.orders;

CREATE POLICY orders_customer_update_own ON public.orders
  FOR UPDATE TO authenticated
  USING (
    customer_id::text = auth.uid()::text
    AND status::text IN ('pending', 'accepted')
  )
  WITH CHECK (customer_id::text = auth.uid()::text);
