import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setRegistrationStatus } from "@/lib/customers.functions";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/registrations")({
  component: RegistrationsPage,
});

function RegistrationsPage() {
  const { role, loading } = useSession();
  const qc = useQueryClient();

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["pending-registrations"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, username, phone, address, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function decide(id: string, status: "approved" | "rejected") {
    try {
      await setRegistrationStatus({ data: { id, status } });
      toast.success(status === "approved" ? "Customer approved" : "Registration rejected");
      qc.invalidateQueries({ queryKey: ["pending-registrations"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update registration");
    }
  }

  if (!loading && role !== "admin") {
    return <p className="text-muted-foreground">Only the owner can review customer registrations.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Pending registrations</h1>
      <p className="text-sm text-muted-foreground">
        Approve real customers before they can sign in and order. This blocks fake orders.
      </p>

      {isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
      {!isLoading && pending.length === 0 && (
        <p className="mt-6 text-muted-foreground">No registrations waiting for approval.</p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pending.map((p) => (
          <article key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <strong>{p.name}</strong>
            <p className="text-sm text-muted-foreground">{p.email ?? p.username}</p>
            <p className="text-sm">{p.phone}</p>
            <p className="text-sm text-muted-foreground">{p.address}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registered {new Date(p.created_at).toLocaleString("en-IN")}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => decide(p.id, "approved")}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => decide(p.id, "rejected")}>
                Reject
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
