/**
 * The single source of truth for how an order's status is presented to a
 * customer, and what they are allowed to do with it.
 *
 * Two vocabularies are in play (see PHASE2_ORDER_REPORT.md): the Phase 2 set
 * and the legacy values the kitchen, admin and driver screens still write.
 * Mapping happens here, once, so no component has to know about the split.
 */

import { Order, OrderStatus, PaymentStatus } from '../types';

export type TrackingStage =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export const TRACKING_STAGES: { stage: TrackingStage; label: string; blurb: string }[] = [
  { stage: 'pending',          label: 'Order Placed',    blurb: 'Waiting for the kitchen to accept.' },
  { stage: 'accepted',         label: 'Accepted',        blurb: 'The kitchen has your order.' },
  { stage: 'preparing',        label: 'Preparing',       blurb: 'Your food is being cooked fresh.' },
  { stage: 'out_for_delivery', label: 'Out for Delivery', blurb: 'On the way to you.' },
  { stage: 'delivered',        label: 'Delivered',       blurb: 'Enjoy your meal!' }
];

/** Collapses every stored status onto the stage the customer sees. */
export function toTrackingStage(status: OrderStatus): TrackingStage {
  switch (status) {
    case 'pending': return 'pending';
    case 'accepted': return 'accepted';
    case 'preparing': return 'preparing';
    case 'cooking': return 'preparing';
    case 'ready': return 'out_for_delivery';
    case 'assigned': return 'out_for_delivery';
    case 'out_for_delivery': return 'out_for_delivery';
    case 'delivered': return 'delivered';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

/** Index into TRACKING_STAGES; -1 for a cancelled order, which has no progress. */
export function trackingStageIndex(status: OrderStatus): number {
  const stage = toTrackingStage(status);
  if (stage === 'cancelled') return -1;
  return TRACKING_STAGES.findIndex((s) => s.stage === stage);
}

/**
 * A customer may cancel only before the kitchen has committed work to it.
 * Mirrors the database trigger in migration 0006 -- if these two disagree the
 * button appears and then fails, so they are meant to be read together.
 */
export function canCustomerCancel(order: Pick<Order, 'status'>): boolean {
  return order.status === 'pending' || order.status === 'accepted';
}

/** Orders still in flight, newest first. */
export function isCurrentOrder(order: Pick<Order, 'status'>): boolean {
  return order.status !== 'delivered' && order.status !== 'cancelled';
}

export function statusLabel(status: OrderStatus): string {
  if (status === 'cancelled') return 'Cancelled';
  const stage = toTrackingStage(status);
  return TRACKING_STAGES.find((s) => s.stage === stage)?.label ?? 'Order Placed';
}

/** Toast copy for a status the order has just moved into. */
export function statusToastCopy(status: OrderStatus): { title: string; description: string } | null {
  switch (toTrackingStage(status)) {
    case 'accepted':
      return { title: 'Kitchen accepted your order', description: 'They are getting started on it now.' };
    case 'preparing':
      return { title: 'Your food is being prepared', description: 'Freshly cooked, coming right up.' };
    case 'out_for_delivery':
      return { title: 'Out for delivery', description: 'Your order is on the way.' };
    case 'delivered':
      return { title: 'Delivered', description: 'Enjoy your meal! Tap to leave feedback.' };
    case 'cancelled':
      return { title: 'Order cancelled', description: 'This order will not be delivered.' };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Payment status vocabulary
// ---------------------------------------------------------------------------

/**
 * The canonical payment_status values, and the only ones this application
 * writes.
 *
 * This set is not a preference -- it is what the database will accept. Migration
 * 0007 constrains the column to exactly these:
 *
 *   payment_status IN ('pending', 'completed', 'failed', 'refunded', 'rejected')
 *
 * Anything outside it is refused with a check violation, so writing 'paid' or
 * 'pending_verification' would fail at the database regardless of what any
 * client believes. See PAYMENT_STATUS_AUDIT.md.
 */
export const PAYMENT_STATUS_VALUES: readonly PaymentStatus[] = [
  'pending',
  'completed',
  'rejected',
  'failed',
  'refunded'
] as const;

/**
 * Non-canonical values that may appear in rows written by another client, and
 * what they mean in canonical terms.
 *
 * A parallel build in this project settled UPI payments as 'paid' and held them
 * at 'pending_verification'. Those rows must still read correctly here rather
 * than falling through to a default and quietly showing the customer the wrong
 * thing -- a payment that was verified must never display as unpaid.
 */
const LEGACY_PAYMENT_STATUS: Record<string, PaymentStatus> = {
  paid: 'completed',
  pending_verification: 'pending',
  // Occasionally seen from gateways and hand-edits.
  success: 'completed',
  successful: 'completed',
  complete: 'completed',
  declined: 'rejected',
  cancelled: 'failed',
  refund: 'refunded'
};

/**
 * Coerces whatever the database returned into a canonical PaymentStatus.
 *
 * Applied on every read. Unknown values fall back to 'pending', which is the
 * safe direction: an unrecognised status shows as awaiting review, so a human
 * looks at it. Defaulting to 'completed' would mean an unreadable value could
 * silently mark an order paid.
 */
export function normalizePaymentStatus(raw: unknown): PaymentStatus {
  if (typeof raw !== 'string') return 'pending';

  const value = raw.trim().toLowerCase();
  if ((PAYMENT_STATUS_VALUES as readonly string[]).includes(value)) {
    return value as PaymentStatus;
  }

  return LEGACY_PAYMENT_STATUS[value] ?? 'pending';
}

/**
 * How the payment currently stands, in words the customer can act on.
 *
 * A UPI order sits at "Pending Verification" no matter what the customer has
 * done -- pressing "I've Paid" records a claim, it does not settle anything.
 * Only a team member confirming the transfer moves it to 'completed', and only
 * then does this say "Payment Confirmed".
 */
export function paymentLabel(order: Pick<Order, 'payment_method' | 'payment_status'>): string {
  switch (order.payment_status) {
    case 'completed':
      // Cash handed over at the door is "Paid"; a verified transfer is
      // "Payment Confirmed", which is the wording the customer was promised
      // while they were waiting for it.
      return order.payment_method === 'COD' ? 'Paid' : 'Payment Confirmed';
    case 'rejected':
      return 'Payment Rejected';
    case 'failed':
      return 'Payment failed';
    case 'refunded':
      return 'Refunded';
    default:
      return order.payment_method === 'COD' ? 'Pay on delivery' : 'Pending Verification';
  }
}

/**
 * The line printed under the payment label. Only a rejection needs one: it is
 * the single payment state the customer has to do something about, and telling
 * them it was refused without telling them what to do next is a dead end.
 */
export function paymentNote(order: Pick<Order, 'payment_method' | 'payment_status'>): string | null {
  if (order.payment_status === 'rejected') return 'Please contact the restaurant.';
  if (order.payment_status === 'failed') return 'Please contact the restaurant.';
  if (order.payment_status === 'pending' && order.payment_method !== 'COD') {
    return 'We are checking your transfer. This usually takes a few minutes.';
  }
  return null;
}

export type PaymentTone = 'success' | 'pending' | 'error' | 'neutral';

/** Colour intent for the payment label, so every screen agrees on it. */
export function paymentTone(order: Pick<Order, 'payment_method' | 'payment_status'>): PaymentTone {
  switch (order.payment_status) {
    case 'completed': return 'success';
    case 'rejected':
    case 'failed':    return 'error';
    case 'refunded':  return 'neutral';
    default:          return order.payment_method === 'COD' ? 'neutral' : 'pending';
  }
}

/**
 * Toast copy for a payment that has just been settled by a team member.
 * Returns null while nothing has been decided -- there is no news to announce.
 */
export function paymentToastCopy(
  status: Order['payment_status']
): { title: string; description: string; tone: 'success' | 'error' } | null {
  switch (status) {
    case 'completed':
      return { title: 'Payment received and verified.', description: 'Your order is confirmed.', tone: 'success' };
    case 'rejected':
      return { title: 'Payment rejected.', description: 'Please contact the restaurant.', tone: 'error' };
    case 'failed':
      return { title: 'Payment failed.', description: 'Please contact the restaurant.', tone: 'error' };
    case 'refunded':
      return { title: 'Payment refunded.', description: 'The amount is on its way back to you.', tone: 'success' };
    default:
      return null;
  }
}

/** True while a UPI order is waiting on someone to check the transfer. */
export function awaitsPaymentVerification(
  order: Pick<Order, 'payment_method' | 'payment_status'>
): boolean {
  return order.payment_method !== 'COD' && order.payment_status === 'pending';
}

// ---------------------------------------------------------------------------
// Tracking timeline
// ---------------------------------------------------------------------------

export type TimelineState = 'done' | 'current' | 'upcoming' | 'failed';

export interface TimelineStep {
  key: string;
  label: string;
  blurb: string;
  state: TimelineState;
}

/**
 * The steps a customer sees while tracking an order.
 *
 * Payment steps appear only for UPI. A cash order has nothing to verify, so
 * showing it "Payment Pending" would invent a wait that does not exist.
 *
 * A rejected payment marks its step 'failed' rather than removing it: the
 * order still exists and the kitchen steps after it are still reachable once
 * the customer sorts the payment out, so truncating the timeline there would
 * misrepresent what happened.
 */
export function buildTrackingTimeline(
  order: Pick<Order, 'payment_method' | 'payment_status' | 'status'>
): TimelineStep[] {
  const idx = trackingStageIndex(order.status);
  const cancelled = order.status === 'cancelled';

  // Position in the kitchen lifecycle: 0 placed, 1 accepted, 2 preparing,
  // 3 out for delivery, 4 delivered.
  const kitchen = (stepIndex: number): TimelineState => {
    if (cancelled) return 'upcoming';
    if (idx > stepIndex) return 'done';
    if (idx === stepIndex) return 'current';
    return 'upcoming';
  };

  const steps: TimelineStep[] = [
    {
      key: 'placed',
      label: 'Order Placed',
      blurb: 'We have your order.',
      state: cancelled ? 'done' : 'done'
    }
  ];

  if (order.payment_method !== 'COD') {
    const settled = order.payment_status === 'completed';
    const refused = order.payment_status === 'rejected' || order.payment_status === 'failed';

    steps.push({
      key: 'payment_pending',
      label: 'Payment Pending',
      blurb: settled || refused
        ? 'Your transfer was reviewed.'
        : 'We are checking your transfer.',
      state: settled || refused ? 'done' : 'current'
    });

    steps.push({
      key: 'payment_confirmed',
      label: refused ? 'Payment Rejected' : 'Payment Confirmed',
      blurb: refused
        ? 'Please contact the restaurant.'
        : settled
          ? 'Payment received and verified.'
          : 'Waiting for the restaurant to confirm.',
      state: refused ? 'failed' : settled ? 'done' : 'upcoming'
    });
  }

  steps.push(
    {
      key: 'preparing',
      label: 'Preparing',
      // 'accepted' is a real stored state but not a step of its own here, so
      // it reads as the kitchen having started on this one.
      blurb: idx === 1 ? 'The kitchen has accepted your order.' : 'Your food is being cooked fresh.',
      state: idx === 1 && !cancelled ? 'current' : kitchen(2)
    },
    {
      key: 'out_for_delivery',
      label: 'Out for Delivery',
      blurb: 'On the way to you.',
      state: kitchen(3)
    },
    {
      key: 'delivered',
      label: 'Delivered',
      blurb: 'Enjoy your meal!',
      state: kitchen(4)
    }
  );

  if (cancelled) {
    steps.push({
      key: 'cancelled',
      label: 'Cancelled',
      blurb: 'This order will not be delivered.',
      state: 'failed'
    });
  }

  return steps;
}
