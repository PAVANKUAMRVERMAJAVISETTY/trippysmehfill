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
    case 'done':    return 'bg-[#198754] border-[#146C43] text-white shadow-sm';
    case 'current': return 'bg-[#D95F0A] border-[#B94D00] text-white shadow-sm';
    case 'failed':  return 'bg-[#C0392B] border-[#922B21] text-white shadow-sm';
    default:        return 'bg-[#F7F4EC] border-[#DDD6C8] text-[#5F6368]';
  }
};

const labelClass = (state: TimelineState) => {
  switch (state) {
    case 'done':    return 'text-[#146C43] font-bold';
    case 'current': return 'text-[#D95F0A] font-black';
    case 'failed':  return 'text-[#922B21] font-bold';
    default:        return 'text-[#5F6368]';
  }
};

interface OrderProgressTimelineProps {
  order: TimelineOrder;
  /** `compact` drops the per-step blurb for list rows. */
  compact?: boolean;
}

export const OrderProgressTimeline: React.FC<OrderProgressTimelineProps> = ({ order, compact = false }) => {
  const steps = buildTrackingTimeline(order);

  if (order.status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 bg-[#FDE2E1] border border-[#F5A6A1] rounded-2xl shadow-sm">
        <XCircle className="w-6 h-6 text-[#C0392B] shrink-0" />
        <div>
          <p className="text-sm font-black text-[#922B21]">Order Cancelled</p>
          <p className="text-[11px] text-[#922B21]/90 mt-0.5 font-medium">This order will not be delivered.</p>
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
                className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-[#DDD6C8] overflow-hidden rounded-full"
              >
                <span
                  className={`block w-full h-full origin-top rounded-full transition-transform duration-700 ease-out
                              motion-reduce:transition-none ${
                    connectorFilled ? 'scale-y-100 bg-[#198754]' : 'scale-y-0 bg-[#198754]'
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
                  className="absolute inset-0 rounded-full bg-[#D95F0A] opacity-40 animate-ping motion-reduce:hidden"
                />
              )}
            </span>

            <div className="min-w-0 pt-1">
              <p className={`text-xs font-black leading-none ${labelClass(step.state)}`}>
                {step.label}
                {step.state === 'current' && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#D95F0A] bg-[#FFF0CC] px-2 py-0.5 rounded-full border border-[#E8C66A]">Now</span>
                )}
              </p>
              {!compact && (
                <p className={`text-[11px] mt-1 ${
                  step.state === 'upcoming' ? 'text-[#5F6368]'
                    : step.state === 'failed' ? 'text-[#922B21]'
                    : 'text-[#5F6368]'
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
