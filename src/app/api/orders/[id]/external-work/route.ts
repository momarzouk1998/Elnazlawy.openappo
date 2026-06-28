import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** GET — list external work for an order */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: orderIdStr } = await params;
    const orderId = orderIdStr;

    const order = await prisma.orders.findFirst({
      where: { id: orderId, deleted_at: null },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'الأوردر غير موجود' } }, { status: 404 });
    }

    const r = await prisma.$queryRawUnsafe<any[]>(`
      SELECT oew.*, co.name as contractor_name
      FROM mazaya.order_external_work oew
      LEFT JOIN mazaya.contractors co ON oew.contractor_id = co.id
      WHERE oew.order_id = $1::uuid
      ORDER BY oew.created_at DESC
    `, orderId);

    return NextResponse.json({ ok: true, data: r });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: e.status });
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

/** POST — add external work to order */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: orderIdStr } = await params;
    const orderId = orderIdStr;
    const body = await request.json();
    const { contractor_id, description, cost, notes } = body;

    const order = await prisma.orders.findFirst({
      where: { id: orderId, deleted_at: null },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'الأوردر غير موجود' } }, { status: 404 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'وصف العمل مطلوب' } }, { status: 400 });
    }

    const r = await prisma.order_external_work.create({
      data: {
        order_id: orderId,
        contractor_id: contractor_id || null,
        work_type: description.trim(),
        amount: cost || null,
        notes: notes || null,
      },
    });

    auditLog({ user_id: user.id, action: 'create', table_name: 'order_external_work', row_id: r.id, after: r });
    return NextResponse.json({ ok: true, data: r }, { status: 201 });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: e.status });
    console.error('External work create error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

/** PATCH — update external work item */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: orderIdStr } = await params;
    const orderId = orderIdStr;
    const { searchParams } = new URL(request.url);
    const workIdStr = searchParams.get('work_id');

    if (!workIdStr) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'معرف العمل مطلوب' } }, { status: 400 });
    }

    const workId = workIdStr;

    const before = await prisma.order_external_work.findFirst({
      where: { id: workId, order_id: orderId },
    });
    if (!before) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'العمل غير موجود' } }, { status: 404 });
    }

    const body = await request.json();
    const allowed = ['contractor_id', 'work_type', 'amount', 'notes'];
    const data: any = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }
    // Map frontend field names to Prisma model field names
    if (body.description !== undefined) data.work_type = body.description;
    if (body.cost !== undefined) data.amount = body.cost;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'لا توجد بيانات للتعديل' } }, { status: 400 });
    }

    const r = await prisma.order_external_work.update({
      where: { id: workId },
      data,
    });
    auditLog({ user_id: user.id, action: 'update', table_name: 'order_external_work', row_id: workId, before, after: r });

    return NextResponse.json({ ok: true, data: r });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: e.status });
    console.error('External work update error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

/** DELETE — remove external work item */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: orderIdStr } = await params;
    const orderId = orderIdStr;
    const { searchParams } = new URL(request.url);
    const workIdStr = searchParams.get('work_id');

    if (!workIdStr) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'معرف العمل مطلوب' } }, { status: 400 });
    }

    const workId = workIdStr;

    const before = await prisma.order_external_work.findFirst({
      where: { id: workId, order_id: orderId },
    });
    if (!before) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'العمل غير موجود' } }, { status: 404 });
    }

    await prisma.order_external_work.delete({
      where: { id: workId },
    });
    auditLog({ user_id: user.id, action: 'delete', table_name: 'order_external_work', row_id: workId, before });

    return NextResponse.json({ ok: true, data: { message: 'تم حذف العمل' } });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: e.status });
    console.error('External work delete error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}
