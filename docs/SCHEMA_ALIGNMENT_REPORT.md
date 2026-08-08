# Schema Alignment Report

| | |
|---|---|
| Objective | Make the application match the live production schema. **The database is the source of truth.** |
| Approach | Option B — refactor the code. No production schema was altered to satisfy legacy code. |
| Supabase project | `iptjevfvuwrdbqzgrzxg` |
| Result | ✅ Application aligned · 🔴 **NO-GO** until three existing migrations are applied |

---

## What was wrong

The application queried two objects that do not exist on the production
database:

```
GET /orders?select=*,order_items(*)&is_deleted=eq.false
  PGRST200  "Searched for a foreign key relationship between 'orders' and
             'order_items' in the schema 'public', but no matches were found."

GET /orders?select=*&is_deleted=eq.false
  42703     "column orders.is_deleted does not exist"
```

Every order path was broken: checkout, order history, tracking, admin
verification. Line items were being written to a table that isn't there.

Production stores line items in **`orders.items`** (jsonb) — confirmed present —
and has no soft-delete column on `orders`, `menu_items` or `inventory`.

---

## Task 1 — Audit

Every reference found, and what happened to it.

### `order_items` — 8 references, all removed

| File | Line | Was | Now |
|---|---|---|---|
| `services/supabase/orders.ts` | 20 | `(row.order_items \|\| []).map(...)` | `parseOrderItems(row.items)` |
| | 52 | `.select('*, order_items(*)')` — `fetchOrders` | `.select('*')` |
| | 67 | `.select('*, order_items(*)')` — `fetchCustomerOrders` | `.select('*')` |
| | 124 | `.from('order_items').insert(...)` — `createOrder` | items written into the `orders` insert |
| | 198 | `.select('*, order_items(*)')` — `verifyPayment` | `.select('*')` |
| | 231 | `.select('*, order_items(*)')` — `rejectPayment` | `.select('*')` |
| | 276 | `.select('*, order_items(*)')` — `fetchOrderById` | `.select('*')` |

### `is_deleted` — 6 references, all removed

| File | Line | Was | Now |
|---|---|---|---|
| `services/supabase/orders.ts` | 53 | `.eq('is_deleted', false)` | removed |
| | 69 | `.eq('is_deleted', false)` | removed |
| `services/supabase/menu.ts` | 9 | `.eq('is_deleted', false)` | removed |
| | 113 | `.update({ is_deleted: true })` | `.update({ is_available: false })` |
| `services/supabase/inventory.ts` | 9 | `.eq('is_deleted', false)` | removed |
| | 92 | `.update({ is_deleted: true })` | refuses — see below |

Verified clean:

```
$ grep -rn "order_items\|is_deleted" src/ *.test.ts
  (only explanatory comments remain)
```

---

## Task 2 — `ordersService`

### Reading

`parseOrderItems()` replaces the join. It is deliberately defensive, because
jsonb is schemaless — a row may have been written by your teammate's build, an
older build, or by hand in the SQL editor:

- accepts an array, or a JSON **string** that decodes to one
- accepts `dish_id`/`dish_name` **or** `id`/`name`, which is what the other
  checkout path writes
- coerces numeric fields that arrived as strings
- returns `[]` for anything malformed rather than throwing

That last point matters operationally: **one bad row cannot take down the whole
order list.** Previously a single failure broke every screen that lists orders.

### Writing

`createOrder` is now a **single INSERT** with `items` in the payload.

This removes a real failure mode. The old two-step write could insert the order
header and then fail on its line items, leaving the kitchen a ticket with
nothing to cook — the code compensated by deleting the orphan header. That
compensation, and the window it covered, no longer exist: **the row is either
complete or it does not exist.**

`createOrder` now returns `mapOrderRow(insertedOrder)` — the row the database
actually stored, including its own `id`, `created_at` and column defaults,
rather than the draft we hoped it would store.

### Soft deletes

You said data must never be deleted. Neither change deletes anything:

- **`deleteMenuItem`** sets `is_available = false`. The row stays; the dish
  leaves the menu. Past orders reference these dishes, so removing one would
  rewrite history. `is_available` exists on production and already carries this
  meaning.
