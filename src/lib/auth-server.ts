// Server-only auth helpers — تستخدم next/cookies و supabase server client
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/auth";

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("mazaya_users")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  // Self-healing: لو الـ profile مش متربط بالـ auth_id، نحاول نربطه تلقائياً
  if (!data && !error?.message.includes("multiple")) {
    console.log("[auth] profile not found for auth_id:", user.id, "email:", user.email);
    // محاولة إصلاح تلقائي عبر Admin API
    if (user.email) {
      try {
        const admin = createAdminClient();
        const { data: profiles } = await admin
          .from("mazaya_users")
          .select("*")
          .or(`email_or_phone.eq.${user.email},username.eq.${user.email.split("@")[0]}`)
          .limit(1);
        if (profiles && profiles.length > 0) {
          await admin.from("mazaya_users").update({ auth_id: user.id }).eq("id", profiles[0].id);
          console.log("[auth] self-healed: linked profile", profiles[0].username, "to auth_id", user.id);
          return profiles[0] as CurrentProfile;
        }
      } catch (e) {
        console.error("[auth] self-heal failed:", e);
      }
    }
  }
  return data as CurrentProfile | null;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: Admin only");
  }
  return profile;
}
