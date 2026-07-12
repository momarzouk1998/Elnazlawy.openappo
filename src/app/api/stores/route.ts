import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET() {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  const stores = await prisma.stores.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
    include: {
      treasury: { select: { id: true, name: true, current_balance: true } },
      _count: { select: { inventory: true } },
    },
  });
  return NextResponse.json({ ok: true, data: stores });
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  try {
    const body = await request.json();
    const store = await prisma.stores.create({
      data: {
        name: body.name,
        type: body.type || 'store',
        description: body.description || null,
        assigned_user_id: body.assigned_user_id || null,
        treasury_id: body.treasury_id || null,
      },
    });
    return NextResponse.json({ ok: true, data: store });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
