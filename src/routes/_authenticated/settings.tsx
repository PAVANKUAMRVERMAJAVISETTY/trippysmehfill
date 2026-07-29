import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { role } = useSession();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [banner, setBanner] = useState({ title: "", image_url: "", link_url: "" });

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data ?? DEFAULT_SETTINGS) as unknown as StoreSettings;
    },
  });

  const { data: banners = [] } = useQuery({
    queryKey: ["all-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  if (role !== "admin") {
    return <p className="text-muted-foreground">Only the owner can change system settings.</p>;
  }

  async function save() {
    const { error } = await supabase
      .from("store_settings")
      .update({
        is_open: draft.is_open,
        open_time: draft.open_time,
        close_time: draft.close_time,
        min_order_value: draft.min_order_value,
        free_delivery_threshold: draft.free_delivery_threshold,
        delivery_charge: draft.delivery_charge,
        tax_percent: draft.tax_percent,
        upi_id: draft.upi_id,
        whatsapp_number: draft.whatsapp_number,
        eta_minutes: draft.eta_minutes,
        closed_message: draft.closed_message,
      })
      .eq("id", true);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["store-settings"] });
  }

  async function toggleOpen(open: boolean) {
    setDraft((d) => ({ ...d, is_open: open }));
    const { error } = await supabase.from("store_settings").update({ is_open: open }).eq("id", true);
    if (error) return toast.error(error.message);
    toast.success(open ? "Restaurant is now OPEN" : "Restaurant is now CLOSED");
    qc.invalidateQueries({ queryKey: ["store-settings"] });
  }

  async function addBanner(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("banners").insert({
      title: banner.title,
      image_url: banner.image_url || null,
      link_url: banner.link_url || null,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    setBanner({ title: "", image_url: "", link_url: "" });
    toast.success("Banner published");
    qc.invalidateQueries({ queryKey: ["all-banners"] });
    qc.invalidateQueries({ queryKey: ["active-banner"] });
  }

  async function toggleBanner(id: string, active: boolean) {
    await supabase.from("banners").update({ is_active: active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-banners"] });
    qc.invalidateQueries({ queryKey: ["active-banner"] });
  }

  async function removeBanner(id: string) {
    await supabase.from("banners").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-banners"] });
    qc.invalidateQueries({ queryKey: ["active-banner"] });
  }

  const field = (key: keyof StoreSettings, label: string, type: "text" | "number" | "time" = "text") => (
    <div>
      <Label htmlFor={String(key)}>{label}</Label>
      <Input
        id={String(key)}
        type={type}
        value={String(draft[key] ?? "")}
        onChange={(e) =>
          setDraft({ ...draft, [key]: type === "number" ? Number(e.target.value) : e.target.value } as StoreSettings)
        }
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">System settings</h1>

        <div
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
            draft.is_open ? "border-border bg-card" : "border-destructive bg-destructive/10"
          }`}
        >
          <div>
            <p className="font-semibold">Restaurant status</p>
            <p className="text-sm text-muted-foreground">
              {draft.is_open ? "Open — customers can place orders." : "Closed — ordering is disabled platform-wide."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant={draft.is_open ? "default" : "outline"} onClick={() => toggleOpen(true)}>
              ON · Open
            </Button>
            <Button variant={draft.is_open ? "outline" : "destructive"} onClick={() => toggleOpen(false)}>
              OFF · Closed
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          {field("open_time", "Opening time", "time")}
          {field("close_time", "Closing time", "time")}
          {field("min_order_value", "Minimum order value (₹)", "number")}
          {field("free_delivery_threshold", "Free delivery above (₹)", "number")}
          {field("delivery_charge", "Delivery charge (₹)", "number")}
          {field("tax_percent", "Tax (%)", "number")}
          {field("eta_minutes", "Estimated delivery (minutes)", "number")}
          {field("upi_id", "Restaurant UPI ID")}
          {field("whatsapp_number", "WhatsApp number")}
          {field("closed_message", "Closed banner message")}
          <div className="sm:col-span-2">
            <Button className="w-full" onClick={save}>
              Save settings
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Promotional banners</h2>
        <p className="text-sm text-muted-foreground">Active banners pop up once per day for each customer.</p>

        <form onSubmit={addBanner} className="mt-3 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="b-title">Title</Label>
            <Input id="b-title" value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="b-img">Poster / GIF URL</Label>
            <Input id="b-img" value={banner.image_url} onChange={(e) => setBanner({ ...banner, image_url: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="b-link">Link (optional)</Label>
            <Input id="b-link" value={banner.link_url} onChange={(e) => setBanner({ ...banner, link_url: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <Button className="w-full">Publish banner</Button>
          </div>
        </form>

        <div className="mt-3 space-y-2">
          {banners.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                {b.image_url && <img src={b.image_url} alt={b.title} className="h-12 w-20 rounded object-cover" />}
                <span className="text-sm font-medium">{b.title || "Untitled"}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleBanner(b.id, !b.is_active)}>
                  {b.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => removeBanner(b.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {banners.length === 0 && <p className="text-sm text-muted-foreground">No banners yet.</p>}
        </div>
      </section>
    </div>
  );
}
