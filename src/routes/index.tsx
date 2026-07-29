import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader, PublicFooter, Logo } from "@/components/brand";
import { PromoBanner } from "@/components/promo-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { rupees, useSession, type CartLine } from "@/lib/session";
import { requestGeolocation, lookupClientIp, type GeoFix } from "@/lib/geo";
import {
  CATEGORY_LABEL,
  MENU_CATEGORIES,
  priceOrder,
  prettyTime,
  useStoreSettings,
  type MenuCategory,
} from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trippy's Mehfill — Hyderabad's Cloud Kitchen" },
      {
        name: "description",
        content:
          "Order authentic Hyderabadi dum biryani, khichdi and curries from Trippy's Mehfill. Freshly cooked, delivered hot to your campus.",
      },
      { property: "og:title", content: "Trippy's Mehfill — Hyderabad's Cloud Kitchen" },
      {
        property: "og:description",
        content: "Order authentic Hyderabadi dum biryani, khichdi and curries. Freshly cooked, delivered to your campus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerPage,
});

function CustomerPage() {
  const navigate = useNavigate();
  const { loading: sessionLoading, user, role, status, name, phone, address } = useSession();
  const { settings } = useStoreSettings();

  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MenuCategory>("all");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", campus: "", address: "", preference: "", notes: "" });
  const [placing, setPlacing] = useState(false);
  const [geo, setGeo] = useState<GeoFix | null>(null);
  const [locating, setLocating] = useState(false);

  const canOrder = !!user && (status === "approved" || !!role);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || name, phone: f.phone || phone, address: f.address || address }));
  }, [user, name, phone, address]);

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
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);
  const totals = priceOrder(subtotal, settings);

  const specials = menu.filter((m) => m.is_special);
  const popular = menu.slice(0, 4);
  const visible = menu.filter((m) => {
    const matchesCategory = category === "all" || (m.category ?? "").toLowerCase() === category;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || m.name.toLowerCase().includes(q) || (m.description ?? "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  function change(item: { id: string; name: string; price: number }, delta: number) {
    setCart((c) => {
      const qty = (c[item.id]?.qty ?? 0) + delta;
      const next = { ...c };
      if (qty <= 0) delete next[item.id];
      else next[item.id] = { id: item.id, name: item.name, price: Number(item.price), qty };
      return next;
    });
  }

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

  async function placeOrder() {
    if (!settings.is_open) return toast.error("The restaurant is currently closed");
    if (!canOrder) return toast.error("Please Sign In or Register to Place an Order");
    if (lines.length === 0) return toast.error("Your cart is empty");
    if (totals.belowMinimum) return toast.error(`Minimum order value is ${rupees(settings.min_order_value)}`);
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim())
      return toast.error("Name, phone and address are required");

    setPlacing(true);
    let fix = geo;
    if (!fix) {
      try {
        fix = await requestGeolocation();
        setGeo(fix);
      } catch (err) {
        setPlacing(false);
        return toast.error(err instanceof Error ? err.message : "Location access is required");
      }
    }
    const ip = await lookupClientIp();

    const { data, error } = await supabase.rpc("place_order", {
      p_name: form.name,
      p_phone: form.phone,
      p_campus: form.campus,
      p_address: form.address,
      p_food_preference: form.preference,
      p_notes: form.notes,
      p_items: lines,
      p_total: totals.total,
      p_latitude: fix.latitude,
      p_longitude: fix.longitude,
      p_geo_address: fix.label,
      p_ip_address: ip ?? undefined,
    });
    setPlacing(false);
    if (error) return toast.error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    setCart({});
    setCheckoutOpen(false);
    toast.success(`Order #${row?.order_no} created — complete the payment`);
    navigate({ to: "/pay/$orderId", params: { orderId: String(row?.id) } });
  }

  const cartCount = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PublicHeader />
      <PromoBanner />

      {!settings.is_open && (
        <div className="bg-destructive px-4 py-3 text-center text-sm font-semibold text-destructive-foreground">
          🚫 {settings.closed_message} (Opening Hours: {prettyTime(settings.open_time)} to{" "}
          {prettyTime(settings.close_time)}) — you can still browse the menu.
        </div>
      )}

      <section className="bg-primary px-4 pb-10 pt-6 text-center text-primary-foreground">
        <Logo className="mx-auto h-28 w-auto" />
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Taste the Royal Flavors of Hyderabad</h1>
        <p className="mt-2 text-sm opacity-85">Freshly prepared • Made with love • Authentic Hyderabadi taste</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">
            ⏱ {settings.eta_minutes} min delivery
          </span>
          <span className="rounded-full bg-primary-foreground/10 px-3 py-1">
            Free delivery above {rupees(settings.free_delivery_threshold)}
          </span>
          <span className="rounded-full bg-primary-foreground/10 px-3 py-1">
            Min order {rupees(settings.min_order_value)}
          </span>
        </div>

        <div className="mx-auto mt-5 max-w-xl">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search biryani, curries, desserts…"
            aria-label="Search the menu"
            className="bg-card text-foreground"
          />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {MENU_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  category === c ? "bg-accent text-accent-foreground" : "bg-primary-foreground/10"
                }`}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {specials.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-2xl font-bold">Today's Specials</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {specials.map((s) => (
                <div key={s.id} className="w-56 shrink-0 rounded-2xl border border-accent bg-card p-3 shadow-sm">
                  {s.image_url && (
                    <img src={s.image_url} alt={s.name} loading="lazy" className="h-28 w-full rounded-xl object-cover" />
                  )}
                  <p className="mt-2 font-semibold text-primary">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{rupees(Number(s.price))}</p>
                  <Button size="sm" className="mt-2 w-full" onClick={() => change(s, 1)}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {popular.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-2xl font-bold">Bestsellers &amp; Popular Dishes</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {popular.map((s) => (
                <div key={s.id} className="w-48 shrink-0 rounded-2xl border border-border bg-card p-3 shadow-sm">
                  <p className="font-semibold text-primary">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{rupees(Number(s.price))}</p>
                  <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => change(s, 1)}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-2xl font-bold">
            {category === "all" ? "Today's Menu" : CATEGORY_LABEL[category]}
          </h2>
          {isLoading && <p className="text-muted-foreground">Loading menu…</p>}
          {!isLoading && visible.length === 0 && (
            <p className="text-muted-foreground">No dishes match your search. Try another category.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => {
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
                      <span className="shrink-0 font-bold">{rupees(Number(item.price))}</span>
                    </div>
                    <p className="flex-1 text-sm text-muted-foreground">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                        {CATEGORY_LABEL[item.category] ?? item.category}
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
      </main>

      <PublicFooter />

      {/* Sticky cart bar */}
      {cartCount > 0 && !checkoutOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-primary px-4 py-3 text-primary-foreground shadow-2xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold">
                {cartCount} item{cartCount > 1 ? "s" : ""} · {rupees(totals.total)}
              </p>
              <p className="text-xs opacity-85">
                {totals.belowMinimum
                  ? `Add ${rupees(totals.amountToMinimum)} more to reach the minimum order`
                  : totals.amountToFreeDelivery > 0
                    ? `Add ${rupees(totals.amountToFreeDelivery)} more for free delivery`
                    : "Free delivery unlocked 🎉"}
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={!settings.is_open || totals.belowMinimum}
              onClick={() => setCheckoutOpen(true)}
            >
              {settings.is_open ? "Checkout" : "Closed"}
            </Button>
          </div>
        </div>
      )}

      {/* Checkout sheet */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-card p-5 sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Checkout</h2>
              <button onClick={() => setCheckoutOpen(false)} aria-label="Close checkout" className="text-xl">
                ✕
              </button>
            </div>

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

            <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt>Item total</dt>
                <dd>{rupees(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery fee</dt>
                <dd>{totals.deliveryFee === 0 ? "FREE" : rupees(totals.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Taxes ({settings.tax_percent}%)</dt>
                <dd>{rupees(totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
                <dt>To pay</dt>
                <dd>{rupees(totals.total)}</dd>
              </div>
            </dl>

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
                <Label htmlFor="c-campus">Campus / Hostel</Label>
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

              <p className="rounded-xl bg-muted p-3 text-xs">
                Payment is <strong>online only</strong> — UPI to <strong>{settings.upi_id}</strong> on the next step. No
                cash on delivery.
              </p>

              <div className="rounded-xl bg-muted p-3 text-xs">
                <p className="font-semibold">Live location {geo ? "captured ✓" : "required"}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {geo ? geo.label : "We verify every order with your GPS location to stop fake orders."}
                </p>
                <Button size="sm" variant="outline" className="mt-2" disabled={locating} onClick={shareLocation}>
                  {locating ? "Getting location…" : geo ? "Refresh location" : "Allow location access"}
                </Button>
              </div>

              {!sessionLoading && !canOrder ? (
                <div className="rounded-xl border border-border p-3 text-center text-sm">
                  <p className="text-muted-foreground">
                    {user && status === "pending"
                      ? "Your registration is pending Admin Approval. You will be able to log in and order once verified by Admin."
                      : "Please Sign In or Register to Place an Order"}
                  </p>
                  {!user && (
                    <Button asChild className="mt-2 w-full">
                      <Link to="/account">Sign in or register</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full"
                  disabled={placing || sessionLoading || !settings.is_open || totals.belowMinimum}
                  onClick={placeOrder}
                >
                  {placing ? "Creating order…" : `Pay ${rupees(totals.total)} online`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
