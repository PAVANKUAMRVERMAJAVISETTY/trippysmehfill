import React, { useMemo, useState } from 'react';
import { Order } from '../../types';
import {
  CheckCircle2, XCircle, Search, Loader2, ChevronLeft, ChevronRight,
  ShieldCheck, Copy, Check, AlertTriangle, Phone
} from 'lucide-react';

type Filter = 'pending' | 'completed' | 'rejected' | 'all';

interface PaymentVerificationViewProps {
  orders: Order[];
  onVerifyPayment: (orderId: string) => Promise<void>;
  onRejectPayment: (orderId: string, reason?: string) => Promise<void>;
}

const PAGE_SIZE = 10;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'pending', label: 'Pending Verification' },
  { id: 'completed', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All UPI Orders' }
];

/** Absolute time, because "5 minutes ago" is useless when matching a bank statement. */
function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit'
  });
}

const statusChip = (order: Order) => {
  switch (order.payment_status) {
    case 'completed':
      return { text: 'Verified', className: 'bg-[#D1FAE5] text-[#146C43] border-[#86EFAC]' };
    case 'rejected':
      return { text: 'Rejected', className: 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]' };
    case 'failed':
      return { text: 'Failed', className: 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]' };
    case 'refunded':
      return { text: 'Refunded', className: 'bg-[#F7F4EC] text-[#5F6368] border-[#DDD6C8]' };
    default:
      return { text: 'Pending Verification', className: 'bg-[#FFF0CC] text-[#8A5A00] border-[#E8C66A]' };
  }
};

