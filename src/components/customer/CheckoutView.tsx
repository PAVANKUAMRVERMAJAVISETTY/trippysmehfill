import React, { useMemo, useRef, useState } from 'react';
import {
  MapPin, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Clock, Copy, Check,
  ShoppingBag, User, Phone, Truck, Smartphone, Download, Share2, ImageUp, ReceiptText, Info
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Order, PaymentMethod } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ordersService } from '../../services/supabase';
import { playKitchenAlertSound } from '../../lib/sound';
import { captureFullSecurityContext } from '../../lib/geoUtils';
import {
  validateCheckout, nextOrderNumber, estimatedDeliveryLabel, buildUpiPaymentUri
} from '../../lib/checkout';
import { paymentLabel, paymentNote, paymentTone } from '../../lib/orderStatus';
import { downloadReceiptPdf, shareOrder, sharePaymentScreenshot } from '../../lib/receipt';

interface CheckoutViewProps {
  existingOrders: Order[];
  onOrderPlaced: (order: Order) => void;
  onTrackOrder: (order: Order) => void;
  onBackToMenu: () => void;
}

/**
 * Checkout is three screens, in this order:
 *
 *   form → (UPI only) upi_payment → confirmed
 *
 * The payment screen sits *after* the order row exists, never before. A
 * customer must never be asked to transfer money for an order that then fails
 * to save.
 */
type Step = 'form' | 'upi_payment' | 'confirmed';

const PHONE_LENGTH = 10;
const toPhoneDigits = (raw: string) => raw.replace(/\D/g, '').slice(0, PHONE_LENGTH);

const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Any UPI App'];

/**
 * `upi://` links only resolve where a UPI app is installed, which in practice
 * means a phone. On desktop the button would silently do nothing, so it is
 * labelled honestly instead of hidden -- the customer may well be on a tablet
 * we cannot classify.
 */
