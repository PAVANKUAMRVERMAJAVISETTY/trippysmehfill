import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader, PublicFooter } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rupees } from "@/lib/session";
import { mapsLink } from "@/lib/geo";
import { OrderProgress, StatusBadge } from "@/components/order-progress";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track your order live — Trippy's Mehfill" },
      { name: "description", content: "Follow your Trippy's Mehfill order from the kitchen to your door with live delivery partner tracking." },
      { property: "og:title", content: "Track your order live — Trippy's Mehfill" },
      { property: "og:description", content: "Live status and delivery partner location for your Hyderabadi feast." },
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
  subtotal: number | null;
  delivery_fee: number | null;
  tax: number | null;
  eta_minutes: number | null;
  created_at: string;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_number: string | null;
  driver_photo: string | null;
  driver_lat: number | null;
  driver_lng: number | null;
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

  // Keep the live tracking screen fresh while an order is on the way.
  useEffect(() => {
    if (!rows || rows.length === 0) return;
    const active = rows.some((r) => r.status !== "delivered" && r.status !== "cancelled");
    if (!active) return;
    const t = setInterval(() => void search(), 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">Live order tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the phone number you ordered with.</p>
        <div className="mt-4 flex gap-2">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" maxLength={20} />
          <Button onClick={search} disabled={loading || !phone.trim()}>
            {loading ? "Searching…" : "Track"}
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
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(o.created_at).toLocaleString("en-IN")} · {rupees(Number(o.total))}
                {o.status !== "delivered" && o.eta_minutes ? ` · ETA ${o.eta_minutes} min` : ""}
              </p>

              <OrderProgress status={o.status} />

              <ul className="mt-3 text-sm">
                {(o.items ?? []).map((i, idx) => (
                  <li key={idx}>
                    {i.name} × {i.qty}
                  </li>
                ))}
              </ul>

              {o.driver_name && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted p-3">
                  {o.driver_photo ? (
                    <img src={o.driver_photo} alt={o.driver_name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {o.driver_name.slice(0, 1)}
                    </div>
                  )}
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">{o.driver_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.vehicle_number ?? "Delivery partner"}
                      {o.driver_phone ? " · " : ""}
                      {o.driver_phone && (
                        <a className="underline" href={`tel:${o.driver_phone}`}>
                          {o.driver_phone}
                        </a>
                      )}
                    </p>
                  </div>
                  {o.driver_lat != null && o.driver_lng != null && (
                    <Button asChild size="sm" variant="secondary">
                      <a href={mapsLink(o.driver_lat, o.driver_lng)} target="_blank" rel="noopener noreferrer">
                        📍 Live map
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {o.status === "delivered" && (
                <a className="mt-3 inline-block text-sm font-medium text-primary underline" href={`/feedback?order=${o.id}`}>
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
