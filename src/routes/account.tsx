import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader, PublicFooter } from "@/components/brand";
import { customerSignup } from "@/lib/customers.functions";
import { requestGeolocation } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in or register — Trippy's Mehfill" },
      {
        name: "description",
        content:
          "Create a verified Trippy's Mehfill customer account or sign in to order Hyderabadi biryani to your hostel.",
      },
      { property: "og:title", content: "Sign in or register — Trippy's Mehfill" },
      { property: "og:description", content: "Verified customer accounts keep our kitchen free of fake orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

const PENDING_MSG =
  "Your registration is pending Admin Approval. You will be able to log in and order once verified by Admin.";

function AccountPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", password: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/my-orders", replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    if (error || !data.user) {
      setBusy(false);
      return toast.error("Wrong email or password");
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, active")
      .eq("id", data.user.id)
      .maybeSingle();
    setBusy(false);

    if (profile?.status === "pending") {
      await supabase.auth.signOut();
      return toast.warning(PENDING_MSG, { duration: 12000 });
    }
    if (profile?.status === "rejected" || profile?.active === false) {
      await supabase.auth.signOut();
      return toast.error("This account is not allowed to order. Please contact the kitchen.");
    }

    // Location permission is requested up-front so ordering is never blocked later.
    try {
      await requestGeolocation();
    } catch {
      toast.warning("Location access is required when you place an order.");
    }
    toast.success("Signed in — happy ordering!");
    navigate({ to: "/", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await customerSignup({ data: form });
      toast.success(PENDING_MSG, { duration: 12000 });
      setMode("signin");
      setForm({ ...form, password: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create your account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  mode === m ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {mode === "signin" ? (
            <form className="mt-5 space-y-3" onSubmit={signIn}>
              <h1 className="text-xl font-bold">Customer sign in</h1>
              <p className="text-sm text-muted-foreground">
                Only admin-verified accounts can place orders. This keeps fake orders out of our kitchen.
              </p>
              <div>
                <Label htmlFor="a-email">Email</Label>
                <Input
                  id="a-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="a-pass">Password</Label>
                <Input
                  id="a-pass"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          ) : (
            <form className="mt-5 space-y-3" onSubmit={signUp}>
              <h1 className="text-xl font-bold">Create your account</h1>
              <p className="text-sm text-muted-foreground">
                Registrations are verified by the owner before your first order.
              </p>
              <div>
                <Label htmlFor="r-name">Full name</Label>
                <Input
                  id="r-name"
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="r-phone">Phone number</Label>
                <Input
                  id="r-phone"
                  maxLength={20}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="r-addr">Hostel / address details</Label>
                <Textarea
                  id="r-addr"
                  maxLength={400}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="r-email">Email</Label>
                <Input
                  id="r-email"
                  type="email"
                  maxLength={120}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="r-pass">Password</Label>
                <Input
                  id="r-pass"
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </Button>
            </form>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
