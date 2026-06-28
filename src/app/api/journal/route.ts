import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import prisma from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const entry_type = searchParams.get('entry_type') || '';
    const payment_method = searchParams.get('payment_method') || '';
    const date_from = searchParams.get('date_from') || '';
    const date_to = searchParams.get('date_to') || '';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    const where: any = {};
    if (entry_type) where.entry_type = entry_type;
    if (payment_method) where.payment_method = payment_method;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from);
      if (date_to) where.date.lte = new Date(date_to);
    }
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const total = await prisma.journal_entries.count({ where });

    const conditions: string[] = ['1=1'];
    const rawParams: any[] = [];
    let paramIdx = 1;

    if (entry_type) {
      conditions.push(`je.entry_type = $${paramIdx++}`);
      rawParams.push(entry_type);
    }
    if (payment_method) {
      conditions.push(`je.payment_method = $${paramIdx++}`);
      rawParams.push(payment_method);
    }
    if (date_from) {
      conditions.push(`je.date >= $${paramIdx++}`);
      rawParams.push(date_from);
    }
    if (date_to) {
      conditions.push(`je.date <= $${paramIdx++}`);
      rawParams.push(date_to);
    }
    if (search) {
      conditions.push(`je.description ILIKE $${paramIdx++}`);
      rawParams.push(`%${search}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const entries: any[] = await prisma.$queryRawUnsafe(
      `SELECT je.*,
        CASE
          WHEN je.party_type = 'supplier' THEN s.name
          WHEN je.party_type = 'branch' THEN b.name
          WHEN je.party_type = 'contractor' THEN c.name
          ELSE NULL
        END as party_name
       FROM mazaya.journal_entries je
       LEFT JOIN mazaya.suppliers s ON je.party_type = 'supplier' AND je.party_id = s.id
       LEFT JOIN mazaya.branches b ON je.party_type = 'branch' AND je.party_id = b.id
       LEFT JOIN mazaya.contractors c ON je.party_type = 'contractor' AND je.party_id = c.id
       ${whereClause}
       ORDER BY je.date DESC, je.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...rawParams, limit, offset
    );

    const serialized = entries.map((e: any) => ({ ...e, amount: Number(e.amount) }));

    return NextResponse.json({
      ok: true,
      data: {
        entries: serialized,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { description, amount, entry_type, payment_method, party_type, party_id, order_id, date } = body;

    if (!description || description.trim() === '') {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'الوصف مطلوب' } },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' } },
        { status: 400 }
      );
    }

    const validEntryTypes = ['purchase', 'incoming_from_branch', 'outgoing_to_supplier', 'transfer', 'overhead'];
    if (!entry_type || !validEntryTypes.includes(entry_type)) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'نوع القيد غير صالح' } },
        { status: 400 }
      );
    }

    if (payment_method && !['cash', 'transfer'].includes(payment_method)) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'طريقة الدفع غير صالحة' } },
        { status: 400 }
      );
    }

    if (party_type && !['supplier', 'branch', 'contractor'].includes(party_type)) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'نوع الطرف غير صالح' } },
        { status: 400 }
      );
    }

    const entry = await prisma.journal_entries.create({
      data: {
        date: date ? new Date(date) : new Date(),
        entry_type,
        description: description.trim(),
        amount,
        payment_method: payment_method || null,
        party_type: party_type || null,
        party_id: party_id ? parseInt(party_id) : null,
        order_id: order_id ? parseInt(order_id) : null,
        created_by: user.id,
      },
    });

    auditLog({ user_id: user.id, action: 'create', table_name: 'journal_entries', row_id: entry.id, after: entry });

    return NextResponse.json({ ok: true, data: { ...entry, amount: Number(entry.amount) } }, { status: 201 });
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل الدخول' } }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'غير مصرح' } }, { status: 403 });
    console.error('Error:', e);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'حدث خطأ' } }, { status: 500 });
  }
}
