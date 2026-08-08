-- Behavioural verification of migration 0007 against the enum schema
-- (supabase/phase2_schema.sql) -- the shape the deployed database has.
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

CREATE OR REPLACE FUNCTION pg_temp.check(label text, condition boolean) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF condition THEN RAISE NOTICE 'PASS  %', label;
  ELSE RAISE EXCEPTION 'FAIL  %', label;
  END IF;
END $$;

-- --- fixtures --------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'cust@x.test'),
  ('22222222-2222-2222-2222-222222222222', 'admin@x.test'),
  ('33333333-3333-3333-3333-333333333333', 'other@x.test')
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, phone, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'cust@x.test',  'Cust',  '9000000001', 'customer'),
  ('22222222-2222-2222-2222-222222222222', 'admin@x.test', 'Admin', '9000000002', 'admin'),
  ('33333333-3333-3333-3333-333333333333', 'other@x.test', 'Other', '9000000003', 'customer')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- ===========================================================================
-- 1. 'rejected' is a storable payment_status
-- ===========================================================================
INSERT INTO public.orders (id, order_number, customer_id, customer_name, customer_phone,
                           delivery_address, subtotal, total_amount, payment_method,
                           payment_status, status)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', '#9001',
        '11111111-1111-1111-1111-111111111111', 'Cust', '9876543210',
        'Block A', 200, 200, 'UPI', 'rejected', 'pending');
SELECT pg_temp.check('payment_status accepts ''rejected''',
  (SELECT payment_status::text FROM public.orders
    WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'rejected');

-- ===========================================================================
-- 2. Every pre-0007 value still works -- no existing data broken
-- ===========================================================================
DO $$
DECLARE v text; i integer := 0;
BEGIN
  FOREACH v IN ARRAY ARRAY['pending','completed','failed','refunded'] LOOP
    i := i + 1;
    INSERT INTO public.orders (id, order_number, customer_id, customer_name, customer_phone,
                               delivery_address, subtotal, total_amount, payment_method,
                               payment_status, status)
    VALUES (('bbbbbbbb-0000-0000-0000-00000000000'||i)::uuid, '#902'||i,
            '11111111-1111-1111-1111-111111111111', 'Cust', '9876543210',
            'Block A', 100, 100, 'COD', v::payment_status, 'pending');
  END LOOP;
END $$;
SELECT pg_temp.check('all four legacy payment_status values still insert',
  (SELECT count(*) FROM public.orders
    WHERE id::text LIKE 'bbbbbbbb-%'
      AND payment_status::text IN ('pending','completed','failed','refunded')) = 4);

-- ===========================================================================
-- 3. The enum was widened, not loosened -- garbage is still refused
-- ===========================================================================
DO $$
BEGIN
  INSERT INTO public.orders (order_number, customer_name, customer_phone, delivery_address,
                             subtotal, total_amount, payment_method, payment_status, status)
  VALUES ('#9099', 'X', '1', 'Y', 1, 1, 'COD', 'definitely_not_valid', 'pending');
  RAISE EXCEPTION 'FAIL  an invalid payment_status was accepted';
EXCEPTION WHEN invalid_text_representation OR check_violation THEN
  RAISE NOTICE 'PASS  invalid payment_status still refused by the enum';
END $$;

-- ===========================================================================
-- 4. Enum label ordering preserved (existing sorts/comparisons unaffected)
-- ===========================================================================
SELECT pg_temp.check('legacy payment_status labels kept their original order',
  (SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder)
     FROM pg_enum WHERE enumtypid = 'public.payment_status'::regtype)
   = 'pending,completed,failed,refunded,rejected');
SELECT pg_temp.check('legacy order_status labels kept their original order',
  (SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder)
     FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype)
   = 'pending,cooking,assigned,out_for_delivery,delivered,cancelled,accepted,preparing,ready');

-- ===========================================================================
-- 5. Audit columns exist with the right types
-- ===========================================================================
SELECT pg_temp.check('payment_verified_at is timestamptz',
  (SELECT data_type FROM information_schema.columns
    WHERE table_name='orders' AND column_name='payment_verified_at') = 'timestamp with time zone');
SELECT pg_temp.check('payment_verified_by is uuid',
  (SELECT data_type FROM information_schema.columns
    WHERE table_name='orders' AND column_name='payment_verified_by') = 'uuid');
SELECT pg_temp.check('payment_rejection_reason is text',
  (SELECT data_type FROM information_schema.columns
    WHERE table_name='orders' AND column_name='payment_rejection_reason') = 'text');
SELECT pg_temp.check('payment_verified_by FKs to profiles',
  EXISTS (SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage k USING (constraint_name)
          WHERE tc.table_name='orders' AND tc.constraint_type='FOREIGN KEY'
            AND k.column_name='payment_verified_by'));

-- ===========================================================================
-- 6. Indexes: pre-existing intact, new ones present, all valid
-- ===========================================================================
SELECT pg_temp.check('pre-existing order indexes intact',
  (SELECT count(*) FROM pg_indexes WHERE tablename='orders'
     AND indexname IN ('idx_orders_customer_id','idx_orders_driver_id',
                       'idx_orders_status','idx_orders_created_at')) = 4);
