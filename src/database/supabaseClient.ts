/**
 * supabaseClient — the single place the app imports the backend client from.
 * WHY: keeps the auto-generated integration file untouched while giving every
 * module one stable, documented import path.
 */
export { supabase } from "@/integrations/supabase/client";
export type { Database } from "@/integrations/supabase/types";
