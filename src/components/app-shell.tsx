import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand";
import { useSession, type Role } from "@/lib/session";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; roles: Role[] };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", roles: ["admin", "staff"] },
  { to: "/dispatch", label: "Live Orders", roles: ["admin", "staff"] },
  { to: "/menu-manager", label: "Menu", roles: ["admin", "staff"] },
  { to: "/order-history", label: "Order History", roles: ["admin", "staff"] },
  { to: "/reviews", label: "Feedback", roles: ["admin", "staff"] },
  { to: "/drivers", label: "Driver Stats", roles: ["admin"] },
  { to: "/staff", label: "Staff & Drivers", roles: ["admin"] },
  { to: "/delivery", label: "My Deliveries", roles: ["driver"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, name } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const items = NAV.filter((i) => role && i.roles.includes(role));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden opacity-85 sm:inline">
              {name} · {role}
            </span>
            <Button size="sm" variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
                pathname === i.to
                  ? "bg-accent font-medium text-accent-foreground"
                  : "hover:bg-primary-foreground/10"
              }`}
            >
              {i.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
