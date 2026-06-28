import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const date_from = searchParams.get('date_from') || '';
    const date_to = searchParams.get('date_to') || '';

    const dateFilter: any = {};
    if (date_from || date_to) {
      if (date_from) dateFilter.gte = new Date(date_from);
      if (date_to) dateFilter.lte = new Date(date_to);
    }

    const where: any = {};
    if (date_from || date_to) where.date = dateFilter;

    const byType = await prisma.journal_entries.groupBy({
      by: ['entry_type'],
      _sum: { amount: true },
      _count: { id: true },
      where,
      orderBy: { _sum: { amount: 'desc' } },
    });

    let totalIn = 0;
    let totalOut = 0;

    for (const row of byType) {
      const sum = Number(row._sum.amount || 0);
      if (['purchase', 'incoming_from_branch'].includes(row.entry_type)) {
        totalIn += sum;
      } else if (['outgoing_to_supplier', 'overhead'].includes(row.entry_type)) {
        totalOut += sum;
      }
    }

    const serialized = byType.map((row) => ({
      entry_type: row.entry_type,
      total_amount: Number(row._sum.amount || 0),
      count: row._count.id,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        by_type: serialized,
        total_in: totalIn,
        total_out: totalOut,
      },
    });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}
