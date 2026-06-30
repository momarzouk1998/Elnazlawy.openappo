import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const offset = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [items, total] = await Promise.all([
      prisma.users.findMany({
        where,
        select: { id: true, username: true, full_name: true, role: true, branch_id: true, visible_modules: true, permissions: true, is_active: true, last_login_at: true, created_at: true },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.users.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items, total, page, limit },
    });
  } catch (e: any) {
    if (e.status === 401) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    }
    if (e.status === 403) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    }
    console.error('List users error:', e);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } },
      { status: 500 }
    );
  }
}
