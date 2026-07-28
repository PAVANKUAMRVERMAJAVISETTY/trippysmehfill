import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { rupees } from "@/lib/session";
import { useNewOrderAlerts } from "@/lib/use-order-alerts";
import { mapsLink } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/dispatch")({
  component: DispatchPage,
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
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: "pending" | "assigned" | "delivered" | "cancelled";
  driver_id: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  geo_address: string | null;
  ip_address: string | null;
};


const STATUS_STYLE: Record<string, string> = {
  pending: "bg-accent text-accent-foreground",
  assigned: "bg-secondary text-secondary-foreground",
  delivered: "bg-primary text-primary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

function DispatchPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<OrderRow | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["dispatch-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["pending", "assigned", "delivered"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "driver");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, name").in("id", ids).eq("active", true);
      return data ?? [];
    },
  });

  useNewOrderAlerts(() => qc.invalidateQueries({ queryKey: ["dispatch-orders"] }));

  useEffect(() => {
    const channel = supabase
      .channel("dispatch-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["dispatch-orders"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);


  async function assign(order: OrderRow, driverId: string) {
    const { error } = await supabase
      .from("orders")
      .update({
        driver_id: driverId || null,
        status: driverId ? "assigned" : "pending",
        assigned_at: driverId ? new Date().toISOString() : null,
      })
      .eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success(driverId ? "Driver assigned" : "Driver removed");
    qc.invalidateQueries({ queryKey: ["dispatch-orders"] });
  }

  async function cancelOrder(order: OrderRow) {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success(`Order #${order.order_no} cancelled`);
    qc.invalidateQueries({ queryKey: ["dispatch-orders"] });
  }

  async function removeOrder(order: OrderRow) {
    if (!confirm(`Permanently delete order #${order.order_no}? This cannot be undone.`)) return;
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success("Order deleted");
    qc.invalidateQueries({ queryKey: ["dispatch-orders"] });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { error } = await supabase
      .from("orders")
      .update({
        customer_name: editing.customer_name,
        phone: editing.phone,
        campus: editing.campus,
        address: editing.address,
        food_preference: editing.food_preference,
        notes: editing.notes,
        total: editing.total,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["dispatch-orders"] });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Live Orders</h1>
      <p className="text-sm text-muted-foreground">New orders appear here automatically.</p>

      {orders.length === 0 && <p className="mt-6 text-muted-foreground">No orders yet.</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => {
          const locked = o.status === "delivered";
          return (
            <article key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <strong className="text-lg">#{o.order_no}</strong>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${STATUS_STYLE[o.status]}`}>
                  {o.status}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">
                {o.customer_name} · <a className="underline" href={`tel:${o.phone}`}>{o.phone}</a>
              </p>
              <p className="text-sm text-muted-foreground">
                {o.campus ? `${o.campus} · ` : ""}
                {o.address}
              </p>
              <p className="text-xs text-muted-foreground">IP: {o.ip_address ?? "not captured"}</p>
              {o.geo_address && <p className="text-xs text-muted-foreground">GPS: {o.geo_address}</p>}
              {o.latitude != null && o.longitude != null && (
                <a
                  href={mapsLink(o.latitude, o.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                >
                  📍 View Live Location
                </a>
              )}
              {o.food_preference && <p className="text-sm text-muted-foreground">Preference: {o.food_preference}</p>}
              {o.notes && <p className="text-sm text-muted-foreground">Notes: {o.notes}</p>}

              <ul className="mt-2 text-sm">
                {(o.items ?? []).map((i, idx) => (
                  <li key={idx}>
                    {i.name} × {i.qty}
                  </li>
                ))}
              </ul>
              <p className="mt-1 font-bold">{rupees(Number(o.total))} · COD</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p>

              {locked ? (
                <p className="mt-3 rounded-lg bg-muted p-2 text-center text-xs text-muted-foreground">
                  Delivered — read only
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  <select
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={o.driver_id ?? ""}
                    onChange={(e) => assign(o, e.target.value)}
                    aria-label={`Assign driver for order ${o.order_no}`}
                  >
                    <option value="">Assign delivery partner…</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(o)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => cancelOrder(o)}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => removeOrder(o)}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <form onSubmit={saveEdit} className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-card p-5">
            <h2 className="text-lg font-bold">Edit order #{editing.order_no}</h2>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="e-name">Customer</Label>
                <Input id="e-name" value={editing.customer_name} onChange={(e) => setEditing({ ...editing, customer_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="e-phone">Phone</Label>
                <Input id="e-phone" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="e-campus">Campus</Label>
                <Input id="e-campus" value={editing.campus ?? ""} onChange={(e) => setEditing({ ...editing, campus: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="e-addr">Address</Label>
                <Textarea id="e-addr" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="e-pref">Food preference</Label>
                <Input id="e-pref" value={editing.food_preference ?? ""} onChange={(e) => setEditing({ ...editing, food_preference: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="e-notes">Notes</Label>
                <Textarea id="e-notes" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="e-total">Total (₹)</Label>
                <Input id="e-total" type="number" value={editing.total} onChange={(e) => setEditing({ ...editing, total: Number(e.target.value) })} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(null)}>
                Close
              </Button>
              <Button className="flex-1">Save changes</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
