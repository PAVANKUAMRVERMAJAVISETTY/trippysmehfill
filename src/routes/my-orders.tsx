import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader, PublicFooter } from "@/components/brand";
import { useSession, rupees } from "@/lib/session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/my-orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Order history — Trippy's Mehfill" },
      { name: "description", content: "See every Trippy's Mehfill order you have placed and its live status." },
      { property: "og:title", content: "Order history — Trippy's Mehfill" },
      { property: "og:description", content: "Track your past and active Hyderabadi biryani orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyOrdersPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  assigned: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-accent text-accent-foreground",
  assigned: "bg-secondary text-secondary-foreground",
  delivered: "bg-primary text-primary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

function MyOrdersPage() {
  const { loading, user, name } = useSession();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, created_at, items, total, status")
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
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        STATUS_STYLE[o.status] ?? "bg-muted"
                      }`}
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("en-IN")}
                  </p>
                  <ul className="mt-2 text-sm">
                    {((o.items ?? []) as { name: string; qty: number }[]).map((i, idx) => (
                      <li key={idx}>
                        {i.name} × {i.qty}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-bold">{rupees(Number(o.total))} · COD</p>
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
