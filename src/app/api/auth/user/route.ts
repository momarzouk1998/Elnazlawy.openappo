import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { COOKIE_NAME, verifySession } from '@/lib/db/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
  }

  const payload = await verifySession(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'انتهت الجلسة' } }, { status: 401 });
  }

  const user = await prisma.users.findFirst({
    where: { id: payload.sub },
    select: { id: true, username: true, full_name: true, role: true, branch_id: true, visible_modules: true, permissions: true, is_active: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'المستخدم غير موجود' } }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    data: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      branch_id: user.branch_id,
      visible_modules: user.visible_modules || [],
      permissions: user.permissions || {},
      is_active: user.is_active,
    },
  });
}
