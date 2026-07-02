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

    const user = await prisma.users.findFirst({
      where: { id: parseInt(id) },
      select: { id: true, username: true, full_name: true, role: true, branch_id: true, visible_modules: true, permissions: true, is_active: true, last_login_at: true, created_at: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'المستخدم غير موجود' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: user });
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

    const existingUser = await prisma.users.findFirst({
      where: { id: parseInt(id) },
      select: { id: true, username: true, full_name: true, role: true, branch_id: true, visible_modules: true, permissions: true, is_active: true },
    });
    if (!existingUser) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'المستخدم غير موجود' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { full_name, role, branch_id, visible_modules, permissions, is_active } = body;

    // Cannot change own role
    if (role && admin.id === parseInt(id)) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'لا يمكنك تغيير دورك الخاص' } },
        { status: 403 }
      );
    }

    // Validate role if provided
    if (role && !['admin', 'branch_user'].includes(role)) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'الدور غير صالح' } },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (branch_id !== undefined) updateData.branch_id = branch_id;
    if (visible_modules !== undefined) updateData.visible_modules = visible_modules;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, username: true, full_name: true, role: true, branch_id: true, visible_modules: true, permissions: true, is_active: true, last_login_at: true, created_at: true },
    });

    auditLog({
      user_id: admin.id,
      action: 'update',
      table_name: 'users',
      row_id: parseInt(id),
      before: existingUser,
      after: updatedUser,
    });

    return NextResponse.json({ ok: true, data: updatedUser });
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

    const existingUser = await prisma.users.findFirst({
      where: { id: parseInt(id) },
      select: { id: true, username: true, full_name: true, is_active: true },
    });
    if (!existingUser) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'المستخدم غير موجود' } },
        { status: 404 }
      );
    }

    // Cannot delete self
    if (admin.id === parseInt(id)) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'لا يمكنك حذف حسابك الخاص' } },
        { status: 403 }
      );
    }

    // Block deletion if the user has any orders on their record (preserves history)
    const orderCount = await prisma.orders.count({ where: { created_by: parseInt(id) } });
    if (orderCount > 0) {
      return NextResponse.json(
        { ok: false, error: { code: 'CONFLICT', message: `لا يمكن الحذف: المستخدم لديه ${orderCount} أوردر مسجل باسمه. استخدم زر التعطيل بدلاً من ذلك.` } },
        { status: 409 }
      );
    }

    // Soft-delete + scrub username so it never shows up again and frees the unique slot.
    // (The row is kept so audit_log FKs and historical references stay valid.)
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id) },
      data: {
        is_active: false,
        username: `__deleted_${id}_${Date.now()}`,
      },
      select: { id: true, username: true, full_name: true, is_active: true },
    });

    auditLog({
      user_id: admin.id,
      action: 'delete',
      table_name: 'users',
      row_id: parseInt(id),
      before: existingUser,
      after: updatedUser,
    });

    return NextResponse.json({ ok: true, data: updatedUser });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}
