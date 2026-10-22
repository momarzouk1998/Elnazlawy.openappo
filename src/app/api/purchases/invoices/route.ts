import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplier_id') || '';
  const limit = parseInt(searchParams.get('limit') || '50');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;
  const where = supplierId ? { supplier_id: supplierId } : {};

  const [items, total] = await Promise.all([
    prisma.purchase_invoices.findMany({
      where,
      orderBy: { purchase_number: 'desc' },
      take: limit,
      skip: offset,
      include: {
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.purchase_invoices.count({ where }),
  ]);
  return NextResponse.json({ ok: true, data: { items, total, limit, page } });
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  try {
    const body = await request.json();
    const { items, ...purchaseData } = body;

    // === فاليديشن أساسي ===
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'الفاتورة يجب أن تحتوي على صنف واحد على الأقل' } }, { status: 400 });
    }
    for (const it of items) {
      const qty = Number(it.quantity);
      const cost = Number(it.unit_cost);
      if (!Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'كل صنف يجب أن تكون كميته موجبة' } }, { status: 400 });
      }
      if (!Number.isFinite(cost) || cost < 0) {
        return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'سعر الشراء غير صالح' } }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const maxN = await tx.purchase_invoices.aggregate({ _max: { purchase_number: true } });
      const purchase_number = (maxN._max.purchase_number || 0) + 1;
      const status = purchaseData.status || 'مكتملة';
      const willBeCompleted = status === 'مكتملة';

      const invoice = await tx.purchase_invoices.create({
        data: {
          purchase_number,
          purchase_date: purchaseData.purchase_date ? new Date(purchaseData.purchase_date) : new Date(),
          supplier_id: purchaseData.supplier_id || null,
          status,
          total_amount: purchaseData.total_amount || 0,
          notes: purchaseData.notes || null,
          created_by: profile.id,
        },
      });
      // Batch fetch كل الأصناف في استعلام واحد بدلاً من N استعلام متتالي
      const productIds = Array.from(new Set(items.map((it: any) => it.product_id)));
      const products = await tx.products.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, last_purchase_price: true },
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      const purchaseItemsToCreate: any[] = [];
      const priceHistoryToCreate: any[] = [];
      const productPriceUpdates = new Map<string, number>();
      const inventoryIncrements = new Map<string, { product_id: string; store_id: string; qty: number }>();

      for (const it of items) {
        const product = productMap.get(it.product_id);
        if (!product) continue;

        purchaseItemsToCreate.push({
          purchase_id: invoice.id,
          product_id: it.product_id,
          product_name: product.name,
          row_type: 'شراء',
          quantity: it.quantity,
          unit_cost: it.unit_cost,
          line_total: Number(it.quantity) * Number(it.unit_cost),
          store_id: it.store_id,
        });

        if (willBeCompleted && Number(it.unit_cost) !== Number(product.last_purchase_price)) {
          priceHistoryToCreate.push({
            product_id: it.product_id,
            old_price: product.last_purchase_price,
            new_price: it.unit_cost,
            supplier_id: purchaseData.supplier_id,
            purchase_id: invoice.id,
          });
          productPriceUpdates.set(it.product_id, it.unit_cost);
        }

        if (willBeCompleted && it.store_id) {
          const key = `${it.product_id}::${it.store_id}`;
          const prev = inventoryIncrements.get(key);
          if (prev) prev.qty += Number(it.quantity);
          else inventoryIncrements.set(key, { product_id: it.product_id, store_id: it.store_id, qty: Number(it.quantity) });
        }
      }

      if (purchaseItemsToCreate.length > 0) {
        await tx.purchase_invoice_items.createMany({ data: purchaseItemsToCreate });
      }
      if (priceHistoryToCreate.length > 0) {
        await tx.product_price_history.createMany({ data: priceHistoryToCreate });
      }
      if (productPriceUpdates.size > 0) {
        const now = new Date();
        await Promise.all(
          Array.from(productPriceUpdates.entries()).map(([prodId, newCost]) =>
            tx.products.update({
              where: { id: prodId },
              data: { last_purchase_price: newCost, last_purchase_date: now },
            })
          )
        );
      }
      if (inventoryIncrements.size > 0) {
        await Promise.all(
          Array.from(inventoryIncrements.values()).map(inc =>
            tx.inventory.upsert({
              where: { product_id_store_id: { product_id: inc.product_id, store_id: inc.store_id } },
              create: { product_id: inc.product_id, store_id: inc.store_id, current_stock: inc.qty },
              update: { current_stock: { increment: inc.qty } },
            })
          )
        );
      }
      // Update supplier balance
      if (willBeCompleted && purchaseData.supplier_id) {
        await tx.suppliers.update({
          where: { id: purchaseData.supplier_id },
          data: { balance: { increment: purchaseData.total_amount || 0 } },
        });
      }
      return invoice;
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
