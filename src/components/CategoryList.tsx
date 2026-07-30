/**
 * CategoryList — horizontal scrollable row of circular category icons,
 * shown directly under the hero search bar (Swiggy pattern).
 */

export type Category = { key: string; label: string; icon: string };

// Static catalogue — cheap to render, no network call needed.
export const CATEGORIES: Category[] = [
  { key: "all", label: "All", icon: "🍽️" },
  { key: "biryani", label: "Biryani", icon: "🍛" },
  { key: "pizza", label: "Pizza", icon: "🍕" },
  { key: "desserts", label: "Desserts", icon: "🍰" },
  { key: "southindian", label: "South Indian", icon: "🥘" },
  { key: "burgers", label: "Burgers", icon: "🍔" },
  { key: "veg", label: "Veg", icon: "🥗" },
  { key: "nonveg", label: "Non-Veg", icon: "🍗" },
];

type Props = {
  active: string;
  onSelect: (key: string) => void;
};

export function CategoryList({ active, onSelect }: Props) {
  return (
    <nav aria-label="Food categories" className="mx-auto max-w-6xl px-4 py-5">
      <ul className="flex gap-5 overflow-x-auto pb-2">
        {CATEGORIES.map((c) => (
          <li key={c.key}>
            <button
              type="button"
              onClick={() => onSelect(c.key)}
              aria-pressed={active === c.key}
              className="flex w-20 flex-col items-center gap-2"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-2xl transition-colors ${
                  active === c.key ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                {c.icon}
              </span>
              <span
                className={`text-center text-xs font-semibold ${
                  active === c.key ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {c.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
