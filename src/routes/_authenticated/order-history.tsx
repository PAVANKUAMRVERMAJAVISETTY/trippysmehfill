import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rupees, startOfToday, daysAgo } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/order-history")({
  component: OrderHistoryPage,
});

type OrderRow = {
  id: string;
  order_no: number;
  customer_name: string;
  phone: string;
  campus: string | null;
  address: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: string;
  driver_id: string | null;
  created_at: string;
  delivered_at: string | null;
  delivery_minutes: number | null;
};

function OrderHistoryPage() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const [campus, setCampus] = useState("all");
  const [driver, setDriver] = useState("all");

  const { data: orders = [] } = useQuery({
    queryKey: ["history-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["history-drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name");
      return data ?? [];
    },
  });
  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.name ?? "—";

  const { data: ratings = [] } = useQuery({
    queryKey: ["history-feedback"],
    queryFn: async () => {
      const { data } = await supabase.from("feedback").select("order_id, food, taste, packing, delivery");
      return data ?? [];
    },
  });
  const ratingFor = (orderId: string) => {
    const f = ratings.find((r) => r.order_id === orderId);
    return f ? ((f.food + f.taste + f.packing + f.delivery) / 4).toFixed(1) : "—";
  };

  const campuses = useMemo(
    () => Array.from(new Set(orders.map((o) => o.campus).filter(Boolean))) as string[],
    [orders],
  );

  const filtered = useMemo(() => {
    const min =
      period === "today" ? startOfToday().getTime() : period === "week" ? daysAgo(6).getTime() : period === "month" ? daysAgo(29).getTime() : 0;
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (new Date(o.created_at).getTime() < min) return false;
      if (status !== "all" && o.status !== status) return false;
      if (campus !== "all" && o.campus !== campus) return false;
      if (driver !== "all" && o.driver_id !== driver) return false;
      if (!q) return true;
      return (
        String(o.order_no).includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        (o.campus ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, period, status, campus, driver]);

  const rows = () =>
    filtered.map((o) => ({
      "Order No": o.order_no,
      Date: new Date(o.created_at).toLocaleString("en-IN"),
      Customer: o.customer_name,
      Phone: o.phone,
      Campus: o.campus ?? "",
      Address: o.address,
      Items: (o.items ?? []).map((i) => `${i.name} x${i.qty}`).join(", "),
      Total: Number(o.total),
      Status: o.status,
      Payment: "Cash on delivery",
      Driver: driverName(o.driver_id),
      "Delivered at": o.delivered_at ? new Date(o.delivered_at).toLocaleString("en-IN") : "",
      "Minutes": o.delivery_minutes ?? "",
      Rating: ratingFor(o.id),
    }));

  function exportExcel() {
    const data = rows();
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `trippys-mehfill-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const data = rows();
    const win = window.open("", "_blank");
    if (!win) return;
    const headers = data.length ? Object.keys(data[0]) : [];
    win.document.write(`<html><head><title>Trippy's Mehfill — Orders</title>
      <style>body{font-family:system-ui;padding:24px}h1{color:#7a2e12}table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f7e2bd}</style></head><body>
      <h1>Trippy's Mehfill — Order History</h1><p>${data.length} orders · ${new Date().toLocaleString("en-IN")}</p>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>
      ${data.map((r) => `<tr>${headers.map((h) => `<td>${String((r as Record<string, unknown>)[h] ?? "")}</td>`).join("")}</tr>`).join("")}
      </tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  const selectCls = "rounded-lg border border-input bg-background px-3 py-2 text-sm";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order History</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf}>Export PDF</Button>
          <Button onClick={exportExcel}>Export Excel</Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Input className="w-56" placeholder="Search name, phone, order no" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={selectCls} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className={selectCls} value={campus} onChange={(e) => setCampus(e.target.value)} aria-label="Campus">
          <option value="all">All campuses</option>
          {campuses.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className={selectCls} value={driver} onChange={(e) => setDriver(e.target.value)} aria-label="Driver">
          <option value="all">All drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              {["#", "Date", "Customer", "Phone", "Campus", "Items", "Total", "Status", "Driver", "Rating"].map((h) => (
                <th key={h} className="whitespace-nowrap p-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border align-top">
                <td className="p-3 font-semibold">{o.order_no}</td>
                <td className="whitespace-nowrap p-3">{new Date(o.created_at).toLocaleString("en-IN")}</td>
                <td className="p-3">{o.customer_name}</td>
                <td className="whitespace-nowrap p-3">{o.phone}</td>
                <td className="p-3">{o.campus ?? "—"}</td>
                <td className="p-3">{(o.items ?? []).map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                <td className="whitespace-nowrap p-3">{rupees(Number(o.total))}</td>
                <td className="p-3 capitalize">{o.status}</td>
                <td className="p-3">{driverName(o.driver_id)}</td>
                <td className="p-3">{ratingFor(o.id)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-muted-foreground">No orders match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
