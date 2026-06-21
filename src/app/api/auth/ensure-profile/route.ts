// API endpoint يربط auth_id بالـ profile تلقائياً بناءً على الإيميل
// مفيد لو الـ SQL اليدوي ما اتنفذش
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email;
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1) Find the Auth user by email
    const { data: users, error: uErr } = await admin.auth.admin.listUsers({ perPage: 100 });
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    const authUser = users.users.find((u: any) => u.email === email);
    if (!authUser) return NextResponse.json({ error: `No Auth user with email ${email}` }, { status: 404 });

    // 2) Find the profile by email_or_phone or username
    const { data: profiles, error: pErr } = await admin
      .from("mazaya_users")
      .select("*")
      .or(`email_or_phone.eq.${email},username.eq.${email.split("@")[0]}`);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: `No profile with email/username matching ${email}` }, { status: 404 });
    }

    const profile = profiles[0];

    // 3) Update auth_id
    const { error: u2Err } = await admin
      .from("mazaya_users")
      .update({ auth_id: authUser.id })
      .eq("id", profile.id);

    if (u2Err) return NextResponse.json({ error: u2Err.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      auth_id: authUser.id,
      profile_id: profile.id,
      username: profile.username,
      role: profile.role,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
