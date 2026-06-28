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
    const offset = (page - 1) * limit;

    const where: any = { deleted_at: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.suppliers.findMany({ where, orderBy: { created_at: 'desc' }, skip: offset, take: limit }),
      prisma.suppliers.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items, total, page, limit },
    });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: '\u063a\u064a\u0631 \u0645\u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' } }, { status: e.status });
    console.error('Suppliers list error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || '\u062d\u062f\u062b \u062e\u0637\u0623' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, payment_type, phone, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u062f \u0645\u0637\u0644\u0648\u0628' } }, { status: 400 });
    }

    const paymentTypeMap: Record<string, string> = {
      cash: 'نقدي',
      transfer: 'آجل',
      both: 'نقدي وآجل',
    };
    const pt = paymentTypeMap[payment_type] || 'نقدي وآجل';

    const item = await prisma.suppliers.create({
      data: { name: name.trim(), payment_type: pt, phone: phone || null, notes: notes || null },
    });

    auditLog({ user_id: user.id, action: 'create', table_name: 'suppliers', row_id: item.id, after: item as any });

    return NextResponse.json({ ok: true, data: item }, { status: 201 });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: '\u063a\u064a\u0631 \u0645\u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' } }, { status: e.status });
    console.error('Supplier create error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || '\u062d\u062f\u062b \u062e\u0637\u0623' } }, { status: 500 });
  }
}
