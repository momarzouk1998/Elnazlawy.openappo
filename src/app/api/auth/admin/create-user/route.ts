import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Only admin can create users
  const callerSupabase = await createClient();
  const { data: { user } } = await callerSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: caller } = await callerSupabase.from("mazaya_users").select("role").eq("auth_id", user.id).single();
  if (caller?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const { username, email_or_phone, password, role, branch_id, visible_modules, is_active, notes } = body;

  if (!username || !email_or_phone || !password) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) create auth user (using email form)
  const email = email_or_phone.includes("@") ? email_or_phone : `${email_or_phone}@mazaya.local`;
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (authErr || !created.user) {
    return NextResponse.json({ error: authErr?.message ?? "فشل إنشاء الحساب" }, { status: 400 });
  }

  // 2) insert profile
  const { error: profileErr } = await admin.from("mazaya_users").insert([{
    auth_id: created.user.id, username, email_or_phone, role: role ?? "branch_user",
    branch_id: branch_id ?? null, visible_modules: visible_modules ?? ["dashboard", "orders"],
    is_active: is_active ?? true, notes: notes ?? null,
  }]);
  if (profileErr) {
    // rollback: delete auth user
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
