import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * One-time fix:
 * 1. Recalculate quantity_used, quantity_remaining, total_price from actual order_materials
 * 2. Create missing journal entries for inventory purchases that were never recorded
 *
 * Call: GET /api/fix-inventory (requires admin login)
 */
export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "أدمن فقط" }, { status: 403 });
    }

    // ===== 1) إصلاح quantity_remaining من order_materials =====
    const boardsUsed = await prisma.$queryRawUnsafe<{ item_id: string; total_used: string }[]>(`
      SELECT item_id, SUM(quantity_used)::numeric AS total_used
      FROM mazaya.order_materials
      WHERE item_category = 'boards_inventory'
      GROUP BY item_id
    `);

    let boardsFixed = 0;
    for (const row of boardsUsed) {
      const used = Number(row.total_used);
      if (used > 0) {
        const r = await prisma.$executeRawUnsafe(`
          UPDATE mazaya.boards_inventory
          SET quantity_used = $1,
              quantity_remaining = GREATEST(quantity_in - $1, 0),
              total_price = GREATEST(quantity_in - $1, 0) * unit_price
          WHERE id = $2::uuid AND deleted_at IS NULL
        `, used, row.item_id);
        boardsFixed += r;
      }
    }

    // Boards with NO materials but quantity_remaining = 0 and quantity_in > 0
    const boardsNoMaterials = await prisma.$executeRawUnsafe(`
      UPDATE mazaya.boards_inventory
      SET quantity_remaining = quantity_in,
          total_price = quantity_in * unit_price
      WHERE deleted_at IS NULL
        AND quantity_remaining = 0
        AND quantity_in > 0
        AND id NOT IN (SELECT item_id FROM mazaya.order_materials WHERE item_category = 'boards_inventory')
    `);
    boardsFixed += boardsNoMaterials;

    // Same for accessories
    const accUsed = await prisma.$queryRawUnsafe<{ item_id: string; total_used: string }[]>(`
      SELECT item_id, SUM(quantity_used)::numeric AS total_used
      FROM mazaya.order_materials
      WHERE item_category = 'accessories_inventory'
      GROUP BY item_id
    `);

    let accFixed = 0;
    for (const row of accUsed) {
      const used = Number(row.total_used);
      if (used > 0) {
        const r = await prisma.$executeRawUnsafe(`
          UPDATE mazaya.accessories_inventory
          SET quantity_used = $1,
              quantity_remaining = GREATEST(quantity_in - $1, 0),
              total_price = GREATEST(quantity_in - $1, 0) * unit_price
          WHERE id = $2::uuid AND deleted_at IS NULL
        `, used, row.item_id);
        accFixed += r;
      }
    }

    const accNoMaterials = await prisma.$executeRawUnsafe(`
      UPDATE mazaya.accessories_inventory
      SET quantity_remaining = quantity_in,
          total_price = quantity_in * unit_price
      WHERE deleted_at IS NULL
        AND quantity_remaining = 0
        AND quantity_in > 0
        AND id NOT IN (SELECT item_id FROM mazaya.order_materials WHERE item_category = 'accessories_inventory')
    `);
    accFixed += accNoMaterials;

    // ===== 2) إنشاء journal entries للمشتريات القديمة اللي مش مسجلة =====
    // نلاقي كل inventory items اللي اتباعوا (quantity_in > 0) ومش لهم journal entry
    const missingBoards = await prisma.$queryRawUnsafe<any[]>(`
      SELECT bi.id, bi.item_name, bi.quantity_in, bi.unit_price, bi.date_added, bi.supplier_id,
             bi.quantity_in * bi.unit_price AS total_cost
      FROM mazaya.boards_inventory bi
      WHERE bi.deleted_at IS NULL AND bi.quantity_in > 0
        AND NOT EXISTS (
          SELECT 1 FROM mazaya.journal_entries je
          WHERE je.entry_type = 'مشتريات'
            AND je.description LIKE '%' || bi.item_name || '%'
            AND je.created_at >= bi.created_at
        )
    `);

    const missingAcc = await prisma.$queryRawUnsafe<any[]>(`
      SELECT ai.id, ai.item_name, ai.quantity_in, ai.unit_price, ai.date_added, ai.supplier_id,
             ai.quantity_in * ai.unit_price AS total_cost
      FROM mazaya.accessories_inventory ai
      WHERE ai.deleted_at IS NULL AND ai.quantity_in > 0
        AND NOT EXISTS (
          SELECT 1 FROM mazaya.journal_entries je
          WHERE je.entry_type = 'مشتريات'
            AND je.description LIKE '%' || ai.item_name || '%'
        )
    `);

    const missingAll = [...missingBoards, ...missingAcc];
    let journalCreated = 0;

    for (const item of missingAll) {
      const cost = Number(item.total_cost);
      if (cost <= 0) continue;

      try {
        await prisma.journal_entries.create({
          data: {
            date: item.date_added || new Date(),
            entry_type: "مشتريات",
            description: "شراء " + Number(item.quantity_in) + " " + item.item_name,
            amount: cost,
            payment_method: "نقدي",
            party_type: item.supplier_id ? "supplier" : null,
            party_id: item.supplier_id || null,
            notes: "إصلاح تلقائي: بيانات شراء قديمة لم تكن مسجلة في اليومية",
            created_by: user.id,
          },
        });
        journalCreated++;
      } catch (e: any) {
        // Skip duplicates silently
      }
    }

    // ===== 3) Verify =====
    const boardsSample = await prisma.$queryRawUnsafe<any[]>(
      `SELECT item_name, quantity_in, quantity_used, quantity_remaining, total_price, unit_price FROM mazaya.boards_inventory WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 10`
    );

    return NextResponse.json({
      ok: true,
      message: "تم إصلاح المخزون + اليومية",
      inventoryFixed: { boards: boardsFixed, accessories: accFixed },
      journalEntriesCreated: journalCreated,
      sample: boardsSample.map((b: any) => ({
        name: b.item_name,
        qtyIn: Number(b.quantity_in),
        qtyUsed: Number(b.quantity_used),
        remaining: Number(b.quantity_remaining),
        total: Number(b.total_price),
        price: Number(b.unit_price),
      })),
    });
  } catch (e: any) {
    console.error("Fix inventory error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "حدث خطأ" }, { status: 500 });
  }
}
