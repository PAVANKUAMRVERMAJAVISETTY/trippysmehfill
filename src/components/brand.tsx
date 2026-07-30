import logo from "@/assets/trippys-logo.png.asset.json";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { LoginModal } from "@/components/LoginModal";

export function Logo({ className = "h-16" }: { className?: string }) {
  return <img src={logo.url} alt="Trippy's Mehfill — Hyderabad's Cloud Kitchen" className={className} />;
}

/**
 * PublicHeader — deliberately minimal navigation: the only auth affordance is a single
 * "Sign In" button that opens the centered login modal (no Register/Staff/Partner links).
 */
export function PublicHeader() {
  const { user, name, role } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loginOpen, setLoginOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-12 w-auto" />
          <span className="hidden text-sm uppercase tracking-widest opacity-80 sm:block">
            Hyderabad's Cloud Kitchen
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/" className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-foreground/10">
            Menu
          </Link>
          <Link to="/track" className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-foreground/10">
            Track order
          </Link>
          {user ? (
            <>
              <Link
                to="/my-orders"
                className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-foreground/10"
              >
                Order History
              </Link>
              {role && (
                <Link
                  to="/dashboard"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-foreground/10"
                >
                  Dashboard
                </Link>
              )}
              <span className="hidden px-2 text-xs opacity-80 sm:inline">{name}</span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full bg-card px-3 py-1.5 font-semibold text-primary transition-opacity hover:opacity-90"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded-full bg-card px-4 py-1.5 font-semibold text-primary transition-opacity hover:opacity-90"
            >
              Sign In
            </button>
          )}
        </nav>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-primary py-8 text-center text-primary-foreground">
      <p className="px-4 text-sm italic">
        "At Trippy's Mehfill, every meal is served with love, creating unforgettable flavors and memories."
      </p>
      <p className="mt-3 text-lg font-semibold">8569955929</p>
      <p className="mt-1 text-xs opacity-80">
        Freshly Cooked • Quality Ingredients • Made With Love • Affordable Prices
      </p>
    </footer>
  );
}
