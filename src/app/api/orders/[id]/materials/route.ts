import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** GET — list materials for an order */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: orderIdStr } = await params;
    const orderId = parseInt(orderIdStr);

    const order = await prisma.orders.findFirst({
      where: { id: orderId, deleted_at: null },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'الأوردر غير موجود' } }, { status: 404 });
    }

    const r = await prisma.$queryRaw<any[]>`
      SELECT om.*,
        CASE
          WHEN om.inventory_table = 'boards_inventory' THEN bi.item_name
          WHEN om.inventory_table = 'accessories_inventory' THEN ai.item_name
        END as item_name,
        CASE
          WHEN om.inventory_table = 'boards_inventory' THEN bi.code
          WHEN om.inventory_table = 'accessories_inventory' THEN ai.code
        END as item_code,
        CASE
          WHEN om.inventory_table = 'boards_inventory' THEN bi.quantity_remaining
          WHEN om.inventory_table = 'accessories_inventory' THEN ai.quantity_remaining
        END as available_quantity
      FROM mazaya.order_materials om
      LEFT JOIN mazaya.boards_inventory bi ON om.inventory_table = 'boards_inventory' AND om.item_id = bi.id
      LEFT JOIN mazaya.accessories_inventory ai ON om.inventory_table = 'accessories_inventory' AND om.item_id = ai.id
      WHERE om.order_id = ${orderId}
      ORDER BY om.created_at DESC
    `;

    return NextResponse.json({ ok: true, data: r });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: e.status });
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

/** POST — add material to order (triggers deduct_inventory) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: orderIdStr } = await params;
    const orderId = parseInt(orderIdStr);
    const body = await request.json();
    const { inventory_table, item_id, quantity_used, unit_price_snapshot } = body;

    const order = await prisma.orders.findFirst({
      where: { id: orderId, deleted_at: null },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'الأوردر غير موجود' } }, { status: 404 });
    }

    if (!inventory_table || !['boards_inventory', 'accessories_inventory'].includes(inventory_table)) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'نوع المخزون غير صالح' } }, { status: 400 });
    }
    if (!item_id) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'معرف الصنف مطلوب' } }, { status: 400 });
    }
    if (!quantity_used || quantity_used <= 0) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'الكمية المستخدمة مطلوبة' } }, { status: 400 });
    }
    if (!unit_price_snapshot || unit_price_snapshot <= 0) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'سعر الوحدة مطلوب' } }, { status: 400 });
    }

    const itemIdNum = parseInt(item_id);

    let invItem: any[];
    if (inventory_table === 'boards_inventory') {
      invItem = await prisma.$queryRaw<any[]>`
        SELECT id, quantity_remaining FROM mazaya.boards_inventory WHERE id = ${itemIdNum} AND deleted_at IS NULL
      `;
    } else {
      invItem = await prisma.$queryRaw<any[]>`
        SELECT id, quantity_remaining FROM mazaya.accessories_inventory WHERE id = ${itemIdNum} AND deleted_at IS NULL
      `;
    }
    if (invItem.length === 0) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'الصنف غير موجود في المخزون' } }, { status: 404 });
    }

    const available = parseFloat(invItem[0].quantity_remaining);
    if (quantity_used > available) {
      return NextResponse.json(
        { ok: false, error: { code: 'INSUFFICIENT_STOCK', message: `الكمية المطلوبة (${quantity_used}) أكبر من المتاح (${available})` } },
        { status: 400 }
      );
    }

    const r = await prisma.order_materials.create({
      data: {
        order_id: orderId,
        inventory_table,
        item_id: itemIdNum,
        quantity_used,
        unit_price_snapshot,
      },
    });

    auditLog({ user_id: user.id, action: 'create', table_name: 'order_materials', row_id: r.id, after: r });
    return NextResponse.json({ ok: true, data: r }, { status: 201 });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: e.status });
    console.error('Order material create error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

/** DELETE — remove material from order (triggers restore_inventory) */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: orderIdStr } = await params;
    const orderId = parseInt(orderIdStr);
    const { searchParams } = new URL(request.url);
    const materialIdStr = searchParams.get('material_id');

    if (!materialIdStr) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'معرف المادة مطلوب' } }, { status: 400 });
    }

    const materialId = parseInt(materialIdStr);

    const before = await prisma.order_materials.findFirst({
      where: { id: materialId, order_id: orderId },
    });
    if (!before) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'المادة غير موجودة' } }, { status: 404 });
    }

    await prisma.order_materials.delete({
      where: { id: materialId },
    });
    auditLog({ user_id: user.id, action: 'delete', table_name: 'order_materials', row_id: materialId, before });

    return NextResponse.json({ ok: true, data: { message: 'تم حذف المادة' } });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: e.status });
    console.error('Order material delete error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}
