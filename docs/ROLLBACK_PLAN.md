# Rollback Plan — Phase 3

Read this **before** deploying, not during an incident.

---

## The one thing to understand first

**The application and the database roll back independently, and you usually only
need one of them.**

Migration 0007 is **backward compatible with the pre-Phase-3 application build**.
It only adds an enum value, three nullable columns, two indexes, a publication
entry, and a trigger. The old build queries none of them and keeps working.

So:

| Problem | Roll back the app | Roll back the database |
|---|---|---|
| UI bug, admin screen broken, bad copy | ✅ | ❌ |
| Realtime not delivering | ✅ *(optional)* | ❌ |
| Migration failed partway | ❌ | ✅ |
| A customer can settle their own payment | ✅ | ✅ |
| Existing order data changed unexpectedly | ❌ | ✅ **restore from backup** |

**Reach for the application rollback first.** It is fast, lossless and reversible.
The database rollback is slower and **loses data** — see below.

---

## The database rollback is lossy

PostgreSQL **cannot delete a value from an enum.** Reversing 0007 means building
a narrower type and moving every dependent column onto it, which requires
remapping any row holding a removed value first.

`0007_payment_verification_down.sql` does this automatically, and prints an
affected-row count as a `NOTICE` **before** each remap:

| Before rollback | After rollback | Recoverable? |
|---|---|---|
| `payment_status = 'rejected'` | `'failed'` | No — the distinction is gone |
| `status = 'accepted'` or `'preparing'` | `'cooking'` | No |
| `status = 'ready'` | `'out_for_delivery'` | No |
| `payment_verified_at` / `_by` / `payment_rejection_reason` | **columns dropped** | No |

**Before rolling back the database, save what you are about to destroy:**

```sql
CREATE TABLE IF NOT EXISTS public.phase3_audit_backup AS
SELECT id, order_number, payment_status::text AS payment_status,
       status::text AS status, payment_verified_at, payment_verified_by,
       payment_rejection_reason
  FROM public.orders
 WHERE payment_verified_at IS NOT NULL
    OR payment_status::text = 'rejected'
    OR status::text IN ('accepted','preparing','ready');

SELECT count(*) FROM public.phase3_audit_backup;
```

That table survives the rollback and lets you reconstruct who verified what.

---

## Scenario A · Migration 0007 failed or damaged data

**Symptoms:** `ERROR` during the migration, or the post-migration
`payment_status` counts differ from the pre-migration counts.

**This is the serious one.** The migration is written to be additive and was
verified not to touch existing rows, but if counts moved, trust the backup over
the script.

1. **Stop.** Do not deploy the application. Do not run the down migration yet.
2. Capture the evidence:

```sql
SELECT payment_status, count(*) FROM public.orders GROUP BY 1 ORDER BY 1;
SELECT status, count(*) FROM public.orders GROUP BY 1 ORDER BY 1;
SELECT count(*) FROM public.orders;
```

3. **If existing rows changed → restore from the backup taken in go-live step 1.**
   Supabase Dashboard → Database → Backups → restore to the recorded timestamp.
   Do not attempt a manual repair; the down migration is designed to reverse a
   *successful* 0007, not to repair a partial one.
4. If counts are intact and only the migration errored, 0007 is idempotent —
   read the error, fix the cause, and re-run it. Common cause: *"unsafe use of
   new value"* when a client wraps the file in one transaction; run section 1
   alone first.

**Expected downtime:** a Supabase restore takes minutes to tens of minutes
depending on database size.

---

## Scenario B · Migration applied but verification failed

**Symptoms:** postflight §4.4 shows a missing column, index, trigger or policy,
but order counts are unchanged.

Nothing is damaged. 0007 is idempotent — **re-run it** and read the notices.

If it still does not converge:

```bash
psql "$DATABASE_URL" -f supabase/migrations/0007_payment_verification_down.sql
```

Read the `NOTICE` lines. Then investigate before trying again. Since the
application has not been deployed yet at this point, there is no user impact.

