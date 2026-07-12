import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET() {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  const checks = await prisma.checks.findMany({
    orderBy: { due_date: 'asc' },
    take: 200,
  });
  return NextResponse.json({ ok: true, data: checks });
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  try {
    const body = await request.json();
    const check = await prisma.checks.create({
      data: {
        direction: body.direction || 'incoming',
        bank_name: body.bank_name || null,
        check_number: body.check_number || null,
        amount: body.amount,
        issue_date: new Date(body.issue_date),
        due_date: new Date(body.due_date),
        status: 'تحت التحصيل',
        customer_id: body.customer_id || null,
        supplier_id: body.supplier_id || null,
        notes: body.notes || null,
        created_by: profile.id,
      },
    });
    return NextResponse.json({ ok: true, data: check });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
