import { PostgrestError } from '@supabase/supabase-js';

/**
 * Some tables this application reads from are not provisioned on every
 * deployment -- `gallery_items`, `banners` and `notifications` were historically absent from
 * the production database.
 *
 * PostgREST answers a query against a missing table with PGRST205
 * ("Could not find the table ... in the schema cache"), and a missing column
 * with 42P01/42703. Treating those as hard failures meant every page load threw
 * and logged a console error for a feature that simply is not switched on.
 *
 * A feature that is not provisioned has no data -- that is different from a
 * feature that is broken. This distinguishes the two: absent tables read as
 * empty, while a genuine error (a permission failure, a network fault) still
 * throws, because those need to be seen.
 */
const NOT_PROVISIONED = new Set([
  'PGRST205',
  'PGRST204',
  'PGRST200',
  'PGRST106',
  '42P01',
  '42703',
  '404',
]);

const unprovisionedTables = new Set<string>(['notifications']);

// Load session-cached unprovisioned table names if present
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const cached = window.sessionStorage.getItem('supabase_unprovisioned_tables');
    if (cached) {
      JSON.parse(cached).forEach((t: string) => unprovisionedTables.add(t));
    }
  }
} catch (e) {
  // ignore storage errors
}

function saveStorage() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(
        'supabase_unprovisioned_tables',
        JSON.stringify(Array.from(unprovisionedTables))
      );
    }
  } catch (e) {
    // ignore storage errors
  }
}

export function markTableNotProvisioned(tableName: string): void {
  if (!unprovisionedTables.has(tableName)) {
    unprovisionedTables.add(tableName);
    saveStorage();
    noticeOnce(tableName);
  }
}

export function clearTableNotProvisioned(tableName: string): void {
  unprovisionedTables.delete(tableName);
  saveStorage();
}

export function isTableKnownNotProvisioned(tableName: string): boolean {
  return unprovisionedTables.has(tableName);
}

export function isTableNotProvisioned(error: PostgrestError | any, tableName?: string): boolean {
  if (!error) return false;
  const isNotProv =
    error.status === 404 ||
    error.status === '404' ||
    NOT_PROVISIONED.has(error.code) ||
    NOT_PROVISIONED.has(String(error.status)) ||
    /could not find the table|could not find the .* column|relation .* does not exist|not found|404/i.test(error.message || '');

  if (isNotProv && tableName) {
    markTableNotProvisioned(tableName);
  }

  return isNotProv;
}

/**
 * Returns the rows, or an empty array when the table is not provisioned.
 * Rethrows anything else.
 *
 * @param label used in the one-time console notice, so an operator can tell
 *              which feature is dormant rather than broken.
 */
export function rowsOrEmpty<T>(
  label: string,
  data: T[] | null,
  error: PostgrestError | null
): T[] {
  if (error) {
    if (isTableNotProvisioned(error, label)) {
      return [];
    }
    console.error(`Error fetching ${label}:`, error);
    throw error;
  }
  return data || [];
}

const notified = new Set<string>();
function noticeOnce(label: string) {
  if (notified.has(label)) return;
  notified.add(label);
  console.info(
    `[${label}] Not provisioned on this database — the feature is dormant, not broken. ` +
    `Create the table to enable it.`
  );
}

