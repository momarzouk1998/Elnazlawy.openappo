import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const callerSupabase = await createClient();
  const { data: { user } } = await callerSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: caller } = await callerSupabase.from("mazaya_users").select("role").eq("auth_id", user.id).single();
  if (caller?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const { user_id, auth_id, username, email_or_phone, role, branch_id, visible_modules, is_active, notes, password } = body;

  const admin = createAdminClient();
  const updates: any = { username, email_or_phone, role, branch_id, visible_modules, is_active, notes };
  Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

  const { error } = await admin.from("mazaya_users").update(updates).eq("id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (password && auth_id) {
    await admin.auth.admin.updateUserById(auth_id, { password }).catch(e => console.error(e));
  }

  return NextResponse.json({ ok: true });
}
