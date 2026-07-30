import { supabase } from "./api.js";

export const AuthGuard = {
  async checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/Pages/staff-login.html";
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', session.user.id)
      .single();

    if (!profile || !profile.is_approved) {
      alert("Unauthorized or pending account.");
      await supabase.auth.signOut();
      window.location.href = "/Pages/staff-login.html";
    }
  }
};