const isLikelyMobile = () =>
  typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  existingOrders,
  onOrderPlaced,
  onTrackOrder,
  onBackToMenu
}) => {
  const { cart, subtotal, deliveryFee, taxAmount, grandTotal, settings, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('form');

  // Seeded from the signed-in customer's own saved profile -- their data, not a
  // sample -- and editable, because the delivery address often is not home.
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.hostel_address ?? '');
  const [landmark, setLandmark] = useState('');

  // Nothing is preselected. Cash on Delivery is *recommended*, which is a
  // visual cue -- the customer still has to choose, so "Please select a payment
  // method." is reachable rather than decorative.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const [upiTxnId, setUpiTxnId] = useState('');
  const [hasClaimedPayment, setHasClaimedPayment] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isPlacing, setIsPlacing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedAt, setPlacedAt] = useState<Date | null>(null);

  // Guards against a double-tap creating two orders. A ref, not state, because
  // the second tap can arrive in the same tick as the first -- before a state
  // update has rendered and before `isPlacing` would read as true.
  const submitLock = useRef(false);
  const screenshotInput = useRef<HTMLInputElement>(null);

  const validation = useMemo(
    () => validateCheckout({
      fullName,
      phone,
      address,
      paymentMethod,
      cartCount: cart.length,
      subtotal,
      minOrderValue: settings.min_order_value
    }),
    [fullName, phone, address, paymentMethod, cart.length, subtotal, settings.min_order_value]
  );

  const orderNumber = useMemo(
    () => nextOrderNumber(existingOrders.map(o => o.order_number)),
    [existingOrders]
  );

  const payableTotal = placedOrder?.total_amount ?? grandTotal;

  // A UPI ID must come from Settings. Empty means unconfigured, and UPI is then
  // not offered at all rather than pointed at a guess.
  const upiConfigured = Boolean(settings.restaurant_upi_id?.trim());

  const upiUri = buildUpiPaymentUri({
    upiId: settings.restaurant_upi_id,
    payeeName: settings.kitchen_name,
    amount: payableTotal,
    orderNumber: placedOrder?.order_number ?? orderNumber
  });

  const business = { name: settings.kitchen_name, upiId: settings.restaurant_upi_id };

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(settings.restaurant_upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      showToast({ title: 'UPI ID copied', tone: 'success', duration: 2500 });
    } catch {
      showToast({
        title: 'Could not copy automatically',
        description: `Use ${settings.restaurant_upi_id} manually.`,
        tone: 'error'
      });
    }
  };

  const handlePlaceOrder = async () => {
    if (submitLock.current) return;
    setErrorMsg('');

    if (!user) {
      setErrorMsg('Please sign in to place your order.');
      return;
    }

    // Ported from the other branch, which placed orders inline in
    // RightOrderPanel and guarded there. This branch moved placement here, so
    // without this the admin's "Closed -- ordering is disabled platform-wide"
    // toggle was purely cosmetic: NotificationBanner showed a message while
    // orders continued to go through.
    if (!settings.is_open) {
      setErrorMsg(
        `The kitchen is currently closed. Orders resume at ${settings.opening_time || '09:00 AM'}.`
      );
      return;
    }

    if (!validation.valid) {
      setErrorMsg(validation.message);
      return;
    }

    // Without a configured backend there is nowhere to save the order. Saying so
    // is the only honest option -- a confirmation screen here would be a lie.
    if (!isSupabaseConfigured) {
      setErrorMsg('Ordering is unavailable right now: the kitchen database is not reachable. Please try again later.');
      return;
    }

    submitLock.current = true;
    setIsPlacing(true);

    let securityContext: Awaited<ReturnType<typeof captureFullSecurityContext>> | null = null;
    try {
      securityContext = await captureFullSecurityContext();
    } catch {
      // Telemetry is best-effort; a blocked GPS prompt must not block ordering.
    }

    const draft: Omit<Order, 'id' | 'created_at'> = {
      order_number: orderNumber,
      customer_id: user.id,
      customer_name: fullName.trim(),
      customer_phone: phone.trim(),
      delivery_address: address.trim(),
      landmark: landmark.trim() || undefined,
      items: cart.map(c => ({
        dish_id: c.menuItem.id,
        dish_name: c.menuItem.name,
        quantity: c.quantity,
        price: c.menuItem.price,
        is_veg: c.menuItem.is_veg
      })),
      subtotal,
      tax_amount: taxAmount,
      delivery_fee: deliveryFee,
      total_amount: grandTotal,
      payment_method: paymentMethod as PaymentMethod,
      // Both methods start unpaid. COD settles on handover; UPI stays pending
      // until an admin verifies the transfer. Neither is ever 'completed' here.
      payment_status: 'pending',
      status: 'pending',
      customer_ip: securityContext?.ipAddress,
      order_latitude: securityContext?.latitude,
      order_longitude: securityContext?.longitude,
      gps_accuracy: securityContext?.accuracyMeters,
      gps_allowed: securityContext?.gpsAllowed,
      distance_km: securityContext?.distanceKm,
      device_type: securityContext?.deviceType,
      os_name: securityContext?.osName,
      browser_name: securityContext?.browserName,
      city: securityContext?.city,
      state: securityContext?.state,
      pin_code: securityContext?.pinCode,
      google_maps_url: securityContext?.googleMapsUrl,
      fraud_risk_level: securityContext?.fraudRiskLevel,
      fraud_risk_reasons: securityContext?.fraudRiskReasons
    };

    try {
      // The order exists only once this resolves. Everything after it -- the
      // chime, the cleared cart, the payment screen -- is downstream of a real row.
      const created = await ordersService.createOrder(draft);

      playKitchenAlertSound();
      setPlacedOrder(created);
      setPlacedAt(new Date());
      clearCart();
      onOrderPlaced(created);
      showToast({
        title: 'Order received',
        description: `${created.order_number} has been sent to the kitchen.`,
        tone: 'success',
        key: `order-received-${created.id}`
      });

      // Only now is it fair to ask for money.
      setStep(created.payment_method === 'UPI' ? 'upi_payment' : 'confirmed');
    } catch (err: any) {
      setErrorMsg(
        `We could not place your order: ${err?.message || 'the kitchen database rejected it'}. ` +
        'Nothing has been charged and your cart is intact — please try again.'
      );
      showToast({ title: 'Order failed', description: 'Nothing was charged.', tone: 'error' });
      // Released only on failure: after success the form is gone, so there is
      // nothing left to submit twice.
      submitLock.current = false;
    } finally {
      setIsPlacing(false);
    }
  };

  const handleClaimPayment = async () => {
    if (!placedOrder) return;
    setErrorMsg('');
    setIsClaiming(true);

    try {
      // Stays 'pending'. This records the customer's reference so an admin can
      // match the transfer -- it does not assert that money arrived.
      await ordersService.updatePaymentStatus(placedOrder.id, 'pending', upiTxnId.trim() || undefined);
      setHasClaimedPayment(true);
      setStep('confirmed');
      showToast({
        title: 'Payment noted',
        description: 'Our team will verify it and start preparing your food.',
        tone: 'success'
      });
    } catch (err: any) {
      setErrorMsg(`We could not record your payment: ${err?.message || 'database error'}. Please try again.`);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!placedOrder) return;
    setIsDownloading(true);
    try {
      await downloadReceiptPdf(placedOrder, business);
    } catch {
      showToast({ title: 'Could not build the receipt', tone: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareOrder = async () => {
    if (!placedOrder) return;
    const result = await shareOrder(placedOrder, business);
    if (result === 'copied') {
      showToast({ title: 'Order details copied', tone: 'success' });
    } else if (result === 'unavailable') {
      showToast({ title: 'Sharing is not available on this device', tone: 'error' });
    }
  };

  const handleScreenshotPicked = async (file: File | undefined) => {
    if (!file || !placedOrder) return;
    const result = await sharePaymentScreenshot(placedOrder, business, file);
    if (result === 'unsupported') {
      showToast({
        title: 'This device cannot share files',
        description: 'Send the screenshot to the kitchen manually.',
        tone: 'error'
      });
    }
  };

  // ------------------------------------------------------------ shared pieces

  const PageHeader = ({ title, blurb, onBack }: { title: string; blurb: string; onBack?: () => void }) => (
    <header className="flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-11 h-11 shrink-0 rounded-2xl bg-white border border-[#DDD6C8] text-[#5F6368] hover:text-[#1F2933] hover:bg-[#F0E8D8] transition flex items-center justify-center cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-black text-[#1F2933] font-serif tracking-tight">{title}</h1>
        <p className="text-[11px] sm:text-xs text-[#5F6368]">{blurb}</p>
      </div>
    </header>
  );

  const ErrorBox = () =>
    errorMsg ? (
      <div className="p-4 bg-[#FDE2E1] border border-[#F5A6A1] text-[#922B21] text-xs rounded-2xl flex items-start gap-2.5 shadow-sm font-medium">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C0392B]" />
        <span className="break-words">{errorMsg}</span>
      </div>
    ) : null;

  // ------------------------------------------------------ step: UPI payment

  if (step === 'upi_payment' && placedOrder) {
    return (
      <main className="flex-1 px-4 py-6 sm:py-10">
        <div className="max-w-lg mx-auto space-y-4 sm:space-y-5">

          {/* The order is already safe. Say so before asking for money. */}
          <div className="p-4 bg-[#D1FAE5] border border-[#86EFAC] rounded-2xl flex items-start gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-[#146C43] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-black text-[#146C43]">
                Order {placedOrder.order_number} saved
              </p>
              <p className="text-[11px] text-[#146C43]/90 mt-0.5 font-medium">
                Your order is with the kitchen. Complete the payment below.
              </p>
            </div>
          </div>

          <PageHeader title="⚡ Instant UPI Payment" blurb="Pay now using any UPI app." />

          <section className="bg-white border border-[#DDD6C8] rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">

            {/* Amount */}
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wider text-[#5F6368] font-bold">Amount to pay</p>
              <p className="text-4xl font-black text-[#D95F0A] mt-1">₹{placedOrder.total_amount}</p>
            </div>

            {/* QR — scales with the viewport instead of a fixed pixel box */}
            <div className="bg-[#F7F4EC] p-3 sm:p-4 rounded-2xl w-full max-w-[260px] mx-auto border border-[#DDD6C8] shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiUri)}`}
                alt={`UPI QR code to pay ₹${placedOrder.total_amount}`}
                className="w-full aspect-square object-contain rounded-xl"
              />
            </div>

            {/* UPI ID — full width, easy to hit, one tap to copy */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-[#5F6368] font-bold text-center">UPI ID</p>
              <div className="flex items-stretch gap-2">
                <code className="flex-1 min-w-0 min-h-[52px] px-4 bg-[#F8F6F0] border border-[#9F988A] rounded-2xl font-mono text-sm text-[#1F2933] flex items-center justify-center truncate font-bold">
                  {settings.restaurant_upi_id}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="min-h-[52px] px-4 shrink-0 rounded-2xl bg-white border border-[#9F988A] text-[#1F2933] hover:bg-[#F0E8D8] transition text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-[#198754]" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* UPI intent */}
            <div className="space-y-1.5">
              <a
                href={upiUri}
                className="w-full min-h-[56px] px-5 bg-[#D95F0A] hover:bg-[#B94D00] active:scale-[0.99] text-white font-black rounded-2xl transition text-sm flex items-center justify-center gap-2 border border-[#B94D00] shadow-sm"
              >
                <Smartphone className="w-5 h-5 text-white" /> Open UPI App
              </a>
              {!isLikelyMobile() && (
                <p className="text-[10px] text-[#5F6368] text-center">
                  Opening an app only works on a phone — scan the QR code instead.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
              {UPI_APPS.map(app => (
                <span key={app} className="text-[10px] font-bold text-[#5F6368] bg-[#F7F4EC] border border-[#DDD6C8] rounded-full px-2.5 py-1">
                  {app}
                </span>
              ))}
            </div>
          </section>

          {/* Instructions */}
          <div className="p-4 bg-[#F7F4EC] border border-[#DDD6C8] rounded-2xl flex items-start gap-3 shadow-sm">
            <Info className="w-4 h-4 text-[#B8862D] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#5F6368] leading-relaxed">
              Please complete your payment after placing the order. Once payment is received, our team
              will verify and begin preparing your food.
            </p>
          </div>

          <ErrorBox />

          {/* Reference + confirm */}
          <section className="space-y-2.5">
            <input
              type="text"
              inputMode="numeric"
              value={upiTxnId}
              onChange={(e) => setUpiTxnId(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="UPI transaction reference (optional)"
              aria-label="UPI transaction reference"
              className="w-full min-h-[52px] px-4 bg-[#F8F6F0] border border-[#9F988A] rounded-2xl text-sm font-mono text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
            />

            <button
              type="button"
              onClick={handleClaimPayment}
              disabled={isClaiming}
              className="w-full min-h-[56px] px-5 bg-[#198754] hover:bg-[#146C43] active:scale-[0.99] text-white font-black rounded-2xl transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 border border-[#146C43] shadow-sm cursor-pointer"
            >
              {isClaiming
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-5 h-5" /> I've Paid</>}
            </button>

            <button
              type="button"
              onClick={() => screenshotInput.current?.click()}
              className="w-full min-h-[52px] px-5 bg-white border border-[#9F988A] hover:bg-[#F0E8D8] text-[#1F2933] font-bold rounded-2xl transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <ImageUp className="w-4 h-4 text-[#5F6368]" /> Share Payment Screenshot
            </button>
            <input
              ref={screenshotInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleScreenshotPicked(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => setStep('confirmed')}
              className="w-full min-h-[48px] text-[#5F6368] hover:text-[#1F2933] font-bold text-xs transition cursor-pointer"
            >
              I'll pay later — view my order
            </button>
          </section>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------- step: confirmed

  if (step === 'confirmed' && placedOrder) {
    const eta = estimatedDeliveryLabel(placedAt ?? new Date(), settings.estimated_delivery_mins);
    const isCod = placedOrder.payment_method === 'COD';

    const live = existingOrders.find(o => o.id === placedOrder.id) ?? placedOrder;
    const tone = paymentTone(live);
    const note = paymentNote(live);

    return (
      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-xl mx-auto space-y-4 sm:space-y-5">

          <section className="bg-white border border-[#DDD6C8] rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-md">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#D1FAE5] border border-[#86EFAC] text-[#146C43] rounded-3xl mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 text-[#146C43]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1F2933] font-serif">Order Confirmed</h1>
            <p className="text-xs sm:text-sm text-[#5F6368]">
              {isCod
                ? 'Pay our delivery partner when your food arrives.'
                : 'Our team will verify your payment and begin preparing your food.'}
            </p>
          </section>

          {/* The four facts, plainly */}
          <section className="bg-white border border-[#DDD6C8] rounded-3xl divide-y divide-[#DDD6C8] shadow-sm">
            {[
              { label: 'Order ID', value: placedOrder.order_number, mono: true },
              { label: 'Estimated Delivery', value: eta },
              { label: 'Payment Method', value: isCod ? '🚚 Cash on Delivery' : '⚡ Instant UPI Payment' }
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-center justify-between gap-4 p-4 sm:px-5">
                <span className="text-[11px] uppercase tracking-wider text-[#5F6368] font-bold shrink-0">{label}</span>
                <span className={`text-sm font-black text-[#1F2933] text-right min-w-0 break-words ${mono ? 'font-mono text-[#D95F0A]' : ''}`}>
                  {value}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between gap-4 p-4 sm:px-5">
              <span className="text-[11px] uppercase tracking-wider text-[#5F6368] font-bold shrink-0">Payment Status</span>
              <span className={`text-xs font-black px-3 py-1.5 rounded-full border shrink-0 ${
                tone === 'success' ? 'bg-[#D1FAE5] border-[#86EFAC] text-[#146C43]'
                  : tone === 'error' ? 'bg-[#FDE2E1] border-[#F5A6A1] text-[#922B21]'
                  : tone === 'pending' ? 'bg-[#FFF0CC] border-[#E8C66A] text-[#8A5A00]'
                  : 'bg-[#F7F4EC] border-[#DDD6C8] text-[#B8862D]'
              }`}>
                {paymentLabel(live)}
              </span>
            </div>
          </section>

          {note && (
            <p className={`text-[11px] text-center px-2 leading-relaxed ${
              tone === 'error'
                ? 'text-[#922B21] bg-[#FDE2E1] border border-[#F5A6A1] rounded-2xl py-3 font-medium'
                : 'text-[#5F6368]'
            }`}>
              {note}
            </p>
          )}

          {!isCod && live.payment_status === 'pending' && (
            <p className="text-[11px] text-[#5F6368] text-center px-2 leading-relaxed">
              {hasClaimedPayment
                ? 'Your payment reference has been noted. It stays pending until our team verifies it.'
                : 'Not paid yet? You can still pay using the UPI details on your order.'}
            </p>
          )}

          {/* Items and total */}
          <section className="bg-white border border-[#DDD6C8] rounded-3xl p-5 space-y-3 shadow-sm">
            <h2 className="text-sm font-black text-[#1F2933] font-serif flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-[#B8862D]" /> Your Items
            </h2>
            <ul className="space-y-2 text-xs">
              {placedOrder.items.map((item, i) => (
                <li key={`${item.dish_id}-${i}`} className="flex justify-between gap-3 text-[#1F2933]">
                  <span className="min-w-0 break-words">
                    {item.dish_name} <span className="text-[#5F6368]">× {item.quantity}</span>
                  </span>
                  <span className="font-bold text-[#1F2933] shrink-0">₹{item.price * item.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between pt-3 border-t border-[#DDD6C8] text-base font-black text-[#1F2933]">
              <span>Total</span><span className="text-[#D95F0A]">₹{placedOrder.total_amount}</span>
            </div>
          </section>

          <ErrorBox />

          {/* Primary actions */}
          <section className="space-y-2.5">
            <button
              type="button"
              onClick={() => onTrackOrder(placedOrder)}
              className="w-full min-h-[56px] px-5 bg-[#D95F0A] hover:bg-[#B94D00] active:scale-[0.99] text-white font-black rounded-2xl transition text-sm flex items-center justify-center gap-2 border border-[#B94D00] shadow-sm cursor-pointer"
            >
              <Truck className="w-5 h-5 text-white" /> Track Order
            </button>

            <button
              type="button"
              onClick={onBackToMenu}
              className="w-full min-h-[52px] px-5 bg-white border border-[#9F988A] hover:bg-[#F0E8D8] text-[#1F2933] font-bold rounded-2xl transition text-sm cursor-pointer shadow-sm"
            >
              Back to Menu
            </button>

            {/* Secondary, kept out of the way */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={isDownloading}
                className="min-h-[48px] px-3 text-[#5F6368] hover:text-[#1F2933] font-bold rounded-2xl transition text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDownloading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</>
                  : <><Download className="w-3.5 h-3.5" /> Receipt</>}
              </button>
              <button
                type="button"
                onClick={handleShareOrder}
                className="min-h-[48px] px-3 text-[#5F6368] hover:text-[#1F2933] font-bold rounded-2xl transition text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------- step: form

  const inputClass =
    'w-full min-h-[52px] pl-11 pr-4 bg-[#F8F6F0] border border-[#9F988A] rounded-2xl text-sm text-[#1F2933] ' +
    'placeholder-[#6B6B63] outline-none focus:border-[#D95F0A] focus:ring-2 focus:ring-[#D95F0A]/20 transition';

  const ctaLabel =
    paymentMethod === 'COD' ? 'Continue with Cash on Delivery'
    : paymentMethod === 'UPI' ? 'Continue with UPI Payment'
    : `Place Order • ₹${grandTotal}`;

  const Cta = () => (
    <button
      type="button"
      onClick={handlePlaceOrder}
      disabled={isPlacing || !validation.valid}
      className="w-full min-h-[56px] px-5 bg-[#D95F0A] hover:bg-[#B94D00] active:scale-[0.99] text-white font-black rounded-2xl shadow-md border border-[#B94D00] transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {isPlacing
        ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing your order…</>
        : <><CheckCircle2 className="w-5 h-5 text-white" /> {ctaLabel}</>}
    </button>
  );

  return (
    <main className="flex-1 px-4 py-6 sm:py-10 pb-40 lg:pb-10">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">

        <PageHeader
          title="Checkout"
          blurb="Confirm your details and choose how to pay."
          onBack={onBackToMenu}
        />

        {cart.length === 0 ? (
          <div className="bg-white border border-[#DDD6C8] rounded-3xl p-10 text-center space-y-3 shadow-sm">
            <ShoppingBag className="w-10 h-10 text-[#B8862D] mx-auto" />
            <p className="text-sm font-bold text-[#1F2933]">Your cart is empty</p>
            <p className="text-xs text-[#5F6368]">Add something from the menu to get started.</p>
            <button
              type="button"
              onClick={onBackToMenu}
              className="mt-1 min-h-[52px] px-6 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-black rounded-2xl transition text-xs border border-[#B94D00] cursor-pointer"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            <ErrorBox />

            {/* Delivery details */}
            <section className="bg-white border border-[#DDD6C8] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
              <h2 className="text-sm font-black text-[#1F2933] font-serif">Delivery Details</h2>

              <div className="space-y-1.5">
                <label htmlFor="co-name" className="block text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#5F6368] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="co-name" type="text" value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name" className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="co-phone" className="block text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#5F6368] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="co-phone" type="tel" inputMode="numeric" maxLength={PHONE_LENGTH}
                    value={phone} onChange={(e) => setPhone(toPhoneDigits(e.target.value))}
                    placeholder="10-digit mobile number" className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="co-address" className="block text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
                  Delivery Address *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#5F6368] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="co-address" type="text" value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your delivery address" className={inputClass}
                  />
                </div>
              </div>

              <input
                type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)}
                placeholder="Landmark (optional)" aria-label="Landmark (optional)"
                className="w-full min-h-[52px] px-4 bg-[#F8F6F0] border border-[#9F988A] rounded-2xl text-sm text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A] focus:ring-2 focus:ring-[#D95F0A]/20 transition"
              />
            </section>

            {/* Payment method */}
            <section className="bg-white border border-[#DDD6C8] rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
              <h2 className="text-sm font-black text-[#1F2933] font-serif">Payment Method</h2>

              <div role="radiogroup" aria-label="Payment method" className="space-y-3">

                {/* ① Cash on Delivery — recommended */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'COD'}
                  onClick={() => setPaymentMethod('COD')}
                  className={`relative w-full text-left p-5 rounded-2xl border-2 transition cursor-pointer ${
                    paymentMethod === 'COD'
                      ? 'border-[#B8862D] bg-[#F7F4EC]'
                      : 'border-[#DDD6C8] bg-white hover:bg-[#F0E8D8]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl leading-none shrink-0" aria-hidden="true">🚚</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-black ${paymentMethod === 'COD' ? 'text-[#B8862D]' : 'text-[#1F2933]'}`}>
                          Cash on Delivery
                        </p>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-[#D1FAE5] text-[#146C43] border border-[#86EFAC] rounded-full px-2 py-0.5">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5F6368] mt-1.5 leading-relaxed">
                        Pay our delivery partner when your food arrives. No advance payment required.
                      </p>
                    </div>
                    {paymentMethod === 'COD' && <CheckCircle2 className="w-5 h-5 text-[#B8862D] shrink-0" />}
                  </div>
                </button>

                {upiConfigured ? (
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'UPI'}
                  onClick={() => setPaymentMethod('UPI')}
                  className={`relative w-full text-left p-5 rounded-2xl border-2 transition cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'border-[#B8862D] bg-[#F7F4EC]'
                      : 'border-[#DDD6C8] bg-white hover:bg-[#F0E8D8]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl leading-none shrink-0" aria-hidden="true">⚡</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-black ${paymentMethod === 'UPI' ? 'text-[#B8862D]' : 'text-[#1F2933]'}`}>
                          Instant UPI Payment
                        </p>
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#5F6368] border border-[#DDD6C8] rounded-full px-2 py-0.5">
                          Optional
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5F6368] mt-1.5 leading-relaxed">
                        Pay now using any UPI app.
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {UPI_APPS.map(app => (
                          <span key={app} className="text-[10px] font-bold text-[#5F6368] bg-[#F7F4EC] border border-[#DDD6C8] rounded-full px-2 py-0.5">
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>
                    {paymentMethod === 'UPI' && <CheckCircle2 className="w-5 h-5 text-[#B8862D] shrink-0" />}
                  </div>
                </button>
                ) : (
                  <p className="p-4 rounded-2xl border border-[#DDD6C8] bg-[#F7F4EC] text-[11px] text-[#5F6368] leading-relaxed">
                    Online UPI payment is unavailable right now — the kitchen has not
                    configured a UPI ID. Cash on Delivery is still available.
                  </p>
                )}
              </div>

              {paymentMethod === 'UPI' && (
                <p className="text-[11px] text-[#5F6368] bg-[#F7F4EC] border border-[#DDD6C8] rounded-2xl p-3.5 leading-relaxed flex items-start gap-2.5">
                  <Info className="w-3.5 h-3.5 text-[#B8862D] shrink-0 mt-0.5" />
                  <span>
                    We'll place your order first, then show the QR code and UPI ID — so you never pay for
                    an order that failed to reach the kitchen.
                  </span>
                </p>
              )}
            </section>

            {/* Order summary */}
            <section className="bg-white border border-[#DDD6C8] rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
              <h2 className="text-sm font-black text-[#1F2933] font-serif">
                Order Summary
                <span className="ml-2 text-[11px] font-bold text-[#5F6368]">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </h2>

              <ul className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {cart.map(item => (
                  <li key={item.menuItem.id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="flex items-start gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${item.menuItem.is_veg ? 'bg-[#198754]' : 'bg-[#C0392B]'}`} />
                      <span className="text-[#1F2933] break-words">
                        {item.menuItem.name}
                        <span className="text-[#5F6368]"> × {item.quantity}</span>
                      </span>
                    </span>
                    <span className="font-bold text-[#1F2933] shrink-0">₹{item.menuItem.price * item.quantity}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-[#DDD6C8] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#5F6368]">
                  <span>Subtotal</span><span className="font-bold text-[#1F2933]">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-[#5F6368]">
                  <span>Delivery</span>
                  <span className="font-bold">
                    {deliveryFee === 0 ? <span className="text-[#198754] font-black uppercase">Free</span> : `₹${deliveryFee}`}
                  </span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-[#5F6368]">
                    <span>GST ({settings.tax_percent}%)</span><span className="font-bold text-[#1F2933]">₹{taxAmount}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2.5 border-t border-[#DDD6C8] text-base font-black text-[#1F2933]">
                  <span>Total</span><span className="text-[#D95F0A]">₹{grandTotal}</span>
                </div>
              </div>
            </section>

            {/* Inline CTA for wide screens */}
            <div className="hidden lg:block space-y-2">
              {!validation.valid && (
                <p className="text-[11px] text-[#D95F0A] text-center font-bold">{validation.message}</p>
              )}
              <Cta />
            </div>
          </>
        )}
      </div>

      {/* Sticky bottom bar */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-[#DDD6C8] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
          {!validation.valid && (
            <p className="text-[11px] text-[#D95F0A] font-bold text-center mb-2 leading-snug">{validation.message}</p>
          )}
          <Cta />
        </div>
      )}
    </main>
  );
};