SELECT pg_temp.check('new payment indexes created',
  (SELECT count(*) FROM pg_indexes WHERE tablename='orders'
     AND indexname IN ('orders_payment_status_idx','orders_payment_pending_idx')) = 2);
SELECT pg_temp.check('every index on orders is valid',
  NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
              WHERE c.relname='orders' AND NOT i.indisvalid));

-- ===========================================================================
-- 7. The application's existing queries still run
-- ===========================================================================
SELECT pg_temp.check('fetchOrders-shaped query runs',
  (SELECT count(*) FROM public.orders o
     LEFT JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.is_deleted = false) >= 0);
SELECT pg_temp.check('fetchCustomerOrders-shaped query runs',
  (SELECT count(*) FROM public.orders
    WHERE customer_id = '11111111-1111-1111-1111-111111111111' AND is_deleted = false) = 5);
SELECT pg_temp.check('verification-queue query runs',
  (SELECT count(*) FROM public.orders
    WHERE payment_method = 'UPI' AND payment_status = 'pending' AND is_deleted = false) >= 0);

-- ===========================================================================
-- 8. The full application status vocabulary is storable
-- ===========================================================================
DO $$
DECLARE v text; i integer := 0;
BEGIN
  FOREACH v IN ARRAY ARRAY['pending','accepted','preparing','ready','cooking',
                           'assigned','out_for_delivery','delivered','cancelled'] LOOP
    i := i + 1;
    INSERT INTO public.orders (id, order_number, customer_name, customer_phone, delivery_address,
                               subtotal, total_amount, payment_method, payment_status, status)
    VALUES (('cccccccc-0000-0000-0000-00000000000'||i)::uuid, '#95'||i, 'X', '1', 'Y',
            1, 1, 'COD', 'pending', v::order_status);
  END LOOP;
  RAISE NOTICE 'PASS  every application order_status value is storable';
END $$;

-- ===========================================================================
-- 9. Only a team member may settle a payment
-- ===========================================================================
INSERT INTO public.orders (id, order_number, customer_id, customer_name, customer_phone,
                           delivery_address, subtotal, total_amount, payment_method,
                           payment_status, status)
VALUES ('dddddddd-0000-0000-0000-000000000001', '#9100',
        '11111111-1111-1111-1111-111111111111', 'Cust', '9876543210',
        'Block A', 300, 300, 'UPI', 'pending', 'pending');

-- 9a. the owner may record a UPI reference
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
UPDATE public.orders SET upi_transaction_id = 'TXN123'
 WHERE id = 'dddddddd-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.check('customer may record a UPI reference',
  (SELECT upi_transaction_id FROM public.orders
    WHERE id='dddddddd-0000-0000-0000-000000000001') = 'TXN123');

-- 9b. the owner may NOT mark it completed
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
DO $$
BEGIN
  UPDATE public.orders SET payment_status = 'completed'
   WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'FAIL  a customer marked their own payment completed';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS  customer cannot mark their own payment completed';
END $$;

-- 9c. nor set it to rejected
DO $$
BEGIN
  UPDATE public.orders SET payment_status = 'rejected'
   WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'FAIL  a customer set their own payment to rejected';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS  customer cannot set their own payment to rejected';
END $$;

-- 9d. nor forge the audit trail
DO $$
BEGIN
  UPDATE public.orders SET payment_verified_at = now()
   WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'FAIL  a customer forged payment_verified_at';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASS  customer cannot forge the verification audit trail';
END $$;
RESET ROLE;

-- 9e. an admin may verify, and the server stamps who and when
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
UPDATE public.orders SET payment_status = 'completed'
 WHERE id = 'dddddddd-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.check('admin can verify a payment',
  (SELECT payment_status::text FROM public.orders
    WHERE id='dddddddd-0000-0000-0000-000000000001') = 'completed');
SELECT pg_temp.check('payment_verified_by stamped server-side to the acting admin',
  (SELECT payment_verified_by FROM public.orders
    WHERE id='dddddddd-0000-0000-0000-000000000001')
    = '22222222-2222-2222-2222-222222222222'::uuid);
SELECT pg_temp.check('payment_verified_at stamped server-side',
  (SELECT payment_verified_at IS NOT NULL FROM public.orders
    WHERE id='dddddddd-0000-0000-0000-000000000001'));

-- 9f. an admin may reject, with a reason
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
UPDATE public.orders
   SET payment_status = 'rejected', payment_rejection_reason = 'No transfer received'
 WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.check('admin can reject a payment with a reason',
  (SELECT payment_status::text = 'rejected' AND payment_rejection_reason = 'No transfer received'
     FROM public.orders WHERE id='aaaaaaaa-0000-0000-0000-000000000001'));

-- 9g. a stranger cannot touch the order at all
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE public.orders SET upi_transaction_id = 'HACK'
 WHERE id = 'dddddddd-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.check('RLS blocks a stranger from touching someone else''s order',
  (SELECT upi_transaction_id FROM public.orders
    WHERE id='dddddddd-0000-0000-0000-000000000001') = 'TXN123');


-- ===========================================================================
-- 10. Realtime: orders must be published, or nothing updates without a refresh
-- ===========================================================================
SELECT pg_temp.check('public.orders is published to supabase_realtime',
  EXISTS (SELECT 1 FROM pg_publication_tables
           WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders'));

SELECT 'ALL CHECKS PASSED' AS result;
