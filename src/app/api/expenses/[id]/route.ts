import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth-server";

// PATCH /api/expenses/[id] — تعديل مصروف (بحذر)
// قواعد:
//   - نفس اليوم فقط (created_at تاريخ اليوم) - لتفادي تعديل مصروف قديم بأثر رصيد خاطئ
//   - لا نسمح بتغيير الخزينة (لتجنب حركة معقدة) - يمكن حذف وإنشاء جديد
//   - المبلغ/الوصف/الفئة/التاريخ فقط
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (profile.role === "rep") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "لا تملك صلاحية التعديل" } }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.expenses.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "المصروف غير موجود" } }, { status: 404 });

    // نفس اليوم فقط
    const today = new Date();
    const expDate = new Date(existing.created_at);
    const isSameDay = expDate.toDateString() === today.toDateString();
    if (!isSameDay) {
      return NextResponse.json(
        { ok: false, error: { code: "EDIT_EXPIRED", message: "لا يمكن تعديل مصروف من يوم آخر. احذفه وأنشئ واحداً جديداً." } },
        { status: 400 }
      );
    }

    if (body.amount !== undefined) {
      const newAmt = Number(body.amount);
      if (!Number.isFinite(newAmt) || newAmt <= 0) {
        return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "المبلغ غير صالح" } }, { status: 400 });
      }
    }
    if (body.category !== undefined && !String(body.category).trim()) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "الفئة مطلوبة" } }, { status: 400 });
    }
    if (body.description !== undefined && !String(body.description).trim()) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "الوصف مطلوب" } }, { status: 400 });
    }

    // تعديل المبلغ يتطلب تعديل حركة الخزينة
    if (body.amount !== undefined && Number(body.amount) !== Number(existing.amount)) {
      const newAmt = Number(body.amount);
      const diff = newAmt - Number(existing.amount);

      return await prisma.$transaction(async (tx) => {
        const treasury = await tx.treasuries.findUnique({ where: { id: existing.treasury_id } });
        if (!treasury) throw new Error("الخزينة غير موجودة");
        // لو الفرق زيادة، لازم الرصيد يكفي
        if (diff > 0 && Number(treasury.current_balance) < diff) {
          throw new Error("رصيد الخزينة غير كافي لتعديل المصروف");
        }

        const updated = await tx.expenses.update({
          where: { id },
          data: {
            ...(body.category !== undefined && { category: String(body.category).trim() }),
            ...(body.description !== undefined && { description: String(body.description).trim() }),
            amount: newAmt,
            ...(body.payment_method !== undefined && { payment_method: body.payment_method }),
            ...(body.expense_date !== undefined && { expense_date: new Date(body.expense_date) }),
            ...(body.notes !== undefined && { notes: body.notes || null }),
          },
        });

        // تعديل رصيد الخزينة بحسب الفرق
        await tx.treasuries.update({
          where: { id: existing.treasury_id },
          data: { current_balance: { decrement: diff } },
        });

        // تحديث حركة الخزينة المرتبطة
        await tx.treasury_transactions.updateMany({
          where: { reference_type: "expense", reference_id: id },
          data: { amount: newAmt },
        });

        return NextResponse.json({ ok: true, data: updated });
      });
    }

    const updated = await prisma.expenses.update({
      where: { id },
      data: {
        ...(body.category !== undefined && { category: String(body.category).trim() }),
        ...(body.description !== undefined && { description: String(body.description).trim() }),
        ...(body.payment_method !== undefined && { payment_method: body.payment_method }),
        ...(body.expense_date !== undefined && { expense_date: new Date(body.expense_date) }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
      },
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: "DB_ERROR", message: e?.message || "حدث خطأ" } }, { status: 500 });
  }
}

// DELETE /api/expenses/[id] — حذف مصروف + إرجاع المبلغ للخزينة
// قواعد:
//   - نفس اليوم فقط
//   - لا يحذف لو حركة الخزينة المرتبطة تم استخدامها في تقرير مُغلق (لم نطبق التقارير المُغلقة بعد، فمسموح)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (profile.role === "rep") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "لا تملك صلاحية الحذف" } }, { status: 403 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.expenses.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "المصروف غير موجود" } }, { status: 404 });

    // نفس اليوم فقط
    const today = new Date();
    const expDate = new Date(existing.created_at);
    const isSameDay = expDate.toDateString() === today.toDateString();
    if (!isSameDay) {
      return NextResponse.json(
        { ok: false, error: { code: "DELETE_EXPIRED", message: "لا يمكن حذف مصروف من يوم آخر (أثر على تقارير مغلقة). اتصل بالمدير." } },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. إرجاع المبلغ للخزينة
      await tx.treasuries.update({
        where: { id: existing.treasury_id },
        data: { current_balance: { increment: Number(existing.amount) } },
      });
      // 2. حذف حركة الخزينة المرتبطة
      await tx.treasury_transactions.deleteMany({
        where: { reference_type: "expense", reference_id: id },
      });
      // 3. حذف المصروف
      await tx.expenses.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true, data: { deleted: true, amount: Number(existing.amount) } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: "DB_ERROR", message: e?.message || "حدث خطأ" } }, { status: 500 });
  }
}
