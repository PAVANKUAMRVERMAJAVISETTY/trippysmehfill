import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader, PublicFooter } from "@/components/brand";
import { useSession, rupees } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { OrderProgress, StatusBadge } from "@/components/order-progress";

export const Route = createFileRoute("/my-orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Order history — Trippy's Mehfill" },
      { name: "description", content: "See every Trippy's Mehfill order you have placed, its payment status and live progress." },
      { property: "og:title", content: "Order history — Trippy's Mehfill" },
      { property: "og:description", content: "Track your past and active Hyderabadi biryani orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const { loading, user, name } = useSession();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, created_at, items, subtotal, delivery_fee, tax, total, status, payment_status, eta_minutes")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Order history</h1>

        {loading && <p className="mt-4 text-muted-foreground">Loading…</p>}

        {!loading && !user && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">Please sign in to see your orders.</p>
            <Button asChild className="mt-3">
              <Link to="/account">Sign in or register</Link>
            </Button>
          </div>
        )}

        {user && (
          <>
            <p className="text-sm text-muted-foreground">Signed in as {name || user.email}</p>
            {isLoading && <p className="mt-4 text-muted-foreground">Loading your orders…</p>}
            {!isLoading && orders.length === 0 && (
              <p className="mt-6 text-muted-foreground">You haven't placed any orders yet.</p>
            )}
            <ul className="mt-5 space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>Order #{o.order_no}</strong>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p>

                  <ul className="mt-2 text-sm">
                    {((o.items ?? []) as { name: string; qty: number }[]).map((i, idx) => (
                      <li key={idx}>
                        {i.name} × {i.qty}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {rupees(Number(o.subtotal))} + {rupees(Number(o.delivery_fee))} delivery +{" "}
                    {rupees(Number(o.tax))} tax
                  </p>
                  <p className="font-bold">{rupees(Number(o.total))} · UPI</p>

                  {o.status === "payment_pending" ? (
                    <Button asChild size="sm" className="mt-3">
                      <Link to="/pay/$orderId" params={{ orderId: o.id }}>
                        Complete payment
                      </Link>
                    </Button>
                  ) : (
                    <OrderProgress status={o.status} />
                  )}

                  {o.status === "delivered" && (
                    <a className="mt-2 inline-block text-sm font-medium text-primary underline" href={`/feedback?order=${o.id}`}>
                      Rate this order
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
