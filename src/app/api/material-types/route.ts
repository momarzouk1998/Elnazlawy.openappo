import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';

    if (category && !['board', 'accessory'].includes(category)) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'التصنيف يجب أن يكون board أو accessory' } },
        { status: 400 }
      );
    }

    const where: any = {};
    if (category) where.category = category;

    const materialTypes = await prisma.material_types.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ ok: true, data: materialTypes });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const { name, category } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'اسم المادة مطلوب' } },
        { status: 400 }
      );
    }

    if (!category || !['board', 'accessory'].includes(category)) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'التصنيف مطلوب ويجب أن يكون board أو accessory' } },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await prisma.material_types.findFirst({
      where: { name: name.trim() },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'CONFLICT', message: 'اسم المادة موجود بالفعل' } },
        { status: 409 }
      );
    }

    const materialType = await prisma.material_types.create({
      data: { name: name.trim(), category },
    });
    auditLog({ user_id: admin.id, action: 'create', table_name: 'material_types', row_id: materialType.id, after: materialType });

    return NextResponse.json({ ok: true, data: materialType }, { status: 201 });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}
