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

// PATCH /api/customers/[id] — تعديل بيانات العميل
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  if (profile.role === 'rep') {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'لا تملك صلاحية التعديل' } }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.name !== undefined && !String(body.name).trim()) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'اسم العميل مطلوب' } }, { status: 400 });
    }

    // تعديل الرصيد الافتتاحي يتطلب transaction (يأثر على الرصيد الحالي)
    if (body.opening_balance !== undefined) {
      const newOpening = Number(body.opening_balance);
      if (!Number.isFinite(newOpening)) {
        return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'الرصيد الافتتاحي غير صالح' } }, { status: 400 });
      }
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.customers.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
        // الفرق بين الرصيد الجديد والحالي = رصيد الحركة الإضافي على العميل
        const balanceDiff = newOpening - Number(existing.opening_balance);
        const updated = await tx.customers.update({
          where: { id },
          data: {
            ...(body.name !== undefined && { name: String(body.name).trim() }),
            ...(body.phone !== undefined && { phone: body.phone || null }),
            ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp || null }),
            ...(body.address !== undefined && { address: body.address || null }),
            ...(body.route_days !== undefined && { route_days: body.route_days }),
            ...(body.notes !== undefined && { notes: body.notes || null }),
            opening_balance: newOpening,
            balance: Number(existing.balance) + balanceDiff,
            updated_at: new Date(),
          },
        });
        return NextResponse.json({ ok: true, data: updated });
      });
    }

    const updated = await prisma.customers.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: String(body.name).trim() }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp || null }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.route_days !== undefined && { route_days: body.route_days }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}

// DELETE /api/customers/[id] — حذف آمن (soft-delete) أو منع لو فيه حركات
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  if (profile.role === 'rep') {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'لا تملك صلاحية الحذف' } }, { status: 403 });
  }

  try {
    const { id } = await params;

    // فحص: يوجد فواتير أو مدفوعات؟ — منع الحذف نهائياً
    const [salesCount, paymentsCount] = await Promise.all([
      prisma.sales_invoices.count({ where: { customer_id: id } }),
      prisma.customer_payments.count({ where: { customer_id: id } }),
    ]);

    if (salesCount > 0 || paymentsCount > 0) {
      return NextResponse.json(
        { ok: false, error: { code: 'HAS_TRANSACTIONS', message: `لا يمكن حذف العميل: له ${salesCount} فاتورة و ${paymentsCount} مدفوعة. احذف الحركات أولاً.` } },
        { status: 400 }
      );
    }

    await prisma.customers.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