export const PaymentVerificationView: React.FC<PaymentVerificationViewProps> = ({
  orders,
  onVerifyPayment,
  onRejectPayment
}) => {
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Only UPI orders are reviewable. A cash order has no transfer to check, so
  // listing it here would only be noise for whoever is working the queue.
  const upiOrders = useMemo(
    () => orders.filter(o => o.payment_method === 'UPI'),
    [orders]
  );

  const pendingCount = useMemo(
    () => upiOrders.filter(o => o.payment_status === 'pending').length,
    [upiOrders]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return upiOrders
      .filter(o => (filter === 'all' ? true : o.payment_status === filter))
      .filter(o => {
        if (!term) return true;
        return (
          o.order_number.toLowerCase().includes(term) ||
          o.customer_name.toLowerCase().includes(term) ||
          o.customer_phone.toLowerCase().includes(term) ||
          (o.upi_transaction_id || '').toLowerCase().includes(term) ||
          String(o.total_amount).includes(term)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [upiOrders, filter, search]);

  // A realtime update can shrink the list under a reader who is on the last
  // page. Clamp rather than showing them an empty screen they did not ask for.
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = visible.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const resetToFirstPage = () => setPage(0);

  const runAction = async (orderId: string, action: () => Promise<void>) => {
    setBusyId(orderId);
    setError(null);
    try {
      await action();
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const copyTxn = async (txn: string, orderId: string) => {
    try {
      await navigator.clipboard.writeText(txn);
      setCopiedId(orderId);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setError(`Could not copy. The reference is ${txn}`);
    }
  };

  const isSettled = (order: Order) => order.payment_status !== 'pending';

  const VerifyButton: React.FC<{ order: Order; block?: boolean }> = ({ order, block }) => (
    <button
      onClick={() => runAction(order.id, () => onVerifyPayment(order.id))}
      disabled={busyId === order.id || isSettled(order)}
      className={`${block ? 'w-full' : ''} min-h-[44px] px-4 flex items-center justify-center gap-2 rounded-xl
        bg-[#198754] hover:bg-[#146C43] active:bg-[#146C43] text-white font-extrabold text-xs border border-[#146C43]
        shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
    >
      {busyId === order.id
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <CheckCircle2 className="w-4 h-4" />}
      <span>Verify Payment</span>
    </button>
  );

  const RejectButton: React.FC<{ order: Order; block?: boolean }> = ({ order, block }) => (
    <button
      onClick={() => {
        setRejectingId(rejectingId === order.id ? null : order.id);
        setRejectReason('');
        setError(null);
      }}
      disabled={busyId === order.id || isSettled(order)}
      className={`${block ? 'w-full' : ''} min-h-[44px] px-4 flex items-center justify-center gap-2 rounded-xl
        border-2 border-[#F5A6A1] text-[#922B21] bg-white hover:bg-[#FDE2E1] active:bg-[#FDE2E1] font-extrabold text-xs
        transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
    >
      <XCircle className="w-4 h-4" />
      <span>Reject Payment</span>
    </button>
  );

  const RejectReasonPanel: React.FC<{ order: Order }> = ({ order }) => (
    <div className="mt-3 p-3 bg-[#FDE2E1] border border-[#F5A6A1] rounded-xl space-y-2.5">
      <label className="block text-[11px] font-bold text-[#922B21] uppercase tracking-wider">
        Reason (optional)
      </label>
      <input
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        placeholder="e.g. No transfer received, amount did not match"
        maxLength={200}
        className="w-full min-h-[44px] px-3 rounded-lg border border-[#9F988A] bg-white text-sm
                   text-[#1F2933] placeholder-[#6B6B63] focus:outline-none focus:border-[#D95F0A]"
      />
      <p className="text-[11px] text-[#922B21]">
        The customer will be told the payment was rejected and asked to contact the restaurant.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => runAction(order.id, () => onRejectPayment(order.id, rejectReason))}
          disabled={busyId === order.id}
          className="flex-1 min-h-[44px] px-4 flex items-center justify-center gap-2 rounded-xl
                     bg-[#C0392B] hover:bg-[#922B21] text-white font-extrabold text-xs transition disabled:opacity-50 border border-[#922B21] cursor-pointer"
        >
          {busyId === order.id
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <XCircle className="w-4 h-4" />}
          <span>Confirm Rejection</span>
        </button>
        <button
          onClick={() => { setRejectingId(null); setRejectReason(''); }}
          className="flex-1 min-h-[44px] px-4 rounded-xl border border-[#9F988A] bg-white
                     text-[#1F2933] font-bold text-xs hover:bg-[#F0E8D8] transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const TxnCell: React.FC<{ order: Order }> = ({ order }) => {
    if (!order.upi_transaction_id) {
      return <span className="text-[#5F6368] italic text-xs">Not provided</span>;
    }
    return (
      <button
        onClick={() => copyTxn(order.upi_transaction_id!, order.id)}
        title="Copy reference"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-[#1F2933] hover:text-[#D95F0A] transition max-w-full cursor-pointer"
      >
        <span className="truncate">{order.upi_transaction_id}</span>
        {copiedId === order.id
          ? <Check className="w-3.5 h-3.5 text-[#146C43] shrink-0" />
          : <Copy className="w-3.5 h-3.5 text-[#5F6368] shrink-0" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-5 text-[#1F2933]" style={{ backgroundColor: '#F7F2E8' }}>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1F2933] font-serif flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#D95F0A]" />
            Payment Verification
          </h1>
          <p className="text-xs text-[#5F6368] mt-0.5">
            UPI transfers wait here until someone confirms the money arrived. Nothing is verified automatically.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-[#FFF0CC] text-[#8A5A00] border border-[#E8C66A] text-xs font-black">
            {pendingCount} awaiting review
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5F6368] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetToFirstPage(); }}
            placeholder="Search order number, customer, phone, reference or amount"
            className="w-full min-h-[48px] pl-10 pr-3 rounded-xl border border-[#9F988A] bg-[#F8F6F0] text-sm
                       text-[#1F2933] placeholder-[#6B6B63] focus:outline-none focus:border-[#D95F0A]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); resetToFirstPage(); }}
              className={`min-h-[48px] px-4 rounded-xl text-xs font-extrabold whitespace-nowrap transition border cursor-pointer ${
                filter === f.id
                  ? 'bg-[#B8862D] text-white border-[#B8862D] shadow-sm'
                  : 'bg-white text-[#1F2933] border-[#DDD6C8] hover:bg-[#F7F4EC]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FDE2E1] border border-[#F5A6A1] text-[#922B21] text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <ShieldCheck className="w-10 h-10 text-[#DDD6C8] mx-auto mb-3" />
          <p className="text-[#1F2933] font-bold">
            {filter === 'pending' ? 'Nothing waiting for review' : 'No orders match'}
          </p>
          <p className="text-xs text-[#5F6368] mt-1">
            {filter === 'pending'
              ? 'Every UPI payment has been reviewed.'
              : 'Try a different filter or search term.'}
          </p>
        </div>
      ) : (
        <>
          {/* ---------- Desktop table ---------- */}
          <div className="hidden lg:block bg-white rounded-2xl border border-[#DDD6C8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#E9E1D0] border-b border-[#DDD6C8]">
                  <tr className="text-left text-[11px] font-black uppercase tracking-wider text-[#2B2418]">
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD6C8]">
                  {pageItems.map(order => {
                    const chip = statusChip(order);
                    return (
                      <React.Fragment key={order.id}>
                        <tr className="hover:bg-[#FFF0D5] transition">
                          <td className="px-4 py-3 font-black text-[#D95F0A] font-mono whitespace-nowrap">
                            {order.order_number}
                          </td>
                          <td className="px-4 py-3 font-bold text-[#1F2933]">{order.customer_name}</td>
                          <td className="px-4 py-3">
                            <a href={`tel:${order.customer_phone}`} className="font-mono text-[#1F2933] hover:text-[#D95F0A]">
                              {order.customer_phone}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-[#1F2933] whitespace-nowrap">
                            ₹{order.total_amount}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[#1F2933]">⚡ UPI</td>
                          <td className="px-4 py-3 max-w-[160px]"><TxnCell order={order} /></td>
                          <td className="px-4 py-3 text-[#5F6368] text-xs whitespace-nowrap">
                            {formatCreatedAt(order.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border whitespace-nowrap ${chip.className}`}>
                              {chip.text}
                            </span>
                            {order.payment_rejection_reason && (
                              <p className="text-[11px] text-[#922B21] mt-1 max-w-[180px]">
                                {order.payment_rejection_reason}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isSettled(order) ? (
                              <span className="text-xs text-[#5F6368] whitespace-nowrap">Reviewed</span>
                            ) : (
                              <div className="flex items-center gap-2 justify-end">
                                <VerifyButton order={order} />
                                <RejectButton order={order} />
                              </div>
                            )}
                          </td>
                        </tr>
                        {rejectingId === order.id && (
                          <tr>
                            <td colSpan={9} className="px-4 pb-4 bg-[#FFF0D5]">
                              <div className="max-w-lg ml-auto"><RejectReasonPanel order={order} /></div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---------- Mobile / tablet cards ---------- */}
          <div className="lg:hidden space-y-4">
            {pageItems.map(order => {
              const chip = statusChip(order);
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-[#DDD6C8] shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-lg font-black text-[#D95F0A] font-mono">{order.order_number}</span>
                      <p className="text-[11px] text-[#5F6368]">{formatCreatedAt(order.created_at)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border whitespace-nowrap ${chip.className}`}>
                      {chip.text}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#DDD6C8]">
                    <div className="min-w-0">
                      <p className="font-bold text-[#1F2933] truncate">{order.customer_name}</p>
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-[#D95F0A]"
                      >
                        <Phone className="w-3 h-3 text-[#D95F0A]" />
                        {order.customer_phone}
                      </a>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black text-[#1F2933]">₹{order.total_amount}</p>
                      <p className="text-[11px] text-[#5F6368]">⚡ UPI</p>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-[#5F6368] font-bold uppercase tracking-wider text-[10px] pt-0.5">
                      Transaction ID
                    </span>
                    <div className="min-w-0 text-right"><TxnCell order={order} /></div>
                  </div>

                  {order.payment_rejection_reason && (
                    <p className="text-xs text-[#922B21] bg-[#FDE2E1] border border-[#F5A6A1] rounded-lg p-2">
                      {order.payment_rejection_reason}
                    </p>
                  )}

                  {!isSettled(order) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <VerifyButton order={order} block />
                      <RejectButton order={order} block />
                    </div>
                  )}

                  {rejectingId === order.id && <RejectReasonPanel order={order} />}
                </div>
              );
            })}
          </div>

          {/* ---------- Pagination ---------- */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="min-h-[44px] px-4 flex items-center gap-1.5 rounded-xl border border-[#9F988A] bg-white
                           text-[#1F2933] font-bold text-xs hover:bg-[#F0E8D8] transition disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-xs text-[#5F6368] font-bold text-center">
                Page {safePage + 1} of {pageCount}
                <span className="hidden sm:inline"> · {visible.length} order{visible.length === 1 ? '' : 's'}</span>
              </span>

              <button
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="min-h-[44px] px-4 flex items-center gap-1.5 rounded-xl border border-[#9F988A] bg-white
                           text-[#1F2933] font-bold text-xs hover:bg-[#F0E8D8] transition disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
