/**
 * schemaDefinitions — hand-written, human-readable shapes of the tables this app
 * touches. WHY: the generated Supabase types are huge and noisy; these aliases keep
 * component props readable and document the domain in one place.
 */
import type { Database } from "@/database/supabaseClient";

/** Staff-side roles stored in the `user_roles` table (never on `profiles`). */
export type StaffRole = Database["public"]["Enums"]["app_role"];

/** The 10-stage order lifecycle enum. */
export type OrderStatus = Database["public"]["Enums"]["order_status"];

/** A dish row from `menu_items`. */
export type MenuItemRow = Database["public"]["Tables"]["menu_items"]["Row"];

/** A customer/staff profile row, including the anti-fake-order approval status. */
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/** An order row with GPS + IP evidence captured at checkout. */
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

/** Payment choice offered in the cart. */
export type PaymentMethod = "UPI" | "COD";

/** Storage bucket holding admin-uploaded dish photos. */
export const MENU_IMAGE_BUCKET = "menu-images";
