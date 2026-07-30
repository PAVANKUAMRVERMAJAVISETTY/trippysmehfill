/**
 * LoginModal — one centered popup that handles every role.
 *
 * 🎯 INTERVIEW QUESTION: "Where should post-login routing live?"
 *    Answer: not in the form. The form only authenticates; a pure service
 *    (`authRoleService`) decides the destination, so the rule is testable and reusable.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/database/supabaseClient";
import {
  resolveAccount,
  landingRouteFor,
  APPROVAL_WHATSAPP_LINK,
  PENDING_APPROVAL_MESSAGE,
} from "@/services/authRoleService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { customerSignup } from "@/lib/customers.functions";

type Props = { open: boolean; onClose: () => void };

export function LoginModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false); // shows the WhatsApp approval screen
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", password: "" });

  if (!open) return null;

  /** Staff usernames are mapped to an internal email; customers sign in with a real email. */
  function loginEmail(value: string) {
    const v = value.trim().toLowerCase();
    return v.includes("@") ? v : `${v}@trippysmehfill.app`;
  }

  /** [REST API] Supabase Auth sign-in, then role-based routing. */
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail(form.email),
      password: form.password,
    });
    if (error || !data.user) {
      setBusy(false);
      return toast.error("Wrong email/username or password");
    }

    const account = await resolveAccount(data.user.id);
    setBusy(false);

    // Customers must be approved by the admin before they can see prices or order.
    if (account.role === "customer" && !account.isApproved) {
      await supabase.auth.signOut();
      setPending(true);
      return;
    }

    const to = landingRouteFor(account);
    toast.success(`Welcome back${account.name ? `, ${account.name}` : ""}!`);
    onClose();
    if (to) navigate({ to, replace: true });
  }

  /** [REST API] Creates a `pending` customer that the admin reviews in /registrations. */
  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await customerSignup({ data: form });
      setPending(true); // immediate post-registration approval modal
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create your account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-auto rounded-3xl bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold">
            {pending ? "Almost there!" : mode === "signin" ? "Sign in" : "Create your account"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close sign in" className="text-xl">
            ✕
          </button>
        </div>

        {pending ? (
          <div className="mt-4 space-y-4 text-sm">
            <p className="rounded-xl bg-muted p-3">{PENDING_APPROVAL_MESSAGE}</p>
            <Button asChild className="w-full">
              <a href={APPROVAL_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                Contact admin on WhatsApp
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPending(false);
                setMode("signin");
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist">
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
                  {m === "signin" ? "Sign in" : "Register"}
                </button>
              ))}
            </div>

            {mode === "signin" ? (
              <form className="mt-4 space-y-3" onSubmit={signIn}>
                <div>
                  <Label htmlFor="l-email">Email or staff username</Label>
                  <Input
                    id="l-email"
                    autoComplete="username"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="l-pass">Password</Label>
                  <Input
                    id="l-pass"
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
              <form className="mt-4 space-y-3" onSubmit={signUp}>
                <div>
                  <Label htmlFor="l-name">Full name</Label>
                  <Input
                    id="l-name"
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="l-phone">Phone number</Label>
                  <Input
                    id="l-phone"
                    maxLength={20}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="l-addr">Hostel / address details</Label>
                  <Textarea
                    id="l-addr"
                    maxLength={400}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="l-remail">Email</Label>
                  <Input
                    id="l-remail"
                    type="email"
                    maxLength={120}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="l-rpass">Password</Label>
                  <Input
                    id="l-rpass"
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
          </>
        )}
      </div>
    </div>
  );
}
