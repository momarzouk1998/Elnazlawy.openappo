import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// GET /api/purchases/invoices/[id] - جلب تفاصيل فاتورة شراء
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const { id } = await params;
    const invoice = await prisma.purchase_invoices.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        creator: { select: { id: true, full_name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: { include: { treasury: { select: { id: true, name: true } } } },
      },
    });
    if (!invoice) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    return NextResponse.json({ ok: true, data: invoice });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