---

## Scenario C · Application deploy failed

**Symptoms:** build fails on the host, `ConfigErrorScreen` on production, blank
page, or console errors.

**Leave the database alone.** 0007 is compatible with the previous build.

**Vercel**

```
Dashboard → Deployments → previous known-good → ⋯ → Promote to Production
```

**Netlify**

```
Dashboard → Deploys → previous known-good → Publish deploy
```

**Git**

```bash
git revert -m 1 <phase-3-merge-commit>
git push origin main
```

Prefer `revert` to `reset` — it preserves history and can itself be reverted.

**Before re-deploying, check the usual cause first:** `VITE_*` variables are
inlined at **build** time. If you changed them in the dashboard and did not
redeploy, the running app still has the old values. The config error screen names
the exact variable at fault.

**Expected downtime:** under a minute; both hosts keep previous builds warm.

---

## Scenario D · Verify or Reject does not work in production

**Symptoms:** admin presses Verify, gets an error or nothing happens.

Diagnose before rolling back — this is usually configuration, not code.

| Error the admin sees | Cause | Fix |
|---|---|---|
| *"could not be verified — may already have been reviewed"* | Working as designed; someone else settled it | None |
| A `check_violation` mentioning `payment_status` | **0007 not applied** | Apply it |
| `invalid input value for enum payment_status: "rejected"` | **0007 not applied** | Apply it |
| Silent failure, zero rows | RLS: the account is not actually an admin | `SELECT role FROM profiles WHERE id = auth.uid();` |
| *"Payment settlement is confirmed by the restaurant, not the customer"* | The account is not a team member | Fix the role |

```sql
-- Is 0007 actually applied?
SELECT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='orders' AND column_name='payment_verified_at') AS has_0007;

-- Is this account really an admin?
SELECT id, email, role FROM public.profiles WHERE email = 'admin@example.com';
```

Only if the code is genuinely at fault: roll back the application (scenario C).
**Leave the database migrated** — it is harmless to the old build.

---

## Scenario E · Realtime not delivering

**Symptoms:** TC-14 fails. Admin does not see new orders; the customer does not
see a verification without refreshing.

**Do not roll back for this.** The application works with manual refresh; only
the live-update behaviour is missing.

1. Is the table published?

```sql
SELECT * FROM pg_publication_tables
 WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders';
```

Empty → re-run 0007, or Dashboard → Database → Replication → toggle `orders`.

2. Is the Realtime service on for the project? Dashboard → Settings → API.
3. Browser console: `CHANNEL_ERROR` or `TIMED_OUT` on the `orders_realtime_*`
   channel? Check Network → WS for an open `realtime/v1/websocket`.
