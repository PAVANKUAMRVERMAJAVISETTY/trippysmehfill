/**
 * FoodItemCard — one dish tile.
 *
 * The `showPrices` prop implements the "Index 1 vs Index 2" gate:
 * guests and unapproved users see the photo and description only, while approved
 * customers see the price and the add-to-cart stepper.
 */
import { Button } from "@/components/ui/button";
import { rupees } from "@/lib/session";

type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  is_special: boolean;
};

type Props = {
  item: Item;
  showPrices: boolean; // false = gated guest view (Index 1)
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
};

export function FoodItemCard({ item, showPrices, qty, onAdd, onRemove }: Props) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} loading="lazy" className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-muted text-4xl" aria-hidden>
          🍛
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{item.name}</h3>
          {/* Prices are the gated part of the card */}
          {showPrices && <span className="shrink-0 font-bold text-primary">{rupees(Number(item.price))}</span>}
        </div>
        <p className="flex-1 text-sm text-muted-foreground">{item.description}</p>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {item.category}
            {item.is_special ? " · Special" : ""}
          </span>
          {showPrices ? (
            qty === 0 ? (
              <Button size="sm" onClick={onAdd}>
                Add
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={onRemove} aria-label={`Remove one ${item.name}`}>
                  −
                </Button>
                <span className="w-6 text-center font-semibold">{qty}</span>
                <Button size="sm" onClick={onAdd} aria-label={`Add one ${item.name}`}>
                  +
                </Button>
              </div>
            )
          ) : (
            <span className="text-xs font-semibold text-primary">Sign in to view price</span>
          )}
        </div>
      </div>
    </article>
  );
}
