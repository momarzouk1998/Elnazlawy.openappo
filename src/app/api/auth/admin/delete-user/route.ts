import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const callerSupabase = await createClient();
  const { data: { user } } = await callerSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: caller } = await callerSupabase.from("mazaya_users").select("id, role").eq("auth_id", user.id).single();
  if (caller?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { user_id, auth_id } = await req.json();
  if (user_id === caller.id) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك أنت" }, { status: 400 });
  }
  const admin = createAdminClient();
  await admin.from("mazaya_users").delete().eq("id", user_id);
  if (auth_id) {
    await admin.auth.admin.deleteUser(auth_id).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
