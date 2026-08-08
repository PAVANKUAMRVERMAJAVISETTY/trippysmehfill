import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ShoppingBag, Truck, RotateCcw, XCircle, Download, Loader2,
  ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { Order, MenuItem } from '../../types';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { ordersService } from '../../services/supabase';
import { OrderProgressTimeline } from './OrderProgressTimeline';
import { canCustomerCancel, isCurrentOrder, statusLabel, paymentLabel, paymentTone } from '../../lib/orderStatus';
import { downloadReceiptPdf } from '../../lib/receipt';

interface MyOrdersViewProps {
  orders: Order[];
  menuItems: MenuItem[];
  onTrackOrder: (order: Order) => void;
  onOrderCancelled: (orderId: string) => void;
  onBackToMenu: () => void;
  onGoToCheckout: () => void;
}

type TabKey = 'current' | 'previous';

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({
  orders,
  menuItems,
  onTrackOrder,
  onOrderCancelled,
  onBackToMenu,
  onGoToCheckout
}) => {
  const { addToCart, clearCart, settings } = useCart();
  const { showToast } = useToast();

  const [tab, setTab] = useState<TabKey>('current');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { current, previous } = useMemo(() => {
    const sorted = [...orders].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return {
      current: sorted.filter(isCurrentOrder),
      previous: sorted.filter(o => !isCurrentOrder(o))
    };
  }, [orders]);

  const visible = tab === 'current' ? current : previous;
  const business = { name: settings.kitchen_name, upiId: settings.restaurant_upi_id };

  /**
   * Rebuilds the cart from a past order.
   *
   * Matched against the live menu by id, then by name, because a dish can be
   * recreated with a new id. Anything no longer on the menu (or now unavailable)
   * is skipped and named, rather than silently dropped -- a customer who
   * reorders and gets three of four items should be told which one is missing.
   */
  const handleReorder = (order: Order) => {
    const missing: string[] = [];
    const matches: { item: MenuItem; quantity: number }[] = [];

    for (const line of order.items) {
      const match = menuItems.find(
        m => m.id === line.dish_id || m.name.toLowerCase() === line.dish_name.toLowerCase()
      );
      if (match && match.is_available) {
        matches.push({ item: match, quantity: line.quantity });
      } else {
        missing.push(line.dish_name);
      }
    }

    if (matches.length === 0) {
      showToast({
        title: 'Nothing to reorder',
        description: 'None of these items are on the menu right now.',
        tone: 'error'
      });
      return;
    }

    clearCart();
    for (const { item, quantity } of matches) {
      for (let i = 0; i < quantity; i++) addToCart(item);
    }

    showToast({
      title: 'Added to your cart',
      description: missing.length > 0
        ? `Unavailable and skipped: ${missing.join(', ')}.`
        : `${matches.length} item${matches.length === 1 ? '' : 's'} from ${order.order_number}.`,
      tone: missing.length > 0 ? 'info' : 'success'
    });

    onGoToCheckout();
  };

  const handleCancel = async (order: Order) => {
    setBusyId(order.id);
    try {
      await ordersService.cancelOrder(order.id);
      onOrderCancelled(order.id);
      showToast({ title: `${order.order_number} cancelled`, tone: 'success' });
    } catch (err: any) {
      showToast({
        title: 'Could not cancel',
        description: err?.message || 'Please try again.',
        tone: 'error',
        duration: 7000
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleInvoice = async (order: Order) => {
    setBusyId(order.id);
    try {
      await downloadReceiptPdf(order, business);
    } catch {
      showToast({ title: 'Could not build the invoice', tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="flex-1 px-4 py-6 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">

        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMenu}
            aria-label="Back to menu"
            className="w-11 h-11 shrink-0 rounded-2xl bg-[#181818] border border-white/10 text-gray-400 hover:text-white transition flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white font-serif tracking-tight">My Orders</h1>
            <p className="text-[11px] sm:text-xs text-gray-400">Track what's coming and reorder what you loved.</p>
          </div>
        </header>

        {/* Tabs */}
        <div role="tablist" aria-label="Order history" className="grid grid-cols-2 gap-2 bg-[#121212] border border-white/10 rounded-2xl p-1.5">
          {([
            { key: 'current' as const, label: 'Current', count: current.length },
            { key: 'previous' as const, label: 'Previous', count: previous.length }
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`min-h-[44px] px-4 rounded-xl text-xs font-black transition ${
                tab === key ? 'bg-[#C5A059] text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
              <span className={`ml-1.5 ${tab === key ? 'text-black/60' : 'text-gray-600'}`}>({count})</span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-10 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-[#C5A059] mx-auto" />
            <p className="text-sm font-bold text-white">
              {tab === 'current' ? 'No orders in progress' : 'No past orders yet'}
            </p>
            <p className="text-xs text-gray-400">
              {tab === 'current'
                ? 'Anything you order will show up here while it is on the way.'
                : 'Delivered and cancelled orders are kept here.'}
            </p>
            <button
              type="button"
              onClick={onBackToMenu}
              className="mt-1 min-h-[48px] px-6 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-2xl transition text-xs"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map(order => {
              const expanded = expandedId === order.id;
              const busy = busyId === order.id;
              const cancellable = canCustomerCancel(order);

              return (
                <li key={order.id} className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden">
                  {/* Summary row */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white font-mono">{order.order_number}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="truncate">{order.created_at || '—'}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-[#C5A059]">₹{order.total_amount}</p>
                        {/* A rejected payment is the one payment state that needs
                            acting on, so it cannot read as quiet grey metadata. */}
                        <p className={`text-[10px] mt-0.5 font-bold ${
                          paymentTone(order) === 'success' ? 'text-emerald-400'
                            : paymentTone(order) === 'error' ? 'text-rose-400'
                            : paymentTone(order) === 'pending' ? 'text-amber-400'
                            : 'text-gray-500'
                        }`}>
                          {paymentLabel(order)}
                        </p>
                      </div>
                    </div>

                    {order.payment_status === 'rejected' && (
                      <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5">
                        Please contact the restaurant.
                        {order.payment_rejection_reason && ` (${order.payment_rejection_reason})`}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-[11px] font-black px-3 py-1.5 rounded-full border ${
                        order.status === 'cancelled'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : order.status === 'delivered'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]'
                      }`}>
                        {statusLabel(order.status)}
                      </span>

                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : order.id)}
                        aria-expanded={expanded}
                        className="min-h-[44px] px-3 -mr-1 text-[11px] font-bold text-gray-400 hover:text-white transition flex items-center gap-1"
                      >
                        {order.items.length} item{order.items.length === 1 ? '' : 's'}
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Detail */}
                  {expanded && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-white/10 pt-4">
                      <ul className="space-y-1.5 text-xs">
                        {order.items.map((item, i) => (
                          <li key={`${item.dish_id}-${i}`} className="flex justify-between gap-3 text-gray-300">
                            <span className="min-w-0 break-words">
                              {item.dish_name} <span className="text-gray-500">× {item.quantity}</span>
                            </span>
                            <span className="font-bold text-white shrink-0">₹{item.price * item.quantity}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrentOrder(order) && (
                        <div className="pt-1">
                          <OrderProgressTimeline order={order} compact />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {isCurrentOrder(order) && (
                      <button
                        type="button"
                        onClick={() => onTrackOrder(order)}
                        className="min-h-[44px] px-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-xl transition text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" /> Track
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      className="min-h-[44px] px-3 bg-[#181818] border border-white/10 hover:bg-white/5 text-gray-300 font-bold rounded-xl transition text-[11px] flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reorder
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInvoice(order)}
                      disabled={busy}
                      className="min-h-[44px] px-3 bg-[#181818] border border-white/10 hover:bg-white/5 text-gray-300 font-bold rounded-xl transition text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Invoice
                    </button>

                    {cancellable && (
                      <button
                        type="button"
                        onClick={() => handleCancel(order)}
                        disabled={busy}
                        className="min-h-[44px] px-3 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl transition text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
};
