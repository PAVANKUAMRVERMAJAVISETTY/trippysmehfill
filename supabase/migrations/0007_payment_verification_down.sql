-- 0007 rollback — reverses 0007_payment_verification.sql
--
-- Like the forward migration this detects whether the deployment uses enum
-- types (phase2_schema.sql) or text + CHECK constraints (0001_core_schema.sql)
-- and takes the matching path.
--
-- TWO STEPS ARE LOSSY, deliberately and unavoidably:
--
--   * PostgreSQL cannot delete a value from an enum. Reversing an enum
--     widening means building a narrower type and moving every dependent
--     column onto it, so rows holding a removed value must first be remapped.
--     'rejected' becomes 'failed' -- the nearest surviving meaning.
--   * 'accepted' and 'preparing' collapse to 'cooking', 'ready' collapses to
--     'out_for_delivery', which is the legacy vocabulary 0001 and phase2
--     expected.
--
-- Each remap prints the number of affected rows before it runs. Read those
-- notices before treating the rollback as complete.
--
-- Section 5 drops the audit columns and is irreversible. Copy them out first
-- if the record of who verified what has any value to you.

-- ---------------------------------------------------------------------------
-- 0. Stand the trigger and the status-dependent policy down
--
-- Two things would otherwise block the sections below:
--
--   * The remaps rewrite payment_status on rows the trigger guards. If the
--     0006 version of the function is in place it has no direct-session bypass
--     and refuses them outright.
--   * orders_customer_update_own reads `status IN ('pending','accepted')`.
--     PostgreSQL will not alter the type of a column named in a live policy
--     ("cannot alter type of a column used in a policy definition").
--
-- Both are recreated in section 6.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_enforce_customer_order_update ON public.orders;
DROP POLICY  IF EXISTS orders_customer_update_own ON public.orders;

-- ---------------------------------------------------------------------------
-- 1. Report what is about to be remapped
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  n_rejected integer;
  n_status   integer;
BEGIN
  SELECT count(*) INTO n_rejected FROM public.orders WHERE payment_status::text = 'rejected';
  SELECT count(*) INTO n_status   FROM public.orders WHERE status::text IN ('accepted', 'preparing', 'ready');

  RAISE NOTICE '0007 rollback: % order(s) will move payment_status rejected -> failed', n_rejected;
  RAISE NOTICE '0007 rollback: % order(s) will have status collapsed to the legacy vocabulary', n_status;
END $$;

UPDATE public.orders SET payment_status = 'failed'          WHERE payment_status::text = 'rejected';
UPDATE public.orders SET status         = 'cooking'          WHERE status::text IN ('accepted', 'preparing');
UPDATE public.orders SET status         = 'out_for_delivery' WHERE status::text = 'ready';

-- The payments table shares the payment_status type.
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    UPDATE public.payments SET payment_status = 'failed' WHERE payment_status::text = 'rejected';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Drop the indexes 0007 added
--
-- This must happen BEFORE the enum is narrowed. orders_payment_pending_idx has
-- the predicate `payment_status = 'pending'::payment_status`, so the literal is
-- bound to the current type. Rebuilding the index during ALTER COLUMN TYPE
-- would then compare the new type against the old one and fail with
-- "operator does not exist: payment_status__new = payment_status".
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS public.orders_payment_pending_idx;
DROP INDEX IF EXISTS public.orders_payment_status_idx;

-- ---------------------------------------------------------------------------
-- 3. Narrow payment_status
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  is_enum boolean;
BEGIN
  SELECT data_type = 'USER-DEFINED' INTO is_enum
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status';

  IF NOT is_enum THEN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (
      payment_status IN ('pending', 'completed', 'failed', 'refunded')
    );
    RETURN;
  END IF;

  -- Enum path: build the narrower type, move every dependent column onto it,
  -- then swap names.
  CREATE TYPE public.payment_status__new AS ENUM ('pending', 'completed', 'failed', 'refunded');

  ALTER TABLE public.orders ALTER COLUMN payment_status DROP DEFAULT;
  ALTER TABLE public.orders
    ALTER COLUMN payment_status TYPE public.payment_status__new
    USING payment_status::text::public.payment_status__new;

  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments ALTER COLUMN payment_status DROP DEFAULT;
    ALTER TABLE public.payments
      ALTER COLUMN payment_status TYPE public.payment_status__new
      USING payment_status::text::public.payment_status__new;
  END IF;

  DROP TYPE public.payment_status;
  ALTER TYPE public.payment_status__new RENAME TO payment_status;

  ALTER TABLE public.orders
    ALTER COLUMN payment_status SET DEFAULT 'pending'::public.payment_status;
  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments
      ALTER COLUMN payment_status SET DEFAULT 'pending'::public.payment_status;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Narrow order_status
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  is_enum boolean;
BEGIN
  SELECT data_type = 'USER-DEFINED' INTO is_enum
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status';

  IF NOT is_enum THEN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
      status IN ('pending', 'cooking', 'assigned', 'out_for_delivery', 'delivered', 'cancelled')
    );
    RETURN;
  END IF;

  CREATE TYPE public.order_status__new AS ENUM
    ('pending', 'cooking', 'assigned', 'out_for_delivery', 'delivered', 'cancelled');

  ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.orders
    ALTER COLUMN status TYPE public.order_status__new
    USING status::text::public.order_status__new;

  DROP TYPE public.order_status;
  ALTER TYPE public.order_status__new RENAME TO order_status;

  ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending'::public.order_status;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Drop the audit columns (irreversible)
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_rejection_reason;
ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_verified_by;
ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_verified_at;

-- ---------------------------------------------------------------------------
-- 6. Restore 0006's trigger and policy
--
-- The 0007 function referenced audit columns that no longer exist, so it
-- cannot remain in place.
--
-- The policy is restored in 0006's form. If you are rolling back past 0006 as
-- well -- or onto a deployment where 0006 never ran, in which case 0007
-- introduced it -- drop orders_customer_update_own by hand afterwards. Leaving
-- it is the safer default: without it a customer cannot cancel their own order
-- or record a UPI reference, and both fail silently under RLS.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_customer_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_team_member() THEN
    RETURN NEW;
  END IF;

  IF OLD.driver_id IS NOT NULL AND OLD.driver_id::text = auth.uid()::text THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text <> 'cancelled' THEN
    RAISE EXCEPTION 'A customer may only cancel their own order (attempted %)', NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.total_amount    IS DISTINCT FROM OLD.total_amount
     OR NEW.subtotal     IS DISTINCT FROM OLD.subtotal
     OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
     OR NEW.tax_amount   IS DISTINCT FROM OLD.tax_amount
     OR NEW.customer_id  IS DISTINCT FROM OLD.customer_id
     OR NEW.order_number IS DISTINCT FROM OLD.order_number THEN
    RAISE EXCEPTION 'Order amounts and identity cannot be changed after creation'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NEW.payment_status::text <> 'pending' THEN
    RAISE EXCEPTION 'Payment settlement is confirmed by the kitchen, not the customer'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_customer_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_customer_order_update();

CREATE POLICY orders_customer_update_own ON public.orders
  FOR UPDATE TO authenticated
  USING (
    customer_id::text = auth.uid()::text
    AND status::text IN ('pending', 'accepted')
  )
  WITH CHECK (customer_id::text = auth.uid()::text);
