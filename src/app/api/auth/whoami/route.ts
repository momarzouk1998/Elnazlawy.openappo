// /api/auth/whoami — يُظهر حالة المستخدم الحالية (مفيش حماية — للتشخيص)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  const profile = await getCurrentProfile();

  return NextResponse.json({
    auth_user: user ? {
      id: user.id,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    } : null,
    auth_error: uErr?.message ?? null,
    profile,
    has_session: !!user,
    has_profile: !!profile,
  });
}
