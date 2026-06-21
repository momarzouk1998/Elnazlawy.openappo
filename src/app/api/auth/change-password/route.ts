// POST /api/auth/change-password
// Body: { current_password: string, new_password: string }
// يتطلب session فعّال
// Uses Supabase Admin API to update the password

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { current_password, new_password } = await req.json();
    if (!current_password || !new_password) {
      return NextResponse.json({ error: "الباسورد الحالي والجديد مطلوبين" }, { status: 400 });
    }
    if (new_password.length < 6) {
      return NextResponse.json({ error: "كلمة السر الجديدة لازم 6 حروف على الأقل" }, { status: 400 });
    }
    if (current_password === new_password) {
      return NextResponse.json({ error: "كلمة السر الجديدة لازم تكون مختلفة عن الحالية" }, { status: 400 });
    }

    // 1) اتأكد إن فيه session فعّال + الباسورد الحالي صحيح
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "مش مسجل دخول" }, { status: 401 });
    }

    // Re-authenticate to verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });
    if (signInErr) {
      return NextResponse.json({ error: "كلمة السر الحالية غير صحيحة" }, { status: 400 });
    }

    // 2) حدّث الباسورد عبر Admin API
    const admin = createAdminClient();
    const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "تم تغيير كلمة السر بنجاح" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "خطأ غير متوقع" }, { status: 500 });
  }
}
