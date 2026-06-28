import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';
import { verifyPassword, hashPassword } from '@/lib/db/auth';
import { auditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const { current_password, new_password } = await request.json();
    if (!current_password || !new_password) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'كلمة السر الحالية والجديدة مطلوبتان' } },
        { status: 400 }
      );
    }
    if (new_password.length < 6) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'كلمة السر الجديدة لازم 6 حروف على الأقل' } },
        { status: 400 }
      );
    }
    if (current_password === new_password) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'كلمة السر الجديدة لازم تكون مختلفة عن الحالية' } },
        { status: 400 }
      );
    }

    const existingUser = await prisma.users.findFirst({
      where: { id: user.id },
      select: { password_hash: true },
    });
    if (!existingUser) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'المستخدم غير موجود' } },
        { status: 404 }
      );
    }

    const valid = await verifyPassword(current_password, existingUser.password_hash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'كلمة السر الحالية غير صحيحة' } },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(new_password);
    await prisma.users.update({ where: { id: user.id }, data: { password_hash: newHash, updated_at: new Date() } });

    auditLog({ user_id: user.id, action: 'update', table_name: 'users', row_id: user.id });

    return NextResponse.json({ ok: true, data: { message: 'تم تغيير كلمة السر بنجاح' } });
  } catch (e: any) {
    if (e.status === 401) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    }
    console.error('Change password error:', e);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } },
      { status: 500 }
    );
  }
}
