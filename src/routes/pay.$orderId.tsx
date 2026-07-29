import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader, PublicFooter } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rupees, useSession } from "@/lib/session";
import { useStoreSettings } from "@/lib/store";
import { paymentReceiptMessage, whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/pay/$orderId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Complete your payment — Trippy's Mehfill" },
      { name: "description", content: "Pay for your Trippy's Mehfill order securely over UPI and confirm instantly." },
      { property: "og:title", content: "Complete your payment — Trippy's Mehfill" },
      { property: "og:description", content: "UPI payment for your Hyderabadi feast." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayPage,
});

function PayPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const { settings } = useStoreSettings();
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: order, refetch } = useQuery({
    queryKey: ["pay-order", orderId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, customer_name, phone, items, subtotal, delivery_fee, tax, total, status, payment_ref, eta_minutes")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const upiUri = order
    ? `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent("Trippys Mehfill")}&am=${Number(
        order.total,
      ).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${order.order_no}`)}`
    : "";

  const qrSrc = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`
    : "";

  async function confirm() {
    if (!order) return;
    setBusy(true);
    const { error } = await supabase.rpc("confirm_payment", { p_order_id: order.id, p_reference: reference });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment submitted — the kitchen has your order");
    await refetch();

    // Trigger 1: WhatsApp receipt
    const msg = paymentReceiptMessage({
      order_no: order.order_no,
      customer_name: order.customer_name,
      items: (order.items ?? []) as { name: string; qty: number }[],
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      tax: order.tax,
      total: order.total,
      eta_minutes: order.eta_minutes,
      payment_ref: reference,
    });
    window.open(whatsappLink(order.phone, msg), "_blank", "noopener");
    navigate({ to: "/my-orders" });
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold">Complete your payment</h1>

        {loading && <p className="mt-4 text-muted-foreground">Loading…</p>}
        {!loading && !user && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">Please sign in to pay for this order.</p>
            <Button asChild className="mt-3">
              <Link to="/account">Sign in</Link>
            </Button>
          </div>
        )}

        {order && (
          <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <strong className="text-lg">Order #{order.order_no}</strong>
              <span className="text-lg font-bold">{rupees(Number(order.total))}</span>
            </div>

            <dl className="mt-3 space-y-1 border-y border-border py-3 text-sm">
              <div className="flex justify-between">
                <dt>Item total</dt>
                <dd>{rupees(Number(order.subtotal))}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery fee</dt>
                <dd>{Number(order.delivery_fee) === 0 ? "FREE" : rupees(Number(order.delivery_fee))}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Taxes</dt>
                <dd>{rupees(Number(order.tax))}</dd>
              </div>
            </dl>

            {order.status !== "payment_pending" ? (
              <div className="mt-4 rounded-xl bg-secondary p-4 text-center text-sm">
                <p className="font-semibold">Payment received ✓</p>
                <p className="mt-1 text-muted-foreground">
                  Estimated delivery in {order.eta_minutes} minutes. Reference: {order.payment_ref}
                </p>
                <Button asChild className="mt-3 w-full">
                  <Link to="/my-orders">Track this order</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-4 text-center">
                  <p className="text-sm font-semibold">Scan with any UPI app</p>
                  <p className="text-xs text-muted-foreground">Google Pay · PhonePe · Paytm · BHIM</p>
                  {qrSrc && (
                    <img
                      src={qrSrc}
                      alt={`UPI QR code to pay ${settings.upi_id}`}
                      width={220}
                      height={220}
                      className="mx-auto mt-3 rounded-xl border border-border bg-card p-2"
                    />
                  )}
                  <p className="mt-2 text-sm">
                    UPI ID: <strong>{settings.upi_id}</strong>
                  </p>
                  <Button asChild variant="secondary" className="mt-3 w-full">
                    <a href={upiUri}>Open UPI app to pay {rupees(Number(order.total))}</a>
                  </Button>
                </div>

                <div className="mt-5 space-y-2">
                  <Label htmlFor="ref">UPI transaction / reference number *</Label>
                  <Input
                    id="ref"
                    value={reference}
                    maxLength={60}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. 412345678901"
                  />
                  <Button className="w-full" disabled={busy || !reference.trim()} onClick={confirm}>
                    {busy ? "Confirming…" : "I have paid — confirm my order"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Your order reaches the kitchen only after payment is confirmed. The reference is verified by our
                    team against the UPI statement.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
