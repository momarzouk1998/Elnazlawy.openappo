// Server-only auth helpers — تستخدم next/cookies و supabase server client
import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/auth";

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("mazaya_users")
    .select("*")
    .eq("auth_id", user.id)
    .single();
  return data as CurrentProfile | null;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: Admin only");
  }
  return profile;
}
