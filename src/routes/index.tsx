/**
 * Storefront (Index 1 / Index 2).
 *
 * Index 1 = guest or unapproved user: photos + descriptions only, prices and cart hidden.
 * Index 2 = approved customer: prices, cart drawer and checkout.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/database/supabaseClient";
import type { PaymentMethod } from "@/database/schemaDefinitions";
import { PublicHeader, PublicFooter } from "@/components/brand";
import { PromoBanner } from "@/components/promo-banner";
import { SwiggyHeroHeader } from "@/components/SwiggyHeroHeader";
import { CategoryList } from "@/components/CategoryList";
import { FoodItemCard } from "@/components/FoodItemCard";
import { LoginModal } from "@/components/LoginModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { rupees, useSession, type CartLine } from "@/lib/session";
import { requestGeolocation, lookupClientIp, type GeoFix } from "@/lib/geo";
import { COD_RADIUS_KM, distanceLabel, isWithinCodRadius } from "@/services/gpsService";
import { APPROVAL_WHATSAPP_LINK, PENDING_APPROVAL_MESSAGE } from "@/services/authRoleService";
import { priceOrder, prettyTime, useStoreSettings } from "@/lib/store";

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
        content: "Order authentic Hyderabadi dum biryani, khichdi and curries. Freshly cooked, delivered hot.",
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
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("all");
  const [loginOpen, setLoginOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("UPI");
  const [form, setForm] = useState({ name: "", phone: "", campus: "", address: "", preference: "", notes: "" });
  const [placing, setPlacing] = useState(false);
  const [geo, setGeo] = useState<GeoFix | null>(null);
  const [locating, setLocating] = useState(false);

  // Prices and cart are revealed only for an approved customer or a staff account.
  const canOrder = !!user && (status === "approved" || !!role);
  const isPending = !!user && status === "pending";

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || name, phone: f.phone || phone, address: f.address || address }));
  }, [user, name, phone, address]);

  /** [DATABASE QUERY] Public menu — available dishes, ordered for display. */
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

  /** [DSA / ALGORITHM] Linear filter over the menu: O(n) per keystroke, fine for a single kitchen. */
  const visible = menu.filter((m) => {
    const haystack = `${m.name} ${m.description ?? ""} ${m.category ?? ""}`.toLowerCase();
    const matchesCategory = category === "all" || haystack.includes(category) || m.category === category;
    const q = search.trim().toLowerCase();
    return matchesCategory && (!q || haystack.includes(q));
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

  /** Captures a live GPS fix — mandatory for cash on delivery. */
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

  // COD is blocked outside the delivery radius (anti-fraud rule).
  const codBlocked = payment === "COD" && (!geo || !isWithinCodRadius(geo));

  /** [REST API] place_order RPC — server recalculates every price, we only send intent. */
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
    // Cash on delivery only within the Haversine radius around the kitchen.
    if (payment === "COD" && !isWithinCodRadius(fix)) {
      setPlacing(false);
      return toast.error(`Cash on delivery is only available within ${COD_RADIUS_KM} km of the kitchen`);
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
      p_geo_address: fix.label || location,
      p_ip_address: ip ?? undefined,
      p_payment_method: payment,
    });
    setPlacing(false);
    if (error) return toast.error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    setCart({});
    setCheckoutOpen(false);

    if (payment === "COD") {
      toast.success(`Order #${row?.order_no} placed — pay cash on delivery`);
      navigate({ to: "/my-orders" });
    } else {
      toast.success(`Order #${row?.order_no} created — complete the payment`);
      navigate({ to: "/pay/$orderId", params: { orderId: String(row?.id) } });
    }
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

      <SwiggyHeroHeader
        location={location}
        onLocationChange={setLocation}
        search={search}
        onSearchChange={setSearch}
        etaMinutes={settings.eta_minutes}
      />

      <CategoryList active={category} onSelect={setCategory} />

      {/* Index 1 gate banner */}
      {!sessionLoading && !canOrder && (
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <p className="text-base font-semibold">
              {isPending ? PENDING_APPROVAL_MESSAGE : "Sign in or Register to view prices and place an order."}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {isPending ? (
                <Button asChild>
                  <a href={APPROVAL_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                    Contact admin on WhatsApp
                  </a>
                </Button>
              ) : (
                <Button onClick={() => setLoginOpen(true)}>Sign In</Button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8">
        {specials.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-2xl font-bold">Today's Specials</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {specials.map((s) => (
                <div key={s.id} className="w-56 shrink-0 rounded-2xl border border-border bg-card p-3 shadow-sm">
                  {s.image_url && (
                    <img src={s.image_url} alt={s.name} loading="lazy" className="h-28 w-full rounded-xl object-cover" />
                  )}
                  <p className="mt-2 font-semibold">{s.name}</p>
                  {/* Offers stay unpriced until the account is approved */}
                  {canOrder ? (
                    <>
                      <p className="text-sm text-primary">{rupees(Number(s.price))}</p>
                      <Button size="sm" className="mt-2 w-full" onClick={() => change(s, 1)}>
                        Add
                      </Button>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Sign in to view the offer price</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-2xl font-bold">Today's Menu</h2>
          {isLoading && <p className="text-muted-foreground">Loading menu…</p>}
          {!isLoading && visible.length === 0 && (
            <p className="text-muted-foreground">No dishes match your search. Try another category.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <FoodItemCard
                key={item.id}
                item={item}
                showPrices={canOrder}
                qty={cart[item.id]?.qty ?? 0}
                onAdd={() => change(item, 1)}
                onRemove={() => change(item, -1)}
              />
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* Sticky cart bar (Index 2 only) */}
      {canOrder && cartCount > 0 && !checkoutOpen && (
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

      {/* Checkout drawer */}
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

            {/* Payment method toggle */}
            <div className="mt-4">
              <Label>Payment method</Label>
              <div className="mt-1 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                {(["UPI", "COD"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayment(m)}
                    aria-pressed={payment === m}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                      payment === m ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {m === "UPI" ? "Pay Online" : "Cash on Delivery"}
                  </button>
                ))}
              </div>
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

              <div className="rounded-xl bg-muted p-3 text-xs">
                <p className="font-semibold">
                  Live location {geo ? "captured ✓" : payment === "COD" ? "required for COD" : "required"}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {geo
                    ? `${geo.label} · ${distanceLabel(geo)}`
                    : `We verify every order with your GPS location. Cash on delivery works within ${COD_RADIUS_KM} km of the kitchen.`}
                </p>
                {codBlocked && geo && (
                  <p className="mt-1 font-semibold text-destructive">
                    You are outside the {COD_RADIUS_KM} km cash-on-delivery zone — please pay online.
                  </p>
                )}
                <Button size="sm" variant="outline" className="mt-2" disabled={locating} onClick={shareLocation}>
                  {locating ? "Getting location…" : geo ? "Refresh location" : "Allow location access"}
                </Button>
              </div>

              {payment === "UPI" && (
                <p className="rounded-xl bg-muted p-3 text-xs">
                  You'll pay by UPI to <strong>{settings.upi_id}</strong> on the next step.
                </p>
              )}

              <Button
                className="w-full"
                disabled={placing || sessionLoading || !settings.is_open || totals.belowMinimum || codBlocked}
                onClick={placeOrder}
              >
                {placing
                  ? "Placing order…"
                  : payment === "COD"
                    ? `Place Order · Cash ${rupees(totals.total)}`
                    : `Pay ${rupees(totals.total)} online`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
