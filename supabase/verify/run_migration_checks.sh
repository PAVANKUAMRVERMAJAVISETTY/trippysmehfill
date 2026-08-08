#!/bin/bash
# Full verification of migration 0007 against a real PostgreSQL.
# Builds each schema from scratch, applies 0007, asserts behaviour, rolls back.
set -u
S="$(dirname "$0")"
REPO="$(cd "$S/../.." && pwd)"
FAILED=0

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
run()  { # run <db> <file> <label>
  out=$(psql -v ON_ERROR_STOP=1 -q -d "$1" -f "$2" 2>&1)
  if [ $? -eq 0 ]; then echo "  ok    $3"
  else echo "  FAIL  $3"; echo "$out" | grep -iE "error|FAIL" | head -6; FAILED=1; fi
}

# ===========================================================================
step "A. Enum schema (legacy/phase2_schema.sql) — the alternate shape"
# ===========================================================================
psql -q -d postgres -c "DROP DATABASE IF EXISTS t_enum;" -c "CREATE DATABASE t_enum;" >/dev/null 2>&1
run t_enum "$S/00_supabase_stub.sql"                                "supabase stub"
run t_enum "$REPO/supabase/legacy/phase2_schema.sql"                       "phase2_schema.sql"
run t_enum "$REPO/supabase/legacy/phase2_rls.sql"                          "phase2_rls.sql"

# Seed rows that predate 0007, to prove the migration does not disturb them.
psql -v ON_ERROR_STOP=1 -q -d t_enum -c "
INSERT INTO auth.users (id,email) VALUES ('99999999-9999-9999-9999-999999999999','legacy@x.test');
INSERT INTO public.profiles (id,email,full_name,phone,role)
  VALUES ('99999999-9999-9999-9999-999999999999','legacy@x.test','Legacy','9000000009','customer');
INSERT INTO public.orders (id,order_number,customer_id,customer_name,customer_phone,
                           delivery_address,subtotal,total_amount,payment_method,payment_status,status)
VALUES ('ffffffff-0000-0000-0000-000000000001','#0001','99999999-9999-9999-9999-999999999999',
        'Legacy','9000000000','Old Block',150,150,'UPI','completed','delivered');" 2>&1 | grep -i error

BEFORE=$(psql -q -d t_enum -tAc "SELECT payment_status||'|'||status||'|'||total_amount FROM public.orders WHERE order_number='#0001';")

run t_enum "$REPO/supabase/migrations/0007_payment_verification.sql" "apply 0007"

AFTER=$(psql -q -d t_enum -tAc "SELECT payment_status||'|'||status||'|'||total_amount FROM public.orders WHERE order_number='#0001';")
if [ "$BEFORE" = "$AFTER" ] && [ -n "$BEFORE" ]; then
  echo "  ok    pre-existing row untouched by 0007 ($AFTER)"
else
  echo "  FAIL  pre-existing row changed: '$BEFORE' -> '$AFTER'"; FAILED=1
fi

run t_enum "$REPO/supabase/migrations/0007_payment_verification.sql" "re-apply 0007 (idempotent)"

step "A2. Behavioural checks"
out=$(psql -v ON_ERROR_STOP=1 -d t_enum -f "$S/verify_phase2.sql" 2>&1)
echo "$out" | grep -E "PASS|FAIL" | sed 's/^.*NOTICE:  /  /'
if echo "$out" | grep -q "ALL CHECKS PASSED"; then echo "  -> all behavioural checks passed"
else echo "  FAIL  behavioural checks did not complete"; echo "$out" | grep -i error | head -5; FAILED=1; fi

step "A3. Rollback"
run t_enum "$REPO/supabase/migrations/0007_payment_verification_down.sql" "apply 0007 down"
LABELS=$(psql -q -d t_enum -tAc "SELECT string_agg(enumlabel,',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid='public.payment_status'::regtype;")
COLS=$(psql -q -d t_enum -tAc "SELECT count(*) FROM information_schema.columns WHERE table_name='orders' AND column_name LIKE 'payment_verif%' OR (table_name='orders' AND column_name='payment_rejection_reason');")
if [ "$LABELS" = "pending,completed,failed,refunded" ]; then echo "  ok    payment_status enum restored to 4 labels"
else echo "  FAIL  enum after rollback: $LABELS"; FAILED=1; fi
if [ "$COLS" = "0" ]; then echo "  ok    audit columns dropped"
else echo "  FAIL  $COLS audit column(s) still present"; FAILED=1; fi
REMAP=$(psql -q -d t_enum -tAc "SELECT count(*) FROM public.orders WHERE payment_status='failed';")
echo "  ok    $REMAP order(s) remapped rejected -> failed by the rollback"

