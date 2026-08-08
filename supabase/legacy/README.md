# Legacy schema files — superseded, kept deliberately

These are **not** the schema the application targets. The authoritative source
is `supabase/migrations/`, applied in numeric order.

| File | What it is |
|---|---|
| `phase2_schema.sql` | An alternate full-schema definition using PostgreSQL ENUM types, `uuid` order ids, an `order_items` table and `is_deleted` soft deletes. |
| `phase2_rls.sql` | Its RLS policies — 33 of them, and **zero table GRANTs**, which is the root cause of the `42501 permission denied for table profiles` signup outage. |
| `phase2_seed.sql` | Seed data for that shape. |
| `fix_profiles_rls.sql` | An early, partial attempt at the grants fix. Superseded by `migrations/0008_fix_profiles_rls.sql`. |

## Why they are kept rather than deleted

Two reasons, both practical:

1. **Migration 0007 is schema-adaptive.** It detects at runtime whether
   `payment_status` is an enum or `text` + CHECK and takes the matching path.
   `supabase/verify/run_migration_checks.sh` proves both paths on a real
   PostgreSQL, and section A of that harness builds a database from
   `phase2_schema.sql` to do it. Deleting these would remove half that coverage.

2. **They document how the confusion arose.** The application code was
   originally written against this shape — it queried `order_items` and
   `is_deleted`, neither of which exists on the live database. That mismatch
   broke every order path until it was resolved in favour of the live schema.
   See `docs/SCHEMA_ALIGNMENT_REPORT.md`.

## Do not apply these to production

The live database is built from the numbered migration chain. Running these
against it would create a second, conflicting definition of the same tables.
