/**
 * Display formatting shared by the customer, admin and driver views so that
 * money, dates and ratings read the same everywhere.
 */

export const CURRENCY_SYMBOL = '₹';

/** Money as shown to users, e.g. `formatCurrency(240)` -> "₹240". */
export function formatCurrency(amount: number | string | null | undefined): string {
  const value = typeof amount === 'number' ? amount : Number(amount ?? 0);
  return `${CURRENCY_SYMBOL}${Number.isFinite(value) ? value : 0}`;
}

/** Short clock time used by notifications and order feeds, e.g. "07:45 PM". */
export function formatClockTime(value?: string | number | Date | null): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Long, human readable date, e.g. "Mon, 4 Aug 2025". */
export function formatLongDate(value?: string | number | Date | null): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Timestamp stored on locally created records (orders, feedback, profiles).
 * Kept in one place so every table shows created_at in the same shape.
 */
export function currentTimestamp(): string {
  return new Date().toLocaleString();
}

/** One decimal rating, or a placeholder when the order was never rated. */
export function formatRating(rating: number | null | undefined, fallback = '-'): string {
  return typeof rating === 'number' ? rating.toFixed(1) : fallback;
}
