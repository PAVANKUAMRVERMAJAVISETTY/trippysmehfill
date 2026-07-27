import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "staff" | "driver";

export type SessionState = {
  loading: boolean;
  user: User | null;
  role: Role | null;
  name: string;
  username: string;
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: true,
    user: null,
    role: null,
    name: "",
    username: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function load(user: User | null) {
      if (!user) {
        if (!cancelled) setState({ loading: false, user: null, role: null, name: "", username: "" });
        return;
      }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("name, username").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const order: Role[] = ["admin", "staff", "driver"];
      const found = order.find((r) => (roles ?? []).some((x) => x.role === r)) ?? null;
      setState({
        loading: false,
        user,
        role: found,
        name: profile?.name ?? "",
        username: profile?.username ?? "",
      });
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState((s) => ({ ...s, loading: true }));
      void load(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export const rupees = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export type CartLine = { id: string; name: string; price: number; qty: number };

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
export function daysAgo(n: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}
