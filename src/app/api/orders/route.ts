import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const branch_id = searchParams.get('branch_id') || '';
    const customer_id = searchParams.get('customer_id') || '';
    const offset = (page - 1) * limit;

    const where: any = { deleted_at: null };

    if (search) {
      where.order_name = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }
    if (user.role !== 'admin' && user.branch_id) {
      where.branch_id = user.branch_id;
    } else if (branch_id) {
      where.branch_id = branch_id;
    }
    if (customer_id) {
      where.customer_id = customer_id;
    }

    const [countResult, data] = await Promise.all([
      prisma.orders.count({ where }),
      prisma.orders.findMany({
        where,
        include: { customer: true, branch: true },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    const items = data.map(({ customer, branch, ...rest }) => ({
      ...rest,
      customer_name: customer?.name ?? null,
      branch_name: branch?.name ?? null,
    }));

    return NextResponse.json({
      ok: true,
      data: { items, total: countResult, page, limit },
    });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: e.status });
    console.error('Orders list error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { order_name, customer_id, branch_id, order_type, start_date, end_date, status, installation_cost, internal_transport_cost, external_transport_cost, factory_commission, notes } = body;

    if (!order_name || !order_name.trim()) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'اسم الأوردر مطلوب' } }, { status: 400 });
    }

    const validStatuses = ['open', 'in_progress', 'completed', 'delivered'];
    const validTypes = ['new', 'maintenance'];

    const r = await prisma.orders.create({
      data: {
        order_name: order_name.trim(),
        customer_id: customer_id || null,
        branch_id: branch_id || null,
        order_type: validTypes.includes(order_type) ? order_type : 'new',
        start_date: start_date || null,
        end_date: end_date || null,
        status: validStatuses.includes(status) ? status : 'open',
        installation_cost: installation_cost || 0,
        internal_transport_cost: internal_transport_cost || 0,
        external_transport_cost: external_transport_cost || 0,
        factory_commission: factory_commission || 0,
        notes: notes || null,
        created_by: user.id,
      },
    });

    auditLog({ user_id: user.id, action: 'create', table_name: 'orders', row_id: r.id, after: r });
    return NextResponse.json({ ok: true, data: r }, { status: 201 });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: e.status });
    console.error('Order create error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}
