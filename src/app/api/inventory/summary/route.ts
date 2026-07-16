import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET() {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const stores = await prisma.stores.findMany({
      where: { is_active: true },
      select: { id: true, name: true }
    });

    const inventory = await prisma.inventory.findMany({
      include: {
        product: { select: { last_purchase_price: true } }
      }
    });

    const summaryMap = new Map();
    for (const store of stores) {
      summaryMap.set(store.id, {
        store_id: store.id,
        store_name: store.name,
        total_items: 0,
        total_qty: 0,
        total_value: 0
      });
    }

    for (const item of inventory) {
      const s = summaryMap.get(item.store_id);
      if (s) {
        const qty = Number(item.current_stock);
        if (qty > 0) {
           s.total_items += 1;
           s.total_qty += qty;
           if (profile.can_see_cost) {
             s.total_value += qty * Number(item.product?.last_purchase_price || 0);
           }
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

    return NextResponse.json({ ok: true, data: { stores: summary, overall } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
