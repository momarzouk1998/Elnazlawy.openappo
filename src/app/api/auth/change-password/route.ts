import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth-server";
import { query } from '@/lib/db/pool';
import { verifyPassword, hashPassword } from '@/lib/db/auth';

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

    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "مش مسجل دخول" }, { status: 401 });
    }

    const r = await query('SELECT password_hash FROM mazaya.users WHERE id = $1', [profile.id]);
    if (r.rows.length === 0) {
      return NextResponse.json({ error: "المستخدم مش موجود" }, { status: 404 });
    }

    const valid = await verifyPassword(current_password, r.rows[0].password_hash);
    if (!valid) {
      return NextResponse.json({ error: "كلمة السر الحالية غير صحيحة" }, { status: 400 });
    }

    const newHash = await hashPassword(new_password);
    await query('UPDATE mazaya.users SET password_hash = $1 WHERE id = $2', [newHash, profile.id]);

    return NextResponse.json({ ok: true, message: "تم تغيير كلمة السر بنجاح" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "خطأ غير متوقع" }, { status: 500 });
  }
}
