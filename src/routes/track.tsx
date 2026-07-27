import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader, PublicFooter } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rupees } from "@/lib/session";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track your order — Trippy's Mehfill" },
      { name: "description", content: "Enter your phone number to see the live status of your Trippy's Mehfill order." },
      { property: "og:title", content: "Track your order — Trippy's Mehfill" },
      { property: "og:description", content: "Live status of your Hyderabadi feast from Trippy's Mehfill." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackPage,
});

type TrackRow = {
  id: string;
  order_no: number;
  status: string;
  total: number;
  created_at: string;
  driver_name: string | null;
  items: { name: string; qty: number }[];
};




function TrackPage() {
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState<TrackRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const { data, error } = await supabase.rpc("track_orders", { p_phone: phone });
    setLoading(false);
    setRows(error ? [] : ((data ?? []) as unknown as TrackRow[]));
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">Support desk — track your order</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the phone number you ordered with.</p>
        <div className="mt-4 flex gap-2">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" maxLength={20} />
          <Button onClick={search} disabled={loading || !phone.trim()}>
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>

        {rows !== null && rows.length === 0 && (
          <p className="mt-6 rounded-xl bg-muted p-4 text-center text-muted-foreground">No Active Orders Found</p>
        )}

        <div className="mt-6 space-y-4">
          {(rows ?? []).map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <strong>Order #{o.order_no}</strong>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase">{o.status}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(o.created_at).toLocaleString("en-IN")} · {rupees(Number(o.total))}
                {o.driver_name ? ` · Delivery partner: ${o.driver_name}` : ""}
              </p>
              <ul className="mt-2 text-sm">
                {(o.items ?? []).map((i, idx) => (
                  <li key={idx}>
                    {i.name} × {i.qty}
                  </li>
                ))}
              </ul>
              {o.status === "delivered" && (
                <a className="mt-2 inline-block text-sm font-medium text-primary underline" href={`/feedback?order=${o.id}`}>
                  Rate this order
                </a>
              )}
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