step "A4. Re-apply after rollback"
run t_enum "$REPO/supabase/migrations/0007_payment_verification.sql" "apply 0007 again"
LABELS=$(psql -q -d t_enum -tAc "SELECT string_agg(enumlabel,',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid='public.payment_status'::regtype;")
if [ "$LABELS" = "pending,completed,failed,refunded,rejected" ]; then echo "  ok    forward migration is repeatable after rollback"
else echo "  FAIL  enum after re-apply: $LABELS"; FAILED=1; fi

# ===========================================================================
step "B. CHECK-constraint schema (migrations 0001–0006)"
# ===========================================================================
psql -q -d postgres -c "DROP DATABASE IF EXISTS t_check;" -c "CREATE DATABASE t_check;" >/dev/null 2>&1
run t_check "$S/00_supabase_stub.sql" "supabase stub"
for f in 0001_core_schema 0002_rls_policies 0003_auth_triggers 0004_anon_lookup_rpcs 0005_signup_trigger_telemetry 0006_customer_order_updates; do
  run t_check "$REPO/supabase/migrations/$f.sql" "$f"
done
run t_check "$REPO/supabase/migrations/0007_payment_verification.sql"      "apply 0007"
run t_check "$REPO/supabase/migrations/0007_payment_verification.sql"      "re-apply 0007 (idempotent)"
CON=$(psql -q -d t_check -tAc "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='orders_payment_status_check';")
if echo "$CON" | grep -q "rejected"; then echo "  ok    CHECK constraint widened with 'rejected'"
else echo "  FAIL  constraint: $CON"; FAILED=1; fi
run t_check "$REPO/supabase/migrations/0007_payment_verification_down.sql" "apply 0007 down"
CON=$(psql -q -d t_check -tAc "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='orders_payment_status_check';")
if echo "$CON" | grep -q "rejected"; then echo "  FAIL  rollback left 'rejected' in the constraint"; FAILED=1
else echo "  ok    CHECK constraint narrowed back"; fi

# ===========================================================================
step "C. Full chain including the merged upstream migrations (0008, 0009)"
# ===========================================================================
# 0008/0009 arrived from upstream numbered 0006/0007, colliding with ours.
# They were renumbered to run after. This proves the whole sequence applies in
# order, on both schema shapes, and that nothing upstream added undoes 0007.
for DB in t_enum t_check; do
  echo "  -- $DB --"
  run $DB "$REPO/supabase/migrations/0008_fix_profiles_rls.sql"        "apply 0008 (profiles RLS)"
  run $DB "$REPO/supabase/migrations/0009_profiles_wallet_referral.sql" "apply 0009 (wallet + referral)"
  run $DB "$REPO/supabase/migrations/0008_fix_profiles_rls.sql"        "re-apply 0008 (idempotent)"
  run $DB "$REPO/supabase/migrations/0009_profiles_wallet_referral.sql" "re-apply 0009 (idempotent)"

  # 0009 replaces handle_new_user_signup(), which is the missing-signup-trigger
  # risk flagged as B6 in the release checklist.
  SIGNUP=$(psql -q -d $DB -tAc "SELECT CASE WHEN to_regprocedure('public.handle_new_user_signup()') IS NULL THEN 'missing' ELSE 'present' END;")
  if [ "$SIGNUP" = "present" ]; then echo "  ok    handle_new_user_signup() present"
  else echo "  FAIL  handle_new_user_signup() $SIGNUP"; FAILED=1; fi

  # The Phase 3 payment guard must survive everything upstream added.
  TRG=$(psql -q -d $DB -tAc "SELECT count(*) FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND tgname='trg_enforce_customer_order_update';")
  if [ "$TRG" = "1" ]; then echo "  ok    payment verification trigger still installed"
  else echo "  FAIL  payment trigger count after 0008/0009: $TRG"; FAILED=1; fi
done

printf '\n'
if [ $FAILED -eq 0 ]; then echo "RESULT: all migration checks passed"; else echo "RESULT: FAILURES ABOVE"; fi
exit $FAILED
