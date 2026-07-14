import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth-server";
import { Prisma } from "@prisma/client";

// GET /api/transfers — قائمة التحويلات المخزنية
export async function GET(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fromStore = searchParams.get("from_store_id") || "";
  const toStore = searchParams.get("to_store_id") || "";
  const status = searchParams.get("status") || "";
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  const where: Prisma.stock_transfersWhereInput = {};
  if (fromStore) where.from_store_id = fromStore;
  if (toStore) where.to_store_id = toStore;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.stock_transfers.findMany({
      where,
      orderBy: { transfer_date: "desc" },
      take: limit,
      skip: offset,
      include: {
        from_store: { select: { id: true, name: true } },
        to_store: { select: { id: true, name: true } },
        by_user: { select: { id: true, full_name: true } },
      },
    }),
    prisma.stock_transfers.count({ where }),
  ]);

  return NextResponse.json({ ok: true, data: { items, total, limit, offset } });
}

// POST /api/transfers — تحويل مخزني (transaction: خصم من مخزن + إضافة لآخر)
export async function POST(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

  try {
    const body = await request.json();
    const { product_id, from_store_id, to_store_id, quantity, notes, transfer_date } = body;

    if (!product_id || !from_store_id || !to_store_id || !quantity) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "المنتج والمخزنين والكمية مطلوبة" } },
        { status: 400 }
      );
    }
    if (from_store_id === to_store_id) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "لا يمكن التحويل لنفس المخزن" } }, { status: 400 });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "الكمية يجب أن تكون رقم موجب" } }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. تحقق من توفر الكمية في المخزن المصدر
      const sourceInv = await tx.inventory.findUnique({
        where: { product_id_store_id: { product_id, store_id: from_store_id } },
      });
      if (!sourceInv || Number(sourceInv.current_stock) < qty) {
        const available = sourceInv ? Number(sourceInv.current_stock) : 0;
        throw new Error(`الكمية غير متوفرة في المخزن المصدر (متاح: ${available})`);
      }

      // 2. اسم المنتج (snapshot)
      const product = await tx.products.findUnique({ where: { id: product_id }, select: { name: true } });
      if (!product) throw new Error("المنتج غير موجود");

      // 3. خصم من المخزن المصدر
      await tx.inventory.update({
        where: { product_id_store_id: { product_id, store_id: from_store_id } },
        data: { current_stock: { decrement: qty } },
      });

      // 4. إضافة للمخزن الوجهة (upsert لأنه ممكن يكون أول مرة)
      await tx.inventory.upsert({
        where: { product_id_store_id: { product_id, store_id: to_store_id } },
        update: { current_stock: { increment: qty } },
        create: { product_id, store_id: to_store_id, current_stock: qty, opening_balance: 0 },
      });

      // 5. سجل التحويل
      const transfer = await tx.stock_transfers.create({
        data: {
          product_id,
          product_name: product.name,
          from_store_id,
          to_store_id,
          quantity: qty,
          status: "مكتملة",
          notes: notes || null,
          by_user_id: profile.id,
          transfer_date: transfer_date ? new Date(transfer_date) : new Date(),
        },
      });

      return transfer;
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    const status = e?.message?.includes("غير متوفرة") ? 400 : 500;
    return NextResponse.json({ ok: false, error: { code: "DB_ERROR", message: e?.message || "حدث خطأ" } }, { status });
  }
}
