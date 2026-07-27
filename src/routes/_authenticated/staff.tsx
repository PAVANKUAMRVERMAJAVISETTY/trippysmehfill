import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/lib/session";
import { createAccount, updateAccount, resetAccountPassword, deleteAccount } from "@/lib/accounts.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
});

type Person = {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  active: boolean;
  role: "admin" | "staff" | "driver";
};

function StaffPage() {
  const { role } = useSession();
  const qc = useQueryClient();
  const create = useServerFn(createAccount);
  const update = useServerFn(updateAccount);
  const reset = useServerFn(resetAccountPassword);
  const remove = useServerFn(deleteAccount);

  const [form, setForm] = useState({ name: "", username: "", password: "", phone: "", role: "staff" as Person["role"] });
  const [busy, setBusy] = useState(false);

  const { data: people = [] } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, name, username, phone, active"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "staff",
      })) as Person[];
    },
  });

  if (role !== "admin") {
    return <p className="text-muted-foreground">Only the owner can manage team accounts.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { ...form, username: form.username.trim().toLowerCase() } });
      toast.success(`${form.role === "driver" ? "Delivery partner" : "Staff member"} created`);
      setForm({ name: "", username: "", password: "", phone: "", role: form.role });
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const group = (r: Person["role"]) => people.filter((p) => p.role === r);

  const Card = ({ p }: { p: Person }) => (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{p.name}</h3>
          <p className="text-sm text-muted-foreground">@{p.username}</p>
          {p.phone && <p className="text-sm text-muted-foreground">{p.phone}</p>}
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase text-secondary-foreground">
          {p.role}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span>Active</span>
        <Switch
          checked={p.active}
          onCheckedChange={(v) =>
            run(() => update({ data: { id: p.id, name: p.name, phone: p.phone ?? "", active: v } }), "Account updated")
          }
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const name = prompt("New display name", p.name);
            if (name === null) return;
            const phone = prompt("Phone number", p.phone ?? "") ?? "";
            run(() => update({ data: { id: p.id, name, phone, active: p.active } }), "Account updated");
          }}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const password = prompt(`New password for @${p.username} (min 6 characters)`);
            if (!password) return;
            run(() => reset({ data: { id: p.id, password } }), "Password reset");
          }}
        >
          Reset password
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (!confirm(`Delete @${p.username}? This cannot be undone.`)) return;
            run(() => remove({ data: { id: p.id } }), "Account deleted");
          }}
        >
          Delete
        </Button>
      </div>
    </article>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Team</h1>
      <p className="text-sm text-muted-foreground">Create staff and delivery partner logins.</p>

      <form onSubmit={submit} className="mt-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="s-name">Full name</Label>
          <Input id="s-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="s-user">Username / User ID</Label>
          <Input id="s-user" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="s-pass">Password</Label>
          <Input id="s-pass" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="s-phone">Phone (optional)</Label>
          <Input id="s-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="s-role">Role</Label>
          <select
            id="s-role"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Person["role"] })}
          >
            <option value="staff">Staff</option>
            <option value="driver">Delivery partner</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </div>
      </form>

      {(["admin", "staff", "driver"] as const).map((r) => (
        <section key={r} className="mt-8">
          <h2 className="text-xl font-bold capitalize">{r === "driver" ? "Delivery partners" : `${r}s`}</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group(r).map((p) => (
              <Card key={p.id} p={p} />
            ))}
            {group(r).length === 0 && <p className="text-muted-foreground">None yet.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
