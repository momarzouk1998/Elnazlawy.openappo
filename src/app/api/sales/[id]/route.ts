import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const invoice = await prisma.sales_invoices.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    }

    if (invoice.created_by !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }

    const updated = await prisma.sales_invoices.update({
      where: { id },
      data: {
        notes: body.notes ?? invoice.notes,
        discount: body.discount !== undefined ? Number(body.discount) : invoice.discount,
        total: Number(invoice.subtotal) - (body.discount !== undefined ? Number(body.discount) : Number(invoice.discount)),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const { id } = await params;
    const invoice = await prisma.sales_invoices.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    }

    if (invoice.created_by !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }

    await prisma.sales_invoices.update({
      where: { id },
      data: {
        status: 'ملغاة',
        void_reason: 'إلغاء يدوي',
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ ok: true, data: { message: 'تم إلغاء الفاتورة' } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
