import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rupees, startOfToday, daysAgo, useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/drivers")({
  component: DriversPage,
});

type OrderRow = {
  id: string;
  order_no: number;
  customer_name: string;
  total: number;
  status: string;
  driver_id: string | null;
  created_at: string;
  delivery_minutes: number | null;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

function DriversPage() {
  const { role } = useSession();
  const [driverId, setDriverId] = useState("");

  const { data: drivers = [] } = useQuery({
    queryKey: ["driver-stat-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "driver");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, name, username, active").in("id", ids);
      return data ?? [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["driver-stat-orders", driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, customer_name, total, status, driver_id, created_at, delivery_minutes")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  const stats = useMemo(() => {
    const from = (t: number) => orders.filter((o) => new Date(o.created_at).getTime() >= t);
    const delivered = orders.filter((o) => o.status === "delivered");
    const times = delivered.map((o) => o.delivery_minutes).filter((m): m is number => typeof m === "number");
    return {
      today: from(startOfToday().getTime()).length,
      week: from(daysAgo(6).getTime()).length,
      month: from(daysAgo(29).getTime()).length,
      collected: delivered.reduce((s, o) => s + Number(o.total), 0),
      pending: orders.filter((o) => o.status === "pending" || o.status === "assigned").length,
      completed: delivered.length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      avg: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
    };
  }, [orders]);

  if (role && role !== "admin") {
    return <p className="text-muted-foreground">Only the owner can view delivery partner statistics.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Delivery Partner Stats</h1>

      <select
        className="mt-4 w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm"
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
        aria-label="Select delivery partner"
      >
        <option value="">Select a delivery partner…</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.username}){d.active ? "" : " — inactive"}
          </option>
        ))}
      </select>

      {!driverId && <p className="mt-6 text-muted-foreground">Pick a partner to see their performance.</p>}

      {driverId && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Today's orders" value={stats.today} />
            <Stat label="Week orders" value={stats.week} />
            <Stat label="Month orders" value={stats.month} />
            <Stat label="Collected amount" value={rupees(stats.collected)} />
            <Stat label="Pending" value={stats.pending} />
            <Stat label="Completed" value={stats.completed} />
            <Stat label="Cancelled" value={stats.cancelled} />
            <Stat label="Avg delivery time" value={stats.avg ? `${stats.avg} min` : "—"} />
          </div>

          <h2 className="mt-8 text-xl font-bold">Order history</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  {["#", "Date", "Customer", "Total", "Status", "Minutes"].map((h) => (
                    <th key={h} className="p-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-3 font-semibold">{o.order_no}</td>
                    <td className="whitespace-nowrap p-3">{new Date(o.created_at).toLocaleString("en-IN")}</td>
                    <td className="p-3">{o.customer_name}</td>
                    <td className="p-3">{rupees(Number(o.total))}</td>
                    <td className="p-3 capitalize">{o.status}</td>
                    <td className="p-3">{o.delivery_minutes ?? "—"}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">No orders for this partner yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
