-- 0006 — let a customer act on their own order
--
-- 0002 gave customers SELECT and INSERT on public.orders, but no UPDATE. The
-- only UPDATE policies are orders_team_write (admin/staff) and
-- orders_driver_update (the assigned driver). So a customer cancelling their
-- own order, or recording a UPI reference against it, was silently rejected by
-- RLS -- the request returned success with zero rows matched.
--
-- This adds a single narrow UPDATE policy and a trigger that constrains what
-- may actually change, because a row-level policy alone cannot express
-- "you may set status to cancelled, but not to delivered".
--
-- Idempotent and safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Allow the owner to update their own order while it is still cancellable.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS orders_customer_update_own ON public.orders;

CREATE POLICY orders_customer_update_own ON public.orders
  FOR UPDATE TO authenticated
  USING (
    customer_id::text = auth.uid()::text
    -- Once the kitchen has accepted, the order is theirs to drive.
    AND status IN ('pending', 'accepted')
  )
  WITH CHECK (customer_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 2. Constrain *what* the owner may change.
--
-- The policy above would otherwise let a customer rewrite their own total,
-- delivery address after dispatch, or set status directly to 'delivered'.
-- Team members and drivers bypass this check -- they are governed by their own
-- policies and legitimately move orders through the full lifecycle.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_customer_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Staff, admin and the assigned driver are not restricted here.
  IF public.is_team_member() THEN
    RETURN NEW;
  END IF;

  IF OLD.driver_id IS NOT NULL AND OLD.driver_id::text = auth.uid()::text THEN
    RETURN NEW;
  END IF;

  -- From here the actor is the owning customer.

  -- The only status transition a customer may make is to cancel.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
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
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NEW.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'Payment settlement is confirmed by the kitchen, not the customer'
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
