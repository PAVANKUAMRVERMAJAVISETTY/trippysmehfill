import { OrderStatus } from '../types';

/**
 * Single source of truth for how an order status is worded and coloured.
 *
 * Badges live in the admin tables (light surfaces) and in the customer/driver
 * panels (dark surfaces), so each status has one palette per tone. Only colour
 * utilities are returned -- callers keep their own spacing, radius and border
 * width classes.
 */
export type BadgeTone = 'light' | 'dark';

const LIGHT_BADGES: Record<OrderStatus, string> = {
  pending: 'bg-orange-100 text-orange-800',
  cooking: 'bg-amber-100 text-amber-800',
  assigned: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800'
};

const DARK_BADGES: Record<OrderStatus, string> = {
  pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  cooking: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  assigned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  out_for_delivery: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
};

const FALLBACK_BADGE: Record<BadgeTone, string> = {
  light: 'bg-orange-100 text-orange-800',
  dark: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
};

export function orderStatusBadgeClass(status: string | null | undefined, tone: BadgeTone = 'light'): string {
  const palette = tone === 'dark' ? DARK_BADGES : LIGHT_BADGES;
  return palette[status as OrderStatus] ?? FALLBACK_BADGE[tone];
}

/** "out_for_delivery" -> "out for delivery" (badges apply their own casing). */
export function formatOrderStatus(status: string | null | undefined): string {
  return (status ?? '').replace(/_/g, ' ');
}

/** Statuses an order can still move through, used to drive "in progress" UI. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['pending', 'cooking', 'assigned', 'out_for_delivery'];

export function isActiveOrderStatus(status: string | null | undefined): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status as OrderStatus);
}
