import { PostgrestError } from '@supabase/supabase-js';

/**
 * Some tables this application reads from are not provisioned on every
 * deployment -- `gallery_items`, `banners` and `notifications` are absent from
 * the production database today.
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
const NOT_PROVISIONED = new Set(['PGRST205', 'PGRST200', '42P01']);

export function isTableNotProvisioned(error: PostgrestError | null): boolean {
  if (!error) return false;
  if (NOT_PROVISIONED.has(error.code)) return true;
  return /could not find the table|relation .* does not exist/i.test(error.message || '');
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
    if (isTableNotProvisioned(error)) {
      noticeOnce(label);
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
