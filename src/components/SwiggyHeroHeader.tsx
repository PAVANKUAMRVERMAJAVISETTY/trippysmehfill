/**
 * SwiggyHeroHeader — the orange hero with the dual-input search bar
 * (location on the left, food search on the right), Swiggy-style.
 */
import { useState } from "react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requestGeolocation } from "@/lib/geo";
import { toast } from "sonner";

type Props = {
  location: string; // current delivery location text
  onLocationChange: (value: string) => void;
  search: string; // food search query
  onSearchChange: (value: string) => void;
  etaMinutes: number;
};

export function SwiggyHeroHeader({ location, onLocationChange, search, onSearchChange, etaMinutes }: Props) {
  const [locating, setLocating] = useState(false); // spinner state for the GPS button

  /** Fills the location input from the device GPS (browser Geolocation API). */
  async function useCurrentLocation() {
    setLocating(true);
    try {
      const fix = await requestGeolocation();
      onLocationChange(fix.label);
      toast.success("Location detected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not detect your location");
    } finally {
      setLocating(false);
    }
  }

  return (
    <section className="bg-primary px-4 pb-10 pt-8 text-primary-foreground">
      <div className="mx-auto max-w-4xl text-center">
        <Logo className="mx-auto h-24 w-auto" />
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Order food you love. Discover Hyderabad's best biryani.
        </h1>
        <p className="mt-2 text-sm opacity-90">Freshly cooked • Delivered hot in about {etaMinutes} minutes</p>

        {/* Dual-input search bar: location | food */}
        <div className="mx-auto mt-6 flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-card px-3 py-2 text-left text-foreground shadow-sm">
            <span aria-hidden className="text-primary">
              📍
            </span>
            <input
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="Enter your hostel or area"
              aria-label="Delivery location"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="shrink-0 whitespace-nowrap text-xs font-semibold text-primary underline"
            >
              {locating ? "Locating…" : "Use my current location"}
            </button>
          </div>

          <div className="flex flex-[1.4] items-center gap-2 rounded-xl bg-card px-3 py-2 text-left text-foreground shadow-sm">
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search biryani, curries..."
              aria-label="Search dishes"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <span aria-hidden className="text-muted-foreground">
              🔍
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Small reusable pill used for hero badges. */
export function HeroBadge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">{children}</span>;
}

export { Button };
