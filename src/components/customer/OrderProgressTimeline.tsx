import React from 'react';
import { Clock, ChefHat, CookingPot, Bike, PackageCheck, XCircle, Hourglass, BadgeCheck } from 'lucide-react';
import { Order } from '../../types';
import { buildTrackingTimeline, TimelineState } from '../../lib/orderStatus';

type TimelineOrder = Pick<Order, 'payment_method' | 'payment_status' | 'status'>;

const stepIcons: Record<string, React.ReactNode> = {
  placed: <Clock className="w-4 h-4" />,
  payment_pending: <Hourglass className="w-4 h-4" />,
  payment_confirmed: <BadgeCheck className="w-4 h-4" />,
  preparing: <CookingPot className="w-4 h-4" />,
  out_for_delivery: <Bike className="w-4 h-4" />,
  delivered: <PackageCheck className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />
};

const nodeClass = (state: TimelineState) => {
  switch (state) {
    case 'done':    return 'bg-emerald-500 border-emerald-500 text-black';
    case 'current': return 'bg-[#C5A059] border-[#C5A059] text-black';
    case 'failed':  return 'bg-rose-500 border-rose-500 text-white';
    default:        return 'bg-[#181818] border-white/10 text-gray-600';
  }
};

const labelClass = (state: TimelineState) => {
  switch (state) {
    case 'done':    return 'text-white';
    case 'current': return 'text-[#C5A059]';
    case 'failed':  return 'text-rose-300';
    default:        return 'text-gray-600';
  }
};

interface OrderProgressTimelineProps {
  order: TimelineOrder;
  /** `compact` drops the per-step blurb for list rows. */
  compact?: boolean;
}

/**
 * Vertical progress timeline for an order.
 *
 * The steps come from `buildTrackingTimeline`, which is where the rule about
 * payment stages appearing only for UPI lives -- this component just draws
 * whatever it is handed, so the sequence is decided in one testable place
 * rather than in JSX.
 *
 * The connector between two completed steps is a scaled element rather than a
 * height animation so the growth runs on the compositor; `motion-reduce`
 * disables it for anyone who has asked for less movement.
 */
export const OrderProgressTimeline: React.FC<OrderProgressTimelineProps> = ({ order, compact = false }) => {
  const steps = buildTrackingTimeline(order);

  if (order.status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
        <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
        <div>
          <p className="text-sm font-black text-rose-300">Order Cancelled</p>
          <p className="text-[11px] text-rose-400/80 mt-0.5">This order will not be delivered.</p>
        </div>
      </div>
    );
  }

  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const connectorFilled = step.state === 'done';

        return (
          <li key={step.key} className="relative flex gap-3.5 pb-6 last:pb-0">
            {/* Connector */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-white/10 overflow-hidden rounded-full"
              >
                <span
                  className={`block w-full h-full origin-top rounded-full transition-transform duration-700 ease-out
                              motion-reduce:transition-none ${
                    connectorFilled ? 'scale-y-100 bg-emerald-500' : 'scale-y-0 bg-emerald-500'
                  }`}
                />
              </span>
            )}

            {/* Node */}
            <span
              className={`relative z-10 w-8 h-8 shrink-0 rounded-full border flex items-center justify-center
                          transition-colors duration-500 motion-reduce:transition-none ${nodeClass(step.state)}`}
            >
              {stepIcons[step.key] ?? <ChefHat className="w-4 h-4" />}
              {step.state === 'current' && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-[#C5A059] opacity-60 animate-ping motion-reduce:hidden"
                />
              )}
            </span>

            <div className="min-w-0 pt-1">
              <p className={`text-xs font-black leading-none ${labelClass(step.state)}`}>
                {step.label}
                {step.state === 'current' && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider">Now</span>
                )}
              </p>
              {!compact && (
                <p className={`text-[11px] mt-1 ${
                  step.state === 'upcoming' ? 'text-gray-600'
                    : step.state === 'failed' ? 'text-rose-400/90'
                    : 'text-gray-400'
                }`}>
                  {step.blurb}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
