import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const customerSignup = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { name: string; email: string; password: string; phone: string; address: string }) => d,
  )
  .handler(async ({ data }) => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const phone = data.phone.trim();
    const address = data.address.trim();

    if (name.length < 2) throw new Error("Please enter your full name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address");
    if (!/^\+?[0-9 -]{8,15}$/.test(phone)) throw new Error("Please enter a valid phone number");
    if (address.length < 5) throw new Error("Please enter your hostel / delivery address");
    if (data.password.length < 6) throw new Error("Password must be at least 6 characters");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      throw new Error(
        error?.message?.toLowerCase().includes("already")
          ? "An account with this email already exists"
          : (error?.message ?? "Could not create your account"),
      );
    }

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      name: name.slice(0, 100),
      username: email.slice(0, 120),
      email: email.slice(0, 120),
      phone: phone.slice(0, 20),
      address: address.slice(0, 400),
      status: "pending",
      active: true,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(
        pErr.message.includes("duplicate") ? "An account with this email already exists" : pErr.message,
      );
    }
    return { ok: true };
  });

export const setRegistrationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "approved" | "rejected" }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only the owner can approve registrations");

    const { error } = await context.supabase
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
