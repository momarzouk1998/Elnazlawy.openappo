import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { hashPassword } from '@/lib/db/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'غير مسجل' } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const category = searchParams.get('category') || '';
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: Prisma.productsWhereInput = { is_active: true };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (category) where.category = category;

  const [items, total] = await Promise.all([
    prisma.products.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
      include: {
        inventory_items: { select: { current_stock: true, store_id: true, store: { select: { name: true } } } },
      },
    }),
    prisma.products.count({ where }),
  ]);

  // Augment with total stock
  const augmented = items.map(p => ({
    ...p,
    total_stock: p.inventory_items.reduce((sum, i) => sum + Number(i.current_stock), 0),
    // Hide cost for non-privileged
    last_purchase_price: profile.can_see_cost ? p.last_purchase_price : null,
  }));

  return NextResponse.json({ ok: true, data: { items: augmented, total, limit, offset } });
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const body = await request.json();
    const product = await prisma.products.create({
      data: {
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        unit: body.unit || 'piece',
        units_per_carton: body.units_per_carton || 1,
        barcode: body.barcode || null,
        default_sale_price: body.default_sale_price || 0,
        reorder_level: body.reorder_level || 5,
        notes: body.notes || null,
        last_purchase_price: body.last_purchase_price || 0,
      },
    });
    return NextResponse.json({ ok: true, data: product });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