- **`deleteInventoryItem`** now **refuses with a clear message**. Production has
  no column to hide an inventory row behind, and a hard `DELETE` is not an
  acceptable substitute — stock rows carry history. It has never worked (the
  column it used doesn't exist), and nothing in the UI calls it, so refusing
  loudly is strictly better than failing opaquely. Giving it a real
  implementation is a schema decision, which is yours.

---

## Tasks 3–5 — Verification against the live database

Read-only probes against production. **No writes were made.**

| Query | Before | After |
|---|---|---|
| `fetchOrders` | `PGRST200` | **HTTP 200** |
| `fetchCustomerOrders` | `PGRST200` | **HTTP 200** |
| `menu_items` fetch | `42703` | **HTTP 200 — 4 dishes** |
| `inventory` fetch | `42703` | **HTTP 200** |

Every column `createOrder` writes was probed individually against production:
`order_number`, `customer_id`, `customer_name`, `customer_phone`,
`delivery_address`, `landmark`, `campus`, `items`, `subtotal`, `tax_amount`,
`delivery_fee`, `total_amount`, `payment_method`, `payment_status`,
`upi_transaction_id`, `status`, `driver_id`, `driver_name`, `driver_phone`,
`kitchen_notes`. **All present.**

### Task 5 — no Phase 3 regression

| | |
|---|---|
| Verify Payment | Unchanged logic. Still guards `payment_status = 'pending'` in the WHERE clause; still omits the audit columns so the trigger stamps them. Only the `select()` changed. |
| Reject Payment | Same. |
| Realtime | Untouched. The subscription refetches via `fetchOrders`, which now works. |
| Kitchen badges | Untouched — they read `paymentLabel()` / `paymentTone()` from the `Order` object, which the refactor still produces identically. |
| Customer timeline | Untouched — 23 `orderStatus` tests still pass. |

**No Phase 3 behaviour changed.** The refactor is confined to how rows are read
from and written to the database.

---

## Task 6 — Migrations

**No new migrations were created.** All three fixes already exist in the chain;
they have simply never been applied to production.

| Need | Existing migration | Applied? |
|---|---|---|
| `profiles` table grants | `0008_fix_profiles_rls.sql` | 🔴 **NO** |
| Signup trigger | `0003_auth_triggers.sql` | ⚠️ **UNKNOWN** |
| `payment_verified_at` / `_by` / `_rejection_reason` | `0007_payment_verification.sql` | 🔴 **NO** |

I cannot apply these — DDL requires database credentials, and the anon key
cannot execute it. **Run them in the Supabase SQL editor, in this order:**

```sql
-- 0. FIRST: back up. Dashboard → Database → Backups. Record the timestamp.

-- 1. Does the signup trigger exist? RC2 depends on it entirely.
SELECT t.tgname, p.proname AS calls, t.tgenabled
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal;
-- expect: on_auth_user_created | handle_new_user_signup | O
-- if empty → run supabase/migrations/0003_auth_triggers.sql

-- 2. Unblocks signup, which is failing on the live site right now
\i supabase/migrations/0008_fix_profiles_rls.sql

-- 3. Enables payment verification. Takes the CHECK-constraint path on this
--    database; verified for exactly this shape on PostgreSQL 17.
\i supabase/migrations/0007_payment_verification.sql

-- 4. Confirm
SELECT column_name FROM information_schema.columns
 WHERE table_name='orders'
   AND column_name IN ('payment_verified_at','payment_verified_by','payment_rejection_reason');
-- expect 3 rows

SELECT grantee, privilege_type FROM information_schema.role_table_grants
 WHERE table_name='profiles' AND grantee='authenticated';
-- expect SELECT, INSERT, UPDATE

SELECT tablename FROM pg_publication_tables
 WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders';
-- expect one row (0007 adds it)
```

`0009_profiles_wallet_referral.sql` is optional — wallet and referral are
schema-only, with no feature consuming them yet.

### Compatibility with the refactor

Migration 0007 adds columns to `orders` and does **not** create `order_items` or
`is_deleted`. It is fully compatible with the aligned code. It detects whether
`payment_status` is an enum or text+CHECK; on this database it takes the CHECK
path, which the verification harness covers (section B).

---

## Task 7 — Supabase key format

**Fixed. Both formats are now accepted.**

The previous guard rejected `sb_publishable_…` and told the operator to replace
it with an anon JWT. That was wrong: `sb_publishable_` is the format Supabase
now issues, and **it was verified working against this project** — every live
probe in this report authenticated with that key and received real responses.
The guard was showing the configuration-error screen to a correctly configured
deployment.

| Key | Accepted | Why |
|---|---|---|
| `eyJhbGci…` (anon JWT) | ✅ | legacy format, still valid |
| `sb_publishable_…` | ✅ | current format, verified working |
| `sb_secret_…` | 🔴 refused | bypasses RLS |
| anything containing `service_role` | 🔴 refused | bypasses RLS |
| anything else | 🔴 refused | not a Supabase client key |

The secret-key checks are **new and deliberate**. A `VITE_*` value is inlined
into the JavaScript bundle every visitor downloads. Shipping a secret key there
would hand every visitor unrestricted database access — so it is refused with an
explanation rather than silently accepted.

No secrets are hardcoded. The client reads only `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`.

---

## Task 8 — Testing

```
tsc --noEmit     clean
node:test        137 / 137 pass, 0 fail   (was 128; +9)
npm run build    ✓ built in 3.29s
```

| Asset | Raw | gzip |
|---|---|---|
| `index-*.js` | 1,290.13 kB | **344.63 kB** |

New suite `orderItems.test.ts` — 9 tests pinning the jsonb parser's contract,
which is where this class of bug hides:

- reads a well-formed jsonb array
- parses a column returned as a JSON **string**
- returns `[]` rather than throwing on `null`, `undefined`, `''`, `'not json'`,
  `'{broken'`, `42`, `true`, `{}`
- an object is not mistaken for a one-item list
- accepts `id`/`name` as well as `dish_id`/`dish_name` — the field names the
  other checkout path writes
- coerces numeric fields that arrived as strings
- missing fields degrade to `0` / `''`, never `NaN` or `undefined`
- totals computed from parsed items match the stored line values

| Flow | Status |
|---|---|
| Customer checkout | ✅ code aligned, live query verified · ⚠️ end-to-end needs a browser |
| Order creation | ✅ single INSERT, every column verified present |
| Realtime | ⚠️ publication unverifiable over REST — 0007 adds it |
| Payment verification | ⚠️ **blocked until 0007 is applied** |
| Kitchen badges | ✅ untouched, builds clean · ⚠️ needs a live order to exercise |

---

## Files changed

| File | Change |
|---|---|
| `src/services/supabase/orders.ts` | `parseOrderItems()` added; 7 joins removed; 2 `is_deleted` filters removed; `createOrder` is now one INSERT |
| `src/services/supabase/menu.ts` | `is_deleted` filter removed; delete → `is_available = false` |
| `src/services/supabase/inventory.ts` | `is_deleted` filter removed; delete refuses instead of destroying |
| `src/lib/supabase.ts` | Accepts both key formats; refuses secret keys |
| `orderItems.test.ts` | **new** — 9 tests |
| `SCHEMA_ALIGNMENT_REPORT.md` | **new** — this document |

Not touched: UI components, Phase 3 payment logic, `orderStatus.ts`, migrations,
database schema.

---

## One source of truth

| | Before | After |
|---|---|---|
| Line items | `order_items` table (absent) **and** `orders.items` (written by the other build) | **`orders.items` only** |
| Soft delete | `is_deleted` (absent on 3 tables) | `is_available` on menu; none elsewhere |
| Schema authority | code, disagreeing with the database | **the production database** |

No duplicate table was created. No duplicate business data was introduced. No
existing data was deleted, and no code path now deletes any.

---

## Remaining risks

| | Risk |
|---|---|
| **R1** | **Payment vocabulary conflict is still unresolved.** Yours: `completed`/`rejected`. Teammate's: `paid`/`pending_verification`. Same column, mutually exclusive. This refactor does not touch it. |
| **R2** | **Both builds now write `orders.items`** — which is the point, but the two disagree on field names. The parser accepts both (`dish_id`/`id`, `dish_name`/`name`), so reads are safe. Agree on one shape. |
| **R3** | Migration numbers have collided three times. His `0008_fix_orders_schema` is applied live; yours is not. |
| **R4** | Signup trigger presence still unverified. If absent, signups silently create no profile. |
| **R5** | Realtime publication unverified. Without it, live updates silently don't happen. |
| **R6** | Manual test plan: 49 cases, 0 executed. |
| **R7** | `deleteInventoryItem` now refuses. No UI calls it, so no user impact — but it is a functional gap. |
| **R8** | The production `orders` table is **empty (0 rows)**, so the refactor has not been exercised against real data. |

---

## GO / NO-GO

### 🔴 NO-GO — but the blocker moved

**The application is now aligned with the production database.** What was five
blockers is three, and none of them are code:

| | Was | Now |
|---|---|---|
| P1 · `order_items` / `is_deleted` | 🔴 blocker | ✅ **RESOLVED** — verified live |
| P2 · `profiles` grants | 🔴 blocker | 🔴 apply `0008` |
| P3 · migration 0007 | 🔴 blocker | 🔴 apply `0007` |
| P4 · signup trigger | 🔴 unknown | ⚠️ verify, apply `0003` if absent |
| P5 · not merged to `main` | 🔴 blocker | 🔴 merge PR #2 |
| Key format | ⚠️ issue | ✅ **RESOLVED** |

### Path to GO

```
1. Back up the database                                    DBA
2. Verify on_auth_user_created; apply 0003 if absent       DBA
3. Apply 0008_fix_profiles_rls.sql   → unblocks signup     DBA
4. Apply 0007_payment_verification.sql → unblocks payments DBA
5. Confirm Realtime on orders in the dashboard             DBA
6. Confirm the Vercel anon key (either format now works)   Dev
7. Merge PR #2, tag rc2, deploy                            Dev
8. Execute the manual test plan                            QA
     must pass: TC-04 TC-05 TC-09 TC-10 TC-11 TC-13 TC-14 TC-19
9. Resolve R1 with your teammate before he merges          You
```

Steps 2–5 are SQL-editor work I cannot perform. Everything in the codebase that
was blocking deployment is fixed and verified.
