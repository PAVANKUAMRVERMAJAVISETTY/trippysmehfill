import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reviews")({
  component: ReviewsPage,
});

function Stars({ n }: { n: number }) {
  return (
    <span className="text-primary" aria-label={`${n} out of 5`}>
      {"★".repeat(n)}
      <span className="text-muted-foreground">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function ReviewsPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["all-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, food, taste, packing, delivery, comments, created_at, orders(order_no, customer_name, driver_id)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["feedback-drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, name");
      return data ?? [];
    },
  });
  const driverName = (id: string | null | undefined) => drivers.find((d) => d.id === id)?.name ?? "—";

  const avg = rows.length
    ? rows.reduce((s, f) => s + (f.food + f.taste + f.packing + f.delivery) / 4, 0) / rows.length
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Customer Feedback</h1>
      <p className="text-sm text-muted-foreground">
        {rows.length} reviews · average {avg ? avg.toFixed(1) : "—"} / 5
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((f) => (
          <article key={f.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <strong>{f.orders?.customer_name ?? "Customer"}</strong>
              <span className="text-xs text-muted-foreground">#{f.orders?.order_no}</span>
            </div>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Food</dt><dd><Stars n={f.food} /></dd></div>
              <div className="flex justify-between"><dt>Taste</dt><dd><Stars n={f.taste} /></dd></div>
              <div className="flex justify-between"><dt>Packing</dt><dd><Stars n={f.packing} /></dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd><Stars n={f.delivery} /></dd></div>
            </dl>
            {f.comments && <p className="mt-2 text-sm text-muted-foreground">“{f.comments}”</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(f.created_at).toLocaleString("en-IN")} · Driver: {driverName(f.orders?.driver_id)}
            </p>
          </article>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">No feedback yet.</p>}
      </div>
    </div>
  );
}
