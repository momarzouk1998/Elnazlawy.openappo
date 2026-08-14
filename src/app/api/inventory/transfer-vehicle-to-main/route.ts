import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma-direct';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const execute = searchParams.get('execute') === '1';

  try {
    const stores = await prisma.stores.findMany({
      orderBy: { name: 'asc' }
    });

    const inventory = await prisma.inventory.findMany({
      include: {
        product: true,
        store: true
      }
    });

    function calculateStoreStats(storeId: string) {
      const items = inventory.filter(i => i.store_id === storeId);
      const positiveItems = items.filter(i => Number(i.current_stock || 0) > 0);
      const totalQty = items.reduce((sum, i) => sum + Number(i.current_stock || 0), 0);
      const totalValue = items.reduce((sum, i) => {
        const qty = Number(i.current_stock || 0);
        const price = Number(i.product?.last_purchase_price || 0);
        return sum + (qty > 0 ? qty * price : 0);
      }, 0);

      return {
        total_registered_items: items.length,
        positive_stock_items: positiveItems.length,
        total_quantity: totalQty,
        total_cost_value: totalValue,
      };
    }

    const initialStats = stores.map(store => ({
      store_id: store.id,
      store_name: store.name,
      type: store.type,
      is_active: store.is_active,
      stats: calculateStoreStats(store.id),
    }));

    const vehicleStore = stores.find(s => s.name.includes('عربية كبيرة') || s.name.includes('العربية الكبيرة'));
    const mainStore = stores.find(s => s.name.includes('المخزن الرئيسي') || s.name.includes('رئيسي'));

    if (!vehicleStore || !mainStore) {
      return NextResponse.json({
        ok: false,
        error: 'لم يتم العثور على مخزن العربية الكبيرة أو المخزن الرئيسي',
        stores,
        initialStats
      });
    }

    let transferResult = null;

    if (execute) {
      const vehicleItems = inventory.filter(i => i.store_id === vehicleStore.id && Number(i.current_stock) > 0);

      let transferredCount = 0;
      let totalQtyTransferred = 0;
      let totalValueTransferred = 0;

      for (const vItem of vehicleItems) {
        const qtyToTransfer = Number(vItem.current_stock);
        const price = Number(vItem.product?.last_purchase_price || 0);
        if (qtyToTransfer <= 0) continue;

        await prisma.$transaction(async (tx) => {
          // 1. تصفير رصيد الصنف في العربية الكبيرة
          await tx.inventory.update({
            where: { id: vItem.id },
            data: { current_stock: 0 }
          });

          // 2. زيادة الرصيد في المخزن الرئيسي (upsert)
          await tx.inventory.upsert({
            where: {
              product_id_store_id: {
                product_id: vItem.product_id,
                store_id: mainStore.id
              }
            },
            update: {
              current_stock: { increment: qtyToTransfer }
            },
            create: {
              product_id: vItem.product_id,
              store_id: mainStore.id,
              current_stock: qtyToTransfer,
              reorder_level: vItem.reorder_level || 5
            }
          });

          // 3. تسجيل حركة تحويل مخزني رسمية
          await tx.stock_transfers.create({
            data: {
              from_store_id: vehicleStore.id,
              to_store_id: mainStore.id,
              product_id: vItem.product_id,
              product_name: vItem.product?.name || '',
              quantity: qtyToTransfer,
              status: 'مكتملة',
              notes: 'تحويل شامل وتجميع لكافة الأصناف للمخزن الرئيسي بناءً على طلب الإدارة'
            }
          });
        });

        transferredCount++;
        totalQtyTransferred += qtyToTransfer;
        totalValueTransferred += (qtyToTransfer * price);
      }

      transferResult = {
        transferred_items_count: transferredCount,
        total_qty_transferred: totalQtyTransferred,
        total_value_transferred: totalValueTransferred,
      };
    }

    // جلب البيانات المحدثة بعد التحويل
    const updatedInventory = await prisma.inventory.findMany({
      include: { product: true, store: true }
    });

    function calculateUpdatedStats(storeId: string) {
      const items = updatedInventory.filter(i => i.store_id === storeId);
      const positiveItems = items.filter(i => Number(i.current_stock || 0) > 0);
      const totalQty = items.reduce((sum, i) => sum + Number(i.current_stock || 0), 0);
      const totalValue = items.reduce((sum, i) => {
        const qty = Number(i.current_stock || 0);
        const price = Number(i.product?.last_purchase_price || 0);
        return sum + (qty > 0 ? qty * price : 0);
      }, 0);

      return {
        total_registered_items: items.length,
        positive_stock_items: positiveItems.length,
        total_quantity: totalQty,
        total_cost_value: totalValue,
      };
    }

    const finalStats = stores.map(store => ({
      store_id: store.id,
      store_name: store.name,
      type: store.type,
      stats: calculateUpdatedStats(store.id),
    }));

    return NextResponse.json({
      ok: true,
      executed: execute,
      transferResult,
      initialStats,
      finalStats,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Error occurred' }, { status: 500 });
  }
}
