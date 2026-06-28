import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const materialType = await prisma.material_types.findFirst({ where: { id: id } });

    if (!materialType) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'نوع المادة غير موجود' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: materialType });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const existingType = await prisma.material_types.findFirst({ where: { id: id } });
    if (!existingType) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'نوع المادة غير موجود' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, is_active } = body;

    // Validate name uniqueness if updating name
    if (name && name.trim() !== '') {
      const nameCheck = await prisma.material_types.findFirst({
        where: { name: name.trim(), NOT: { id: id } },
        select: { id: true },
      });
      if (nameCheck) {
        return NextResponse.json(
          { ok: false, error: { code: 'CONFLICT', message: 'اسم المادة موجود بالفعل' } },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (is_active !== undefined) updateData.is_active = is_active;

    const materialType = await prisma.material_types.update({
      where: { id: id },
      data: updateData,
    });

    auditLog({
      user_id: admin.id,
      action: 'update',
      table_name: 'material_types',
      row_id: id,
      before: existingType,
      after: materialType,
    });

    return NextResponse.json({ ok: true, data: materialType });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const existingType = await prisma.material_types.findFirst({ where: { id: id } });
    if (!existingType) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'نوع المادة غير موجود' } },
        { status: 404 }
      );
    }

    // Check references in boards
    const boardRef = await prisma.boards_inventory.findFirst({
      where: { material_type: existingType.name },
      select: { id: true },
    });
    if (boardRef) {
      return NextResponse.json(
        { ok: false, error: { code: 'CONFLICT', message: 'لا يمكن حذف النوع لأنه مرتبط بعناصر المخزون' } },
        { status: 409 }
      );
    }

    // Check references in accessories
    const accRef = await prisma.accessories_inventory.findFirst({
      where: { material_type: existingType.name },
      select: { id: true },
    });
    if (accRef) {
      return NextResponse.json(
        { ok: false, error: { code: 'CONFLICT', message: 'لا يمكن حذف النوع لأنه مرتبط بعناصر المخزون' } },
        { status: 409 }
      );
    }

    await prisma.material_types.delete({ where: { id: id } });

    auditLog({
      user_id: admin.id,
      action: 'delete',
      table_name: 'material_types',
      row_id: id,
      before: existingType,
    });

    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}
