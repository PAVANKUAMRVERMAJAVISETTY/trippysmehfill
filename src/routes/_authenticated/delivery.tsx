import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { rupees, useSession, startOfToday, daysAgo } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/delivery")({
  component: DeliveryPage,
});

type OrderRow = {
  id: string;
  order_no: number;
  customer_name: string;
  phone: string;
  campus: string | null;
  address: string;
  food_preference: string | null;
  notes: string | null;
  items: { name: string; qty: number }[];
  total: number;
  status: string;
  created_at: string;
  assigned_at: string | null;
  delivered_at: string | null;
};

function DeliveryPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["my-deliveries", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("driver_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("driver-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["my-deliveries"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, user]);

  const today = startOfToday().getTime();
  const week = daysAgo(6).getTime();
  const month = daysAgo(29).getTime();
  const inRange = (o: OrderRow, from: number) => new Date(o.created_at).getTime() >= from;
  const delivered = orders.filter((o) => o.status === "delivered");
  const collected = (from: number) =>
    delivered.filter((o) => inRange(o, from)).reduce((s, o) => s + Number(o.total), 0);

  const active = orders.filter((o) => o.status === "assigned" || o.status === "out_for_delivery" || o.status === "ready");

  async function markDelivered(o: OrderRow) {
    const start = o.assigned_at ? new Date(o.assigned_at).getTime() : new Date(o.created_at).getTime();
    const minutes = Math.max(1, Math.round((Date.now() - start) / 60000));
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered", delivered_at: new Date().toISOString(), delivery_minutes: minutes })
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-deliveries"] });
    toast.success(`Order #${o.order_no} delivered`);

    const link = `${window.location.origin}/feedback?order=${o.id}`;
    const msg = `Hello ${o.customer_name}, Thank you for ordering from Trippy's Mehfill. Please rate your experience here: ${link}`;
    const phone = o.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone.length === 10 ? "91" + phone : phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">My Deliveries</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Today's orders" value={orders.filter((o) => inRange(o, today)).length} />
        <Stat label="This week" value={orders.filter((o) => inRange(o, week)).length} />
        <Stat label="This month" value={orders.filter((o) => inRange(o, month)).length} />
        <Stat label="Collected today" value={rupees(collected(today))} />
        <Stat label="Collected this week" value={rupees(collected(week))} />
        <Stat label="Collected this month" value={rupees(collected(month))} />
      </div>

      <h2 className="mt-8 text-xl font-bold">Orders to deliver</h2>
      {active.length === 0 && <p className="mt-2 text-muted-foreground">Nothing assigned right now.</p>}
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((o) => (
          <article key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <strong className="text-lg">#{o.order_no}</strong>
            <p className="mt-1 text-sm">
              {o.customer_name} ·{" "}
              <a className="underline" href={`tel:${o.phone}`}>
                {o.phone}
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              {o.campus ? `${o.campus} · ` : ""}
              {o.address}
            </p>
            {o.food_preference && <p className="text-sm text-muted-foreground">Preference: {o.food_preference}</p>}
            {o.notes && <p className="text-sm text-muted-foreground">Notes: {o.notes}</p>}
            <ul className="mt-2 text-sm">
              {(o.items ?? []).map((i, idx) => (
                <li key={idx}>
                  {i.name} × {i.qty}
                </li>
              ))}
            </ul>
            <p className="mt-1 font-bold">Collect {rupees(Number(o.total))} (COD)</p>
            <Button className="mt-3 w-full" onClick={() => markDelivered(o)}>
              Delivered
            </Button>
          </article>
        ))}
      </div>

      <h2 className="mt-8 text-xl font-bold">Recently delivered</h2>
      <div className="mt-3 space-y-2">
        {delivered.slice(0, 15).map((o) => (
          <div key={o.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <span>
              #{o.order_no} · {o.customer_name}
            </span>
            <span className="text-muted-foreground">
              {o.delivered_at ? new Date(o.delivered_at).toLocaleString("en-IN") : ""} · {rupees(Number(o.total))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
