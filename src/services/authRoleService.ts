/**
 * authRoleService — single responsibility: work out WHO the signed-in user is
 * and WHERE they should land after login.
 *
 * 🎯 INTERVIEW QUESTION: "Why store roles in a separate table instead of a column
 *    on the profile?" Answer: a profile row is user-editable, so a role column is a
 *    privilege-escalation hole. Roles live in `user_roles` behind RLS + SECURITY DEFINER.
 */
import { supabase } from "@/database/supabaseClient";
import type { StaffRole } from "@/database/schemaDefinitions";

export type ResolvedAccount = {
  role: StaffRole | "customer"; // effective role used for routing
  isApproved: boolean; // customers must be approved by the admin
  status: "pending" | "approved" | "rejected" | null;
  name: string;
};

// Priority order for a user holding multiple roles — highest privilege wins.
const ROLE_PRIORITY: StaffRole[] = ["admin", "staff", "driver"];

/**
 * [DATABASE QUERY] Reads the profile and role rows for a user.
 * [DSA / ALGORITHM] Role lookup = linear scan over a tiny priority array (O(r), r ≤ 3),
 * which beats a hash map here because the set is fixed and ordered by privilege.
 */
export async function resolveAccount(userId: string): Promise<ResolvedAccount> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("name, status, active").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const held = new Set((roles ?? []).map((r) => r.role)); // O(1) membership tests
  const staffRole = ROLE_PRIORITY.find((r) => held.has(r)) ?? null;
  const status = (profile?.status as ResolvedAccount["status"]) ?? null;

  return {
    role: staffRole ?? "customer",
    // A deactivated account is treated as not approved so it can never order.
    isApproved: profile?.active !== false && status === "approved",
    status,
    name: profile?.name ?? "",
  };
}

/** Where each role belongs after a successful sign-in. `null` = stay on the storefront. */
export function landingRouteFor(account: ResolvedAccount): string | null {
  if (account.role === "admin") return "/dashboard";
  if (account.role === "staff") return "/kitchen";
  if (account.role === "driver") return "/delivery";
  return null; // approved customers simply see prices + cart on the current page
}

/** Prefilled WhatsApp link customers use to request instant admin approval. */
export const APPROVAL_WHATSAPP_LINK =
  "https://wa.me/918569955929?text=Hi%20Admin,%20please%20approve%20my%20PreOrderEats%20account";

export const PENDING_APPROVAL_MESSAGE =
  "Your registration is pending admin approval to prevent fake orders. For instant approval, contact us on WhatsApp.";
