import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader, PublicFooter, Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { rupees, useSession, type CartLine } from "@/lib/session";
import { requestGeolocation, lookupClientIp, type GeoFix } from "@/lib/geo";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trippy's Mehfill — Hyderabad's Cloud Kitchen" },
      {
        name: "description",
        content:
          "Order authentic Hyderabadi dum biryani, khichdi and curries from Trippy's Mehfill. Freshly cooked, delivered to your campus.",
      },
      { property: "og:title", content: "Trippy's Mehfill — Hyderabad's Cloud Kitchen" },
      {
        property: "og:description",
        content: "Order authentic Hyderabadi dum biryani, khichdi and curries from Trippy's Mehfill. Freshly cooked, delivered to your campus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerPage,
});

function CustomerPage() {
  const { loading: sessionLoading, user, role, status, name, phone, address } = useSession();
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [form, setForm] = useState({
    name: "",
    phone: "",
    campus: "",
    address: "",
    preference: "",
    notes: "",
  });
  const [placing, setPlacing] = useState(false);
  const [geo, setGeo] = useState<GeoFix | null>(null);
  const [locating, setLocating] = useState(false);
  const [placed, setPlaced] = useState<{ order_no: number; id: string } | null>(null);

  const canOrder = !!user && (status === "approved" || !!role);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || name, phone: f.phone || phone, address: f.address || address }));
  }, [user, name, phone, address]);

  async function shareLocation() {
    setLocating(true);
    try {
      const fix = await requestGeolocation();
      setGeo(fix);
      toast.success("Location captured");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not get your location");
    } finally {
      setLocating(false);
    }
  }


  const { data: menu = [], isLoading } = useQuery({
    queryKey: ["public-menu"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const lines = Object.values(cart);
  const total = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);

  function change(item: { id: string; name: string; price: number }, delta: number) {
    setCart((c) => {
      const qty = (c[item.id]?.qty ?? 0) + delta;
      const next = { ...c };
      if (qty <= 0) delete next[item.id];
      else next[item.id] = { id: item.id, name: item.name, price: Number(item.price), qty };
      return next;
    });
  }

  async function placeOrder() {
    if (lines.length === 0) return toast.error("Your cart is empty");
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim())
      return toast.error("Name, phone and address are required");
    setPlacing(true);
    const { data, error } = await supabase.rpc("place_order", {
      p_name: form.name,
      p_phone: form.phone,
      p_campus: form.campus,
      p_address: form.address,
      p_food_preference: form.preference,
      p_notes: form.notes,
      p_items: lines,
      p_total: total,
    });
    setPlacing(false);
    if (error) return toast.error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    setPlaced(row as { order_no: number; id: string });
    setCart({});
    toast.success(`Order #${row?.order_no} placed!`);
  }

  const specials = menu.filter((m) => m.is_special);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <section className="bg-primary px-4 pb-10 pt-6 text-center text-primary-foreground">
        <Logo className="mx-auto h-28 w-auto" />
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Taste the Royal Flavors of Hyderabad</h1>
        <p className="mt-2 text-sm opacity-85">Freshly prepared • Made with love • Authentic Hyderabadi taste</p>
        {specials.length > 0 && (
          <p className="mt-3 inline-block rounded-full bg-accent px-4 py-1 text-sm font-semibold text-accent-foreground">
            Today's Special: {specials.map((s) => s.name).join(" • ")}
          </p>
        )}
      </section>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-4 text-2xl font-bold">Today's Menu</h2>
          {isLoading && <p className="text-muted-foreground">Loading menu…</p>}
          {!isLoading && menu.length === 0 && (
            <p className="text-muted-foreground">No dishes available right now. Please check back soon.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {menu.map((item) => {
              const qty = cart[item.id]?.qty ?? 0;
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} loading="lazy" className="h-40 w-full object-cover" />
                  )}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-primary">{item.name}</h3>
                      <span className="shrink-0 font-bold text-accent-foreground">{rupees(Number(item.price))}</span>
                    </div>
                    <p className="flex-1 text-sm text-muted-foreground">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                        {item.category === "veg" ? "Veg" : "Non-veg"}
                        {item.is_special ? " · Special" : ""}
                      </span>
                      {qty === 0 ? (
                        <Button size="sm" onClick={() => change(item, 1)}>
                          Add
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => change(item, -1)}>
                            −
                          </Button>
                          <span className="w-6 text-center font-semibold">{qty}</span>
                          <Button size="sm" onClick={() => change(item, 1)}>
                            +
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-xl font-bold">Your Order</h2>
          {placed && (
            <div className="mt-3 rounded-xl bg-secondary p-3 text-sm">
              Order <strong>#{placed.order_no}</strong> received! We'll call you on {form.phone || "your number"} to
              confirm. Track it any time on the Track order page.
            </div>
          )}
          {lines.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Cart is empty — add something delicious.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2">
                  <span>
                    {l.name} × {l.qty}
                  </span>
                  <span className="flex items-center gap-2">
                    {rupees(l.price * l.qty)}
                    <button
                      className="text-destructive"
                      aria-label={`Remove ${l.name}`}
                      onClick={() => change({ id: l.id, name: l.name, price: l.price }, -l.qty)}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold">
            <span>Total</span>
            <span>{rupees(total)}</span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="c-name">Name *</Label>
              <Input id="c-name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="c-phone">Phone *</Label>
              <Input id="c-phone" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="c-campus">Campus</Label>
              <Input id="c-campus" maxLength={100} value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="c-address">Delivery address *</Label>
              <Textarea id="c-address" maxLength={400} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="c-pref">Food preference</Label>
              <Input id="c-pref" placeholder="Less spicy, extra raita…" maxLength={100} value={form.preference} onChange={(e) => setForm({ ...form, preference: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="c-notes">Notes</Label>
              <Textarea id="c-notes" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">Payment: Cash on Delivery</p>
            <Button className="w-full" disabled={placing} onClick={placeOrder}>
              {placing ? "Placing order…" : `Place order · ${rupees(total)}`}
            </Button>
          </div>
        </aside>
      </main>

      <PublicFooter />
    </div>
  );
}
