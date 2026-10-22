import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET() {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const [stores, inventory, categoriesRaw] = await Promise.all([
      prisma.stores.findMany({
        where: { is_active: true },
        select: { id: true, name: true },
      }),
      prisma.inventory.findMany({
        select: {
          store_id: true,
          current_stock: true,
          product: { select: { last_purchase_price: true } },
        },
      }),
      prisma.products.findMany({
        where: { is_active: true, category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      }),
    ]);

    const summaryMap = new Map();
    for (const store of stores) {
      summaryMap.set(store.id, {
        id: store.id,
        name: store.name,
        total_items: 0,
        total_qty: 0,
        total_value: 0
      });
    }

    for (const item of inventory) {
      const s = summaryMap.get(item.store_id);
      if (s) {
        const qty = Number(item.current_stock || 0);
        if (qty > 0) {
          s.total_items += 1;
        }
        s.total_qty += qty;
        if (profile.can_see_cost && qty > 0) {
          s.total_value += qty * Number(item.product?.last_purchase_price || 0);
        }
      }
    }

    const summary = Array.from(summaryMap.values());
    const overall = summary.reduce((acc, curr) => {
      acc.total_items += curr.total_items;
      acc.total_qty += curr.total_qty;
      acc.total_value += curr.total_value;
      return acc;
    }, { total_items: 0, total_qty: 0, total_value: 0 });

    const categories = Array.from(
      new Set(categoriesRaw.map(c => c.category?.trim()).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b, 'ar'));

    return NextResponse.json(
      { ok: true, data: { stores: summary, overall, categories } },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
