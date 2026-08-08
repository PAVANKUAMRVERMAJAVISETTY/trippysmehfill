# Migration 0007 — Payment Verification

| | |
|---|---|
| Forward | `supabase/migrations/0007_payment_verification.sql` |
| Rollback | `supabase/migrations/0007_payment_verification_down.sql` |
| Verification harness | `supabase/verify/run_migration_checks.sh` |
| Status | Written and verified against a real PostgreSQL 17. **Not yet applied to your Supabase project.** |

---

## The thing you need to know first

**This repository contains two different, incompatible schemas, and the numbered
migration chain is not the one your database is running.**

| | `supabase/migrations/0001_core_schema.sql` | `supabase/phase2_schema.sql` |
|---|---|---|
| `orders.id` | `text` | `uuid` |
| `orders.payment_status` | `text` + CHECK constraint | **ENUM type `payment_status`** |
| `orders.status` | `text` + CHECK constraint | **ENUM type `order_status`** |
| `orders.is_deleted` | absent | present |
| line items | `orders.items` jsonb column | separate `order_items` table |
| indexes | `orders_customer_id_idx`, … | `idx_orders_customer_id`, … |

`src/services/supabase/orders.ts` queries `order_items` and filters on
`is_deleted`. Neither exists in the numbered chain. **Your deployed database was
built from `phase2_schema.sql`.**

That mattered enormously here, because widening an enum and widening a CHECK
constraint are completely different operations. A migration written for the
numbered chain would have run without error against your database and changed
nothing that matters.

**0007 detects which shape it is running against and does the right one.** It is
correct and idempotent on both.

---

## What the forward migration does

### 1. Makes `'rejected'` a storable `payment_status`
- Enum deployment: `ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'rejected'`
- CHECK deployment: drops and re-adds `orders_payment_status_check` with the extra value

Additive either way. The four existing labels keep their original sort order, so
any query that orders or compares on `payment_status` behaves exactly as before.

### 2. Widens `order_status` to the vocabulary the application actually uses

Not payment work, but it blocked Phase 3's timeline, so it is fixed here.

Both base schemas allow only
`('pending','cooking','assigned','out_for_delivery','delivered','cancelled')`.
The application also speaks `'accepted'`, `'preparing'` and `'ready'` —
`toTrackingStage()` maps them, `canCustomerCancel()` tests for `'accepted'`, and
migration 0006's own policy reads `status IN ('pending','accepted')`.

Under the old vocabulary an order could never *reach* `'accepted'`, so **half of
0006's customer-cancel policy matched nothing.** 0007 adds the three values.
Purely additive; the six originals stay legal.

### 3. Adds three audit columns

```
payment_verified_at        timestamptz   NULL = never reviewed
payment_verified_by        uuid          → profiles(id) ON DELETE SET NULL
payment_rejection_reason   text
```

All nullable with no default, so every pre-existing row reads as "never
reviewed", which is the truth about them. No backfill, no table rewrite.

### 4. Indexes the verification queue

```sql
orders_payment_status_idx   ON orders (payment_status)
orders_payment_pending_idx  ON orders (created_at DESC)
                            WHERE payment_method = 'UPI' AND payment_status = 'pending'
```

The partial index covers exactly the query the admin screen runs.

### 5. Publishes `orders` to Realtime

Phase 3 requires customer, admin and kitchen screens to update without a
refresh. That depends on `public.orders` being a member of the
`supabase_realtime` publication. `0002_rls_policies.sql` adds it — but
`phase2_schema.sql` / `phase2_rls.sql`, which built your database, never do.

On that deployment realtime works only if somebody remembered to tick the box in
the dashboard. If they did not, the client subscribes successfully and then
receives nothing, which looks *exactly* like "no one has verified it yet". 0007
adds the table if it is missing and says so in a notice.

`REPLICA IDENTITY` is deliberately left at its default. `FULL` would be needed to
receive the previous row on UPDATE/DELETE, but the client refetches on any event
rather than diffing payloads, so it would buy nothing and add WAL volume to
every order write.

### 6. Enforces "only a team member may settle a payment" in the database

A row-level policy cannot express *"you may set status to cancelled, but not to
delivered"*, so the rule lives in a `BEFORE UPDATE` trigger. 0007 replaces 0006's
function with one that additionally:

- **stamps `payment_verified_at` / `payment_verified_by` server-side** from
  `auth.uid()`, so the audit trail records the actor the database saw rather
  than one the client asserted;
- **refuses a settlement from a non-team member**, including a direct PostgREST
  call that never touches the UI;
- **refuses any client-supplied write to the audit columns**;
- carries over 0006's customer rules unchanged.

It also re-creates 0006's `orders_customer_update_own` policy, so 0007 is
applicable on its own — on the enum deployment 0006 was never run, and without
that policy "I've Paid" and "Cancel" match zero rows under RLS and fail silently.

---

## Verification

`supabase/verify/run_migration_checks.sh` builds each schema from scratch on a
local PostgreSQL, applies the full chain, asserts behaviour, rolls back, and
re-applies. Run it with any local Postgres available:

```bash
./supabase/verify/run_migration_checks.sh
```

It needs `psql` and a reachable local server. It creates and drops two scratch
databases (`t_enum`, `t_check`) and touches nothing else.

`supabase/verify/00_supabase_stub.sql` stands in for the parts of a Supabase
database the migrations assume — the `auth` schema, `auth.uid()`, the PostgREST
roles and their grants, the `supabase_realtime` publication. `auth.uid()` is a
faithful copy of the real one: it reads the JWT claims GUC that PostgREST sets
per request, so tests impersonate by setting `request.jwt.claims` exactly as a
real request would.

