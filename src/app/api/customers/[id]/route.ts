import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const { id } = await params;
    const customer = await prisma.customers.findUnique({
      where: { id }
    });

    if (!customer || !customer.is_active) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: customer });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
