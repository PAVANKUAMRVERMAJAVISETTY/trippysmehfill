import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand";
import { bootstrapAdmin } from "@/lib/accounts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Team login — Trippy's Mehfill" },
      { name: "description", content: "Admin, staff and delivery partner login for the Trippy's Mehfill kitchen system." },
      { property: "og:title", content: "Team login — Trippy's Mehfill" },
      { property: "og:description", content: "Sign in to manage orders, menu and deliveries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Portal = "admin" | "staff" | "driver";

const PORTALS: { key: Portal; label: string; idLabel: string; hint: string }[] = [
  { key: "admin", label: "Admin", idLabel: "Owner ID", hint: "Full access — orders, menu, team and settings." },
  { key: "staff", label: "Staff", idLabel: "Username", hint: "Orders, menu and feedback. No team or settings access." },
  { key: "driver", label: "Delivery", idLabel: "User ID", hint: "Your assigned deliveries and collections." },
];

function AuthPage() {
  const navigate = useNavigate();
  const [portal, setPortal] = useState<Portal>("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.rpc("has_any_admin").then(({ data }) => setNeedsSetup(data === false));
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void routeByRole(data.session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function routeByRole(userId: string, expected?: Portal) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (data ?? []).map((r) => r.role);
    if (expected && !roles.includes(expected)) {
      await supabase.auth.signOut();
      toast.error(`This account is not a ${expected === "driver" ? "delivery partner" : expected} account.`);
      return;
    }
    if (roles.includes("driver") && !roles.includes("admin") && !roles.includes("staff")) {
      navigate({ to: "/delivery", replace: true });
    } else if (roles.length > 0) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.error("This account has no role assigned yet. Ask the owner to set it up.");
      await supabase.auth.signOut();
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${username.trim().toLowerCase()}@trippysmehfill.app`,
      password,
    });
    setBusy(false);
    if (error || !data.user) return toast.error("Wrong username or password");
    const { data: profile } = await supabase.from("profiles").select("active").eq("id", data.user.id).maybeSingle();
    if (profile && profile.active === false) {
      await supabase.auth.signOut();
      return toast.error("This account has been deactivated");
    }
    await routeByRole(data.user.id, portal);
  }


  async function setupOwner(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await bootstrapAdmin({ data: { username: username.trim().toLowerCase(), password, name } });
      toast.success("Owner account created — signing you in");
      setNeedsSetup(false);
      const { data } = await supabase.auth.signInWithPassword({
        email: `${username.trim().toLowerCase()}@trippysmehfill.app`,
        password,
      });
      if (data.user) await routeByRole(data.user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
        <Logo className="mx-auto h-24 w-auto" />
        {needsSetup ? (
          <form className="mt-4 space-y-3" onSubmit={setupOwner}>
            <h1 className="text-center text-lg font-bold">First-time setup — create the owner account</h1>
            <div>
              <Label htmlFor="s-name">Owner name</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="s-user">Owner ID</Label>
              <Input id="s-user" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
            </div>
            <div>
              <Label htmlFor="s-pass">Password</Label>
              <Input id="s-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create owner account"}
            </Button>
          </form>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={signIn}>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="tablist">
              {PORTALS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={portal === p.key}
                  onClick={() => setPortal(p.key)}
                  className={`rounded-full px-2 py-1.5 text-sm transition-colors ${
                    portal === p.key ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <h1 className="text-center text-lg font-bold">
              {PORTALS.find((p) => p.key === portal)!.label} sign in
            </h1>
            <p className="text-center text-xs text-muted-foreground">
              {PORTALS.find((p) => p.key === portal)!.hint}
            </p>
            <div>
              <Label htmlFor="u">{PORTALS.find((p) => p.key === portal)!.idLabel}</Label>
              <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
            </div>
            <div>
              <Label htmlFor="p">Password</Label>
              <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

        )}
        <a href="/" className="mt-4 block text-center text-sm text-muted-foreground underline">
          Back to menu
        </a>
      </div>
    </div>
  );
}
