import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rupees, startOfToday, daysAgo } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type OrderRow = {
  id: string;
  order_no: number;
  customer_name: string;
  campus: string | null;
  total: number;
  status: string;
  created_at: string;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

function DashboardPage() {
  const { data: orders = [] } = useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, customer_name, campus, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ["dashboard-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, customer_name, food, taste, packing, delivery, comments, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = startOfToday().getTime();
  const week = daysAgo(6).getTime();
  const month = daysAgo(29).getTime();
  const from = (t: number) => orders.filter((o) => new Date(o.created_at).getTime() >= t);
  const revenue = (list: OrderRow[]) =>
    list.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
  const count = (s: string) => orders.filter((o) => o.status === s).length;

  const avgRating =
    feedback.length === 0
      ? 0
      : feedback.reduce((s, f) => s + (f.food + f.taste + f.packing + f.delivery) / 4, 0) / feedback.length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Everything happening at Trippy's Mehfill.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders today" value={from(today).length} />
        <Stat label="Orders this week" value={from(week).length} />
        <Stat label="Orders this month" value={from(month).length} />
        <Stat label="Average rating" value={avgRating ? `${avgRating.toFixed(1)} / 5` : "—"} />
        <Stat label="Revenue today" value={rupees(revenue(from(today)))} />
        <Stat label="Revenue this week" value={rupees(revenue(from(week)))} />
        <Stat label="Revenue this month" value={rupees(revenue(from(month)))} />
        <Stat label="Pending" value={count("pending")} />
        <Stat label="Assigned" value={count("assigned")} />
        <Stat label="Delivered" value={count("delivered")} />
        <Stat label="Cancelled" value={count("cancelled")} />
        <Stat label="Total orders" value={orders.length} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold">Latest orders</h2>
          <div className="mt-3 space-y-2">
            {orders.slice(0, 8).map((o) => (
              <div key={o.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                <span>
                  #{o.order_no} · {o.customer_name}
                  {o.campus ? ` · ${o.campus}` : ""}
                </span>
                <span className="text-muted-foreground">
                  {rupees(Number(o.total))} · {o.status}
                </span>
              </div>
            ))}
            {orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold">Latest feedback</h2>
          <div className="mt-3 space-y-2">
            {feedback.slice(0, 8).map((f) => (
              <div key={f.id} className="rounded-xl border border-border bg-card p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{f.customer_name}</span>
                  <span className="text-primary">
                    {"★".repeat(Math.round((f.food + f.taste + f.packing + f.delivery) / 4))}
                  </span>
                </div>
                {f.comments && <p className="mt-1 text-muted-foreground">{f.comments}</p>}
              </div>
            ))}
            {feedback.length === 0 && <p className="text-muted-foreground">No feedback yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