### Result — PostgreSQL 17.10, both schemas

```
== A. Enum schema (phase2_schema.sql) — what the deployed database uses
  ok    phase2_schema.sql / phase2_rls.sql
  ok    apply 0007
  ok    pre-existing row untouched by 0007 (completed|delivered|150.00)
  ok    re-apply 0007 (idempotent)

== A2. Behavioural checks
  PASS  payment_status accepts 'rejected'
  PASS  all four legacy payment_status values still insert
  PASS  invalid payment_status still refused by the enum
  PASS  legacy payment_status labels kept their original order
  PASS  legacy order_status labels kept their original order
  PASS  payment_verified_at is timestamptz
  PASS  payment_verified_by is uuid
  PASS  payment_rejection_reason is text
  PASS  payment_verified_by FKs to profiles
  PASS  pre-existing order indexes intact
  PASS  new payment indexes created
  PASS  every index on orders is valid
  PASS  fetchOrders-shaped query runs
  PASS  fetchCustomerOrders-shaped query runs
  PASS  verification-queue query runs
  PASS  every application order_status value is storable
  PASS  customer may record a UPI reference
  PASS  customer cannot mark their own payment completed
  PASS  customer cannot set their own payment to rejected
  PASS  customer cannot forge the verification audit trail
  PASS  admin can verify a payment
  PASS  payment_verified_by stamped server-side to the acting admin
  PASS  payment_verified_at stamped server-side
  PASS  admin can reject a payment with a reason
  PASS  RLS blocks a stranger from touching someone else's order
  PASS  public.orders is published to supabase_realtime

== A3. Rollback          ok, enum restored to 4 labels, audit columns dropped
== A4. Re-apply          ok, forward migration repeatable after rollback

== B. CHECK-constraint schema (migrations 0001–0006)
  ok    0001 … 0006, apply 0007, re-apply, widen, roll back, narrow back

RESULT: all migration checks passed
```

### Three real bugs the harness caught

Worth recording, because none would have been visible by reading the SQL.

1. **Rollback could not narrow the enum.** `orders_payment_pending_idx` has the
   predicate `payment_status = 'pending'::payment_status`, so the literal is
   bound to the current type. Rebuilding it during `ALTER COLUMN TYPE` failed
   with *"operator does not exist: payment_status__new = payment_status"*. The
   index drop now happens **before** the type swap.

2. **Rollback could not narrow `order_status` either** — *"cannot alter type of a
   column used in a policy definition"*, because `orders_customer_update_own`
   reads `status IN ('pending','accepted')`. The policy is now dropped up front
   and recreated at the end.

3. **The trigger's maintenance bypass was inverted.** The first version used
   `current_user NOT IN ('anon','authenticated')` to let direct database sessions
   through. Inside a `SECURITY DEFINER` function `current_user` is the *function
   owner*, not the caller — so the condition was always true and the guard was
   disabled for everyone, including customers. The harness caught it as
   *"FAIL a customer marked their own payment completed"*. It now keys off
   `request.jwt.claims`, which PostgREST sets per request and a direct session
   never does.

---

## Applying it

Paste `0007_payment_verification.sql` into the Supabase SQL editor and run it.
Watch for the `NOTICE` lines — they say which path was taken:

```
0007: payment_status enum extended with 'rejected'
0007: order_status enum extended with accepted/preparing/ready
0007: public.orders added to the supabase_realtime publication
0007: created fallback public.is_team_member()
```

**If your client reports "unsafe use of new value"**, it wrapped the file in a
single transaction. PostgreSQL forbids *using* a new enum value in the same
transaction that added it. The file never compares against `'rejected'` at DDL
time so this should not arise, but if it does, run section 1 on its own first.

### Migration 0006

0006 was never applied. You no longer need to run it separately — 0007
supersedes it: it recreates both the policy and the trigger function, in their
Phase 3 form. Running 0006 first is harmless but redundant.

---

## Rolling back

```bash
psql "$DATABASE_URL" -f supabase/migrations/0007_payment_verification_down.sql
```

**Two steps are lossy, unavoidably.** PostgreSQL cannot delete a value from an
enum, so reversing an enum widening means building a narrower type and moving
every dependent column onto it — which requires remapping rows that hold a
removed value first:

| Before | After rollback |
|---|---|
| `payment_status = 'rejected'` | `'failed'` |
| `status = 'accepted'` or `'preparing'` | `'cooking'` |
| `status = 'ready'` | `'out_for_delivery'` |

Both remaps print an affected-row count as a `NOTICE` **before** they run. Read
those before treating the rollback as complete.

Section 5 drops the audit columns and is irreversible — copy them out first if
the record of who verified what has any value to you.

`payment_status` is shared with the `payments` table, which the rollback handles
alongside `orders`.

---

## Notes and caveats

- **`orders.customer_id` is `uuid` on the deployed schema** but typed `string` in
  `src/types/index.ts` and compared with `::text` casts in every policy. That
  works, but it is why the casts are there; do not remove them.
- **`created_at` is `text` in the numbered chain and `timestamptz` in phase2.**
  Any code parsing it must tolerate an unparseable value. `OrderTrackerModal`
  falls back to a bare duration rather than inventing a clock time.
- **The two schema files should be reconciled.** Carrying two definitions of the
  same tables means every future migration has to be written twice, as this one
  was. That is a larger piece of work than Phase 3 and was left alone.
- The harness only proves the SQL. It does not prove Supabase's Realtime service
  is enabled for your project, which is a dashboard setting.
