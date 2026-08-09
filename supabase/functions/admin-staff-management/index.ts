import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server missing Supabase service configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify caller identity using JWT token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const { action, payload } = body;

    // Action: Self Account Permanent Deletion (Customer or Staff deleting their own account)
    if (action === "delete-own-account") {
      const targetUserId = user.id; // SECURITY: Always derives target from verified JWT

      // Permanently delete user from Supabase Auth (CASCADE removes public.profiles row)
      const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteAuthErr) {
        console.error("deleteUser error:", deleteAuthErr);
        return new Response(
          JSON.stringify({ error: `Auth deletion failed: ${deleteAuthErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Explicit cleanup for profile row if CASCADE is pending
      await adminClient.from("profiles").delete().eq("id", targetUserId);

      return new Response(
        JSON.stringify({ success: true, message: "Your account has been permanently deleted." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Admin Privileged Actions (Requires Admin Role)
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, is_active, account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !callerProfile ||
      callerProfile.role !== "admin" ||
      callerProfile.is_active === false ||
      callerProfile.account_status === "inactive" ||
      callerProfile.account_status === "blocked_fraud"
    ) {
      return new Response(
        JSON.stringify({ error: "Access denied: Active Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin Action A: Fetch Auth User Metadata
    if (action === "get-auth-metadata") {
      const { userId } = payload || {};
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing userId parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: authUser, error: getErr } = await adminClient.auth.admin.getUserById(userId);
      if (getErr || !authUser?.user) {
        return new Response(
          JSON.stringify({ error: getErr?.message || "User not found in Supabase Auth" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          id: authUser.user.id,
          email: authUser.user.email,
          email_confirmed_at: authUser.user.email_confirmed_at,
          is_email_verified: Boolean(authUser.user.email_confirmed_at),
          created_at: authUser.user.created_at,
          last_sign_in_at: authUser.user.last_sign_in_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin Action B: Deactivate Staff Account
    if (action === "deactivate-staff-account") {
      const { targetUserId } = payload || {};
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "Missing targetUserId parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetUserId === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot deactivate your own active admin session" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateErr } = await adminClient
        .from("profiles")
        .update({
          is_active: false,
          account_status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Account deactivated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin Action C: Permanently Delete Account
    if (action === "delete-staff-account") {
      const { targetUserId } = payload || {};
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "Missing targetUserId parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetUserId === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete your own active admin session" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Safely delete from Supabase Auth (CASCADE removes public.profiles row)
      const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteAuthErr) {
        console.error("deleteUser error:", deleteAuthErr);
        return new Response(
          JSON.stringify({ error: `Auth deletion failed: ${deleteAuthErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cleanup fallback for profile
      await adminClient.from("profiles").delete().eq("id", targetUserId);

      return new Response(
        JSON.stringify({ success: true, message: "Staff account deleted permanently" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Invalid action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
