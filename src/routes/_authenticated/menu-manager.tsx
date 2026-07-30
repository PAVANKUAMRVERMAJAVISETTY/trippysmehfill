import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { rupees } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/menu-manager")({
  component: MenuManagerPage,
});

type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  is_available: boolean;
  is_special: boolean;
  sort_order: number;
};

const EMPTY: Omit<Item, "id"> = {
  name: "",
  description: "",
  price: 0,
  image_url: "",
  category: "nonveg",
  is_available: true,
  is_special: false,
  sort_order: 0,
};

function MenuManagerPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Omit<Item, "id"> & { id?: string }>({ ...EMPTY });
  const [open, setOpen] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null); // dish currently uploading a photo

  /** Sends the picked camera/gallery photo to storage and refreshes the list. */
  async function handleUpload(itemId: string, file: File) {
    setUploadingId(itemId);
    try {
      await uploadMenuImage(itemId, file);
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["menu-manager"] });
      qc.invalidateQueries({ queryKey: ["public-menu"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  }

  const { data: items = [] } = useQuery({
    queryKey: ["menu-manager"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("sort_order");
      if (error) throw error;
      return data as unknown as Item[];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: draft.name.trim(),
      description: draft.description,
      price: Number(draft.price),
      image_url: draft.image_url || null,
      category: draft.category,
      is_available: draft.is_available,
      is_special: draft.is_special,
      sort_order: Number(draft.sort_order),
    };
    const { error } = draft.id
      ? await supabase.from("menu_items").update(payload).eq("id", draft.id)
      : await supabase.from("menu_items").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(draft.id ? "Dish updated" : "Dish added");
    setOpen(false);
    setDraft({ ...EMPTY });
    qc.invalidateQueries({ queryKey: ["menu-manager"] });
  }

  async function toggle(item: Item, field: "is_available" | "is_special", value: boolean) {
    const patch = field === "is_available" ? { is_available: value } : { is_special: value };
    const { error } = await supabase.from("menu_items").update(patch).eq("id", item.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["menu-manager"] });
  }


  async function remove(item: Item) {
    if (!confirm(`Delete "${item.name}" from the menu?`)) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Dish deleted");
    qc.invalidateQueries({ queryKey: ["menu-manager"] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Menu</h1>
          <p className="text-sm text-muted-foreground">Enabled dishes show up on the customer page instantly.</p>
        </div>
        <Button
          onClick={() => {
            setDraft({ ...EMPTY, sort_order: items.length + 1 });
            setOpen(true);
          }}
        >
          Add dish
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            {/* Photo with a camera overlay: tapping it opens the device gallery/camera. */}
            <div className="relative mb-3">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-32 w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-xl bg-muted text-3xl" aria-hidden>
                  🍛
                </div>
              )}
              <label
                className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow"
                title="Upload a photo"
              >
                {uploadingId === item.id ? "…" : "📷"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleUpload(item.id, file);
                  }}
                />
              </label>
            </div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-primary">{item.name}</h2>
              <span className="font-bold">{rupees(Number(item.price))}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            <p className="mt-1 text-xs uppercase text-muted-foreground">{item.category === "veg" ? "Veg" : "Non-veg"}</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Available</span>
                <Switch checked={item.is_available} onCheckedChange={(v) => toggle(item, "is_available", v)} />
              </div>
              <div className="flex items-center justify-between">
                <span>Today's special</span>
                <Switch checked={item.is_special} onCheckedChange={(v) => toggle(item, "is_special", v)} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDraft({ ...item, description: item.description ?? "", image_url: item.image_url ?? "" });
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => remove(item)}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-card p-5">
            <h2 className="text-lg font-bold">{draft.id ? "Edit dish" : "Add dish"}</h2>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="m-name">Name</Label>
                <Input id="m-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="m-desc">Description</Label>
                <Textarea id="m-desc" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="m-price">Price (₹)</Label>
                <Input id="m-price" type="number" min={0} value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="m-img">Image URL</Label>
                <Input id="m-img" value={draft.image_url ?? ""} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="m-cat">Category</Label>
                <select
                  id="m-cat"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  <option value="veg">Veg</option>
                  <option value="nonveg">Non-veg</option>
                </select>
              </div>
              <div>
                <Label htmlFor="m-sort">Display order</Label>
                <Input id="m-sort" type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="m-avail">Available</Label>
                <Switch id="m-avail" checked={draft.is_available} onCheckedChange={(v) => setDraft({ ...draft, is_available: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="m-spec">Today's special</Label>
                <Switch id="m-spec" checked={draft.is_special} onCheckedChange={(v) => setDraft({ ...draft, is_special: v })} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1">Save</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
