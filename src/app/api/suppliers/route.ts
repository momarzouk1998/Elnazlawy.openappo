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

  const where: Prisma.suppliersWhereInput = { is_active: true };
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [items, total] = await Promise.all([
    prisma.suppliers.findMany({ where, orderBy: { name: 'asc' }, take: limit, skip: offset }),
    prisma.suppliers.count({ where }),
  ]);
  return NextResponse.json({ ok: true, data: { items, total, limit, offset } });
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  try {
    const body = await request.json();
    const supplier = await prisma.suppliers.create({
      data: {
        name: body.name,
        phone: body.phone || null,
        address: body.address || null,
        opening_balance: body.opening_balance || 0,
        balance: body.opening_balance || 0,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ ok: true, data: supplier });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
