import { NextResponse } from 'next/server';
import { requireAdmin, hasPermission } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';
import { hashPassword } from '@/lib/db/auth';
import { auditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const offset = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const total = await prisma.users.count({ where });

    const users = await prisma.users.findMany({
      where,
      select: { id: true, username: true, full_name: true, role: true, branch_id: true, visible_modules: true, permissions: true, is_active: true, last_login_at: true, created_at: true },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      data: {
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (e: any) {
    if (e.status === 401) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    }
    if (e.status === 403) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    }
    console.error('List users error:', e);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const { username, full_name, password, role, branch_id, visible_modules, permissions } = await request.json();

    if (!username || !full_name || !password) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'اسم المستخدم والاسم الكامل وكلمة المرور مطلوبون' } },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'كلمة المرور لازم 6 حروف على الأقل' } },
        { status: 400 }
      );
    }

    // Check username uniqueness
    const existing = await prisma.users.findFirst({ where: { username }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'CONFLICT', message: 'اسم المستخدم مستخدم بالفعل' } },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const validRoles = ['admin', 'branch_user'];
    const userRole = validRoles.includes(role) ? role : 'branch_user';

    const newUser = await prisma.users.create({
      data: {
        username,
        full_name,
        password_hash: passwordHash,
        role: userRole,
        branch_id: branch_id || null,
        visible_modules: visible_modules || ['dashboard', 'orders'],
        permissions: permissions || {},
      },
      select: { id: true, username: true, full_name: true, role: true, branch_id: true, is_active: true, created_at: true },
    });
    auditLog({ user_id: admin.id, action: 'create', table_name: 'users', row_id: newUser.id, after: newUser });

    return NextResponse.json({ ok: true, data: newUser }, { status: 201 });
  } catch (e: any) {
    if (e.status === 401) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    }
    if (e.status === 403) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    }
    console.error('Create user error:', e);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } },
      { status: 500 }
    );
  }
}
