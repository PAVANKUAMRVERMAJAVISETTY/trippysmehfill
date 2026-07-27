import logo from "@/assets/trippys-logo.png.asset.json";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "h-16" }: { className?: string }) {
  return <img src={logo.url} alt="Trippy's Mehfill — Hyderabad's Cloud Kitchen" className={className} />;
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-12 w-auto" />
          <span className="hidden text-sm tracking-widest uppercase opacity-80 sm:block">
            Hyderabad's Cloud Kitchen
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-foreground/10"
          >
            Menu
          </Link>
          <Link
            to="/track"
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-foreground/10"
          >
            Track order
          </Link>
          <Link
            to="/auth"
            className="rounded-full bg-accent px-3 py-1.5 font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Staff login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-primary py-8 text-center text-primary-foreground">
      <p className="px-4 text-sm italic">
        "At Trippy's Mehfill, every meal is served with love, creating unforgettable flavors and memories."
      </p>
      <p className="mt-3 text-lg font-semibold text-accent">8569955929</p>
      <p className="mt-1 text-xs opacity-80">
        Freshly Cooked • Quality Ingredients • Made With Love • Affordable Prices
      </p>
    </footer>
  );
}
