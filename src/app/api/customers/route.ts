import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: Prisma.customersWhereInput = { is_active: true };
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [items, total] = await Promise.all([
    prisma.customers.findMany({ where, orderBy: { name: 'asc' }, take: limit, skip: offset }),
    prisma.customers.count({ where }),
  ]);
  // Cache 30s + stale-while-revalidate 5min — يسرّع تحميل قوائم العملاء جداً
  return NextResponse.json(
    { ok: true, data: { items, total, limit, offset } },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=300' } }
  );
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  try {
    const body = await request.json();
    // === فاليديشن ===
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'اسم العميل مطلوب' } }, { status: 400 });
    }
    const opening = Number(body.opening_balance) || 0;
    if (!Number.isFinite(opening)) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'الرصيد الافتتاحي غير صالح' } }, { status: 400 });
    }
    const customer = await prisma.customers.create({
      data: {
        name: String(body.name).trim(),
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        address: body.address || null,
        opening_balance: opening,
        balance: opening,
        route_days: body.route_days || [],
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ ok: true, data: customer });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