4. Signed-in identity: the channel is keyed on `user?.id`
   ([src/App.tsx:169](../src/App.tsx#L169)) because `postgres_changes` is
   RLS-filtered against the token the socket joined with. Sign out and in again.

**Interim:** tell staff to refresh the Payment Verification tab periodically.
Orders and verifications are not lost — only the push is missing.

---

## Scenario F · A customer can settle their own payment

**The one condition that justifies an immediate full rollback**, because it means
the guarantee Phase 3 exists to provide is not holding.

**Immediately:**

1. Confirm it is real — reproduce TC-11 and capture the request and response.
2. Check the trigger is actually installed and enabled:

```sql
SELECT tgname, tgenabled FROM pg_trigger
 WHERE tgrelid = 'public.orders'::regclass
   AND tgname = 'trg_enforce_customer_order_update';
-- expect one row, tgenabled = 'O'.  Missing or 'D' is the bug.
```

3. If missing or disabled, **re-run 0007** — that alone restores the guard, with
   no application rollback needed.
4. If present and enabled and a customer can *still* settle, treat it as a
   security incident: roll back the application (scenario C), then audit:

```sql
SELECT order_number, customer_name, payment_status, payment_verified_by, updated_at
  FROM public.orders
 WHERE payment_status::text IN ('completed','rejected')
   AND payment_verified_by IS NULL
 ORDER BY updated_at DESC;
```

Rows here settled without an identified verifier. Pre-existing rows from before
0007 will legitimately appear — compare against the baseline recorded in §9 of
[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).

---

## Full database rollback

Only after reading the lossy warning above and running the audit backup query.

```bash
psql "$DATABASE_URL" -f supabase/migrations/0007_payment_verification_down.sql
```

**Watch for these notices before it commits:**

```
NOTICE:  0007 rollback: N order(s) will move payment_status rejected -> failed
NOTICE:  0007 rollback: N order(s) will have status collapsed to the legacy vocabulary
```

**If either N is larger than you expect, abort and restore from backup instead.**

What it does, in order:

1. Drops the trigger and the status-dependent policy — both block the steps below
2. Remaps `rejected` → `failed`, `accepted`/`preparing` → `cooking`, `ready` → `out_for_delivery`
3. Drops the two payment indexes — **must precede the type swap**, because the
   partial index predicate binds `'pending'` to the current enum type
4. Narrows `payment_status` (also handling the shared `payments` table)
5. Narrows `order_status`
6. Drops the three audit columns — **irreversible**
7. Restores 0006's trigger function and the customer update policy

**Not reversed:** `orders` stays in the `supabase_realtime` publication. Removing
it would break realtime for the *previous* build too, which never wanted it gone.
Drop it by hand if you truly need to:

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
```

### Verify the rollback

```sql
SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) AS payment_status_labels
  FROM pg_enum WHERE enumtypid = 'public.payment_status'::regtype;
-- expect: pending,completed,failed,refunded

SELECT count(*) AS audit_columns_remaining
  FROM information_schema.columns
 WHERE table_name = 'orders'
   AND column_name IN ('payment_verified_at','payment_verified_by','payment_rejection_reason');
-- expect: 0
```

Both were verified on PostgreSQL 17 by
`./supabase/verify/run_migration_checks.sh`, including a re-apply afterwards —
**the forward migration is repeatable after a rollback.**

---

## Decision tree

```
Something is wrong
│
├─ Did existing order data change?
│    └─ YES → Scenario A · restore from backup. Stop reading.
│
├─ Did the migration error?
│    └─ YES → Scenario B · re-run 0007 (idempotent)
│
├─ Can a customer settle their own payment?
│    └─ YES → Scenario F · check the trigger; re-run 0007; escalate
│
├─ Is the site broken / misconfigured / blank?
│    └─ YES → Scenario C · roll back the app, leave the database
│
├─ Do Verify / Reject fail?
│    └─ YES → Scenario D · diagnose first, usually 0007 or a role
│
├─ Is only realtime missing?
│    └─ YES → Scenario E · do not roll back; fix the publication
│
└─ Cosmetic or minor
     └─ Note it, fix forward in the next release
```

---

## Contacts and readiness

Fill in before the deploy window.

| Role | Name | Contact |
|---|---|---|
| Deploy owner | | |
| Supabase SQL access | | |
| Hosting dashboard access | | |
| Business decision (accept partial go-live?) | | |

| | Ready |
|---|---|
| Database backup timestamp recorded | ☐ |
| `0007_payment_verification_down.sql` on hand | ☐ |
| Previous known-good deploy identified | ☐ |
| Release tagged in git | ☐ |
| Someone with SQL access reachable | ☐ |
| This document read by whoever is deploying | ☐ |

---

## After any rollback

- ☐ Record what happened and which scenario was used
- ☐ Confirm customers are not stranded — check for orders left at
      *Pending Verification* with no way forward:

```sql
SELECT order_number, customer_name, customer_phone, total_amount, created_at
  FROM public.orders
 WHERE payment_method::text = 'UPI' AND payment_status::text = 'pending'
 ORDER BY created_at;
```

- ☐ **Contact anyone who paid but whose verification was rolled back.** They
      transferred real money; the database state changing is not their problem.
- ☐ Write up the cause before attempting the deploy again
