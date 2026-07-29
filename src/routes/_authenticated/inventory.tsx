import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", unit: "kg", quantity: 0, low_threshold: 5 });
  const [recipe, setRecipe] = useState({ menu_item_id: "", inventory_item_id: "", qty_per_serving: 0 });

  const { data: items = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_items").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: menu = [] } = useQuery({
    queryKey: ["menu-for-recipes"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_ingredients")
        .select("id, qty_per_serving, menu_items(name), inventory_items(name, unit)");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("inventory_items").insert(form);
    if (error) return toast.error(error.message);
    setForm({ name: "", unit: "kg", quantity: 0, low_threshold: 5 });
    toast.success("Stock item added");
    qc.invalidateQueries({ queryKey: ["inventory"] });
  }

  async function updateQty(id: string, quantity: number) {
    const { error } = await supabase.from("inventory_items").update({ quantity }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["inventory"] });
  }

  async function addRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!recipe.menu_item_id || !recipe.inventory_item_id) return toast.error("Pick a dish and an ingredient");
    const { error } = await supabase.from("menu_ingredients").upsert(recipe, { onConflict: "menu_item_id,inventory_item_id" });
    if (error) return toast.error(error.message);
    setRecipe({ menu_item_id: "", inventory_item_id: "", qty_per_serving: 0 });
    toast.success("Recipe saved — stock now auto-deducts on delivery");
    qc.invalidateQueries({ queryKey: ["recipes"] });
  }

  async function removeRecipe(id: string) {
    await supabase.from("menu_ingredients").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["recipes"] });
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Inventory &amp; stock</h1>
        <p className="text-sm text-muted-foreground">
          Ingredients are deducted automatically whenever an order is marked delivered.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => {
            const low = Number(i.quantity) <= Number(i.low_threshold);
            return (
              <div
                key={i.id}
                className={`rounded-2xl border bg-card p-4 shadow-sm ${low ? "border-destructive" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <strong>{i.name}</strong>
                  {low && <span className="rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">Low</span>}
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {Number(i.quantity)} <span className="text-sm font-normal text-muted-foreground">{i.unit}</span>
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateQty(i.id, Number(i.quantity) + 10)}>
                    +10
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateQty(i.id, Math.max(Number(i.quantity) - 10, 0))}>
                    −10
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={addItem} className="mt-5 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="i-name">Item</Label>
            <Input id="i-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="i-unit">Unit</Label>
            <Input id="i-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="i-qty">Quantity</Label>
            <Input id="i-qty" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="i-low">Low alert at</Label>
            <Input id="i-low" type="number" value={form.low_threshold} onChange={(e) => setForm({ ...form, low_threshold: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-4">
            <Button className="w-full">Add stock item</Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-bold">Recipes (auto-deduction rules)</h2>
        <form onSubmit={addRecipe} className="mt-3 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="r-dish">Dish</Label>
            <select
              id="r-dish"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={recipe.menu_item_id}
              onChange={(e) => setRecipe({ ...recipe, menu_item_id: e.target.value })}
            >
              <option value="">Select dish…</option>
              {menu.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="r-ing">Ingredient</Label>
            <select
              id="r-ing"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={recipe.inventory_item_id}
              onChange={(e) => setRecipe({ ...recipe, inventory_item_id: e.target.value })}
            >
              <option value="">Select ingredient…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="r-qty">Qty per serving</Label>
            <Input
              id="r-qty"
              type="number"
              step="0.01"
              value={recipe.qty_per_serving}
              onChange={(e) => setRecipe({ ...recipe, qty_per_serving: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full">Save recipe</Button>
          </div>
        </form>

        <div className="mt-3 space-y-2">
          {recipes.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
              <span>
                {r.menu_items?.name} → {Number(r.qty_per_serving)} {r.inventory_items?.unit} {r.inventory_items?.name}
              </span>
              <Button size="sm" variant="destructive" onClick={() => removeRecipe(r.id)}>
                Remove
              </Button>
            </div>
          ))}
          {recipes.length === 0 && <p className="text-sm text-muted-foreground">No recipes configured yet.</p>}
        </div>
      </section>
    </div>
  );
}
