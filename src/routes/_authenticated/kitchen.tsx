import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { rupees } from "@/lib/session";
import { useNewOrderAlerts } from "@/lib/use-order-alerts";
import { STAGE_LABEL, nextStage } from "@/lib/store";
import { StatusBadge } from "@/components/order-progress";

export const Route = createFileRoute("/_authenticated/kitchen")({
  component: KitchenPage,
});

type KitchenOrder = {
  id: string;
  order_no: number;
  customer_name: string;
  phone: string;
  items: { name: string; qty: number }[];
  total: number;
  status: string;
  food_preference: string | null;
  notes: string | null;
  created_at: string;
  accepted_at: string | null;
  payment_ref: string | null;
};

const KITCHEN_STAGES = ["payment_successful", "accepted", "preparing", "cooking", "packing", "ready"];

function elapsed(from: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
  return `${mins} min`;
}

function KitchenPage() {
  const qc = useQueryClient();
  const [, setTick] = useState(0);

  useNewOrderAlerts(() => qc.invalidateQueries({ queryKey: ["kitchen-orders"] }));

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: orders = [] } = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_no, customer_name, phone, items, total, status, food_preference, notes, created_at, accepted_at, payment_ref")
        .in("status", KITCHEN_STAGES)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data as unknown as KitchenOrder[];
    },
  });

  async function advance(o: KitchenOrder) {
    const next = nextStage(o.status);
    if (!next) return;
    const patch: Record<string, unknown> = { status: next };
    if (next === "accepted") patch.accepted_at = new Date().toISOString();
    if (next === "ready") patch.ready_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success(`#${o.order_no} → ${STAGE_LABEL[next]}`);
    qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Kitchen</h1>
      <p className="text-sm text-muted-foreground">
        Paid orders arrive here automatically with a sound alert. Move each ticket through the stages.
      </p>

      {orders.length === 0 && <p className="mt-6 text-muted-foreground">No live tickets right now.</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => {
          const next = nextStage(o.status);
          const late = Date.now() - new Date(o.created_at).getTime() > 30 * 60000;
          return (
            <article
              key={o.id}
              className={`rounded-2xl border bg-card p-4 shadow-sm ${late ? "border-destructive" : "border-border"}`}
            >
              <div className="flex items-center justify-between">
                <strong className="text-lg">#{o.order_no}</strong>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-1 text-sm">{o.customer_name}</p>
              <p className={`text-xs ${late ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                ⏱ {elapsed(o.created_at)} since order
                {o.accepted_at ? ` · ${elapsed(o.accepted_at)} in kitchen` : ""}
              </p>

              <ul className="mt-2 text-sm">
                {(o.items ?? []).map((i, idx) => (
                  <li key={idx}>
                    <strong>{i.qty}×</strong> {i.name}
                  </li>
                ))}
              </ul>
              {o.food_preference && <p className="mt-1 text-sm text-muted-foreground">Preference: {o.food_preference}</p>}
              {o.notes && <p className="text-sm text-muted-foreground">Notes: {o.notes}</p>}
              <p className="mt-1 text-sm font-bold">{rupees(Number(o.total))} · Paid ({o.payment_ref ?? "UPI"})</p>

              {next && (
                <Button className="mt-3 w-full" onClick={() => advance(o)}>
                  Mark {STAGE_LABEL[next]}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
