import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const table_name = searchParams.get('table_name') || '';
    const action = searchParams.get('action') || '';
    const user_id = searchParams.get('user_id') || '';
    const date_from = searchParams.get('date_from') || '';
    const date_to = searchParams.get('date_to') || '';

    const offset = (page - 1) * limit;

    const where: any = {};
    if (table_name) where.table_name = table_name;
    if (action) where.action = action;
    if (user_id) where.user_id = parseInt(user_id);
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from);
      if (date_to) where.created_at.lte = new Date(date_to);
    }

    const total = await prisma.audit_log.count({ where });

    const entries = await prisma.audit_log.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    });

    const mappedEntries = entries.map(entry => ({
      ...entry,
      username: entry.user?.username || null,
      user: undefined,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        entries: mappedEntries,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}
