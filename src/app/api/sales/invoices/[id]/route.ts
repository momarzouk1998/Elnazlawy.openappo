import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';

// GET /api/sales/invoices/[id] - جلب فاتورة بالتفاصيل
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const { id } = await params;
    const invoice = await prisma.sales_invoices.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, balance: true } },
        store: { select: { id: true, name: true } },
        creator: { select: { id: true, full_name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: { include: { treasury: { select: { id: true, name: true } } } },
      },
    });
    if (!invoice) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    return NextResponse.json({ ok: true, data: invoice });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}

// PATCH /api/sales/invoices/[id] - تعديل الفاتورة
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.sales_invoices.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

    // فقط المنشئ أو admin
    if (existing.created_by !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }

    const newStatus = body.status ?? existing.status;
    const isQuotation = (body.invoice_type ?? existing.invoice_type) === 'عرض سعر';
    const wasCompleted = existing.status === 'مكتملة';
    const isCompletedNow = newStatus === 'مكتملة';

    // لو مكتملة - مسموح بتعديل الحالة (إلغاء) والملاحظات والخصم فقط
    if (wasCompleted && (body.items !== undefined || body.invoice_type !== undefined)) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'لا يمكن تعديل بنود أو نوع فاتورة مكتملة. ألغِها أولاً.' } },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) تحديث البنود لو الحالة لم تكن مكتملة
      if (!wasCompleted && Array.isArray(body.items)) {
        const newItems = body.items as any[];

        // تحقق أساسي
        for (const it of newItems) {
          const q = Number(it.quantity);
          const p = Number(it.unit_price);
          if (!Number.isFinite(q) || q <= 0) throw new Error('كمية الصنف يجب أن تكون موجبة');
          if (!Number.isFinite(p) || p < 0) throw new Error('سعر الوحدة غير صالح');
        }

        // حذف البنود القديمة
        await tx.sales_invoice_items.deleteMany({ where: { invoice_id: id } });

        // Batch fetch products (تحسين N+1)
        const productIds = newItems.map(it => it.product_id);
        const products = await tx.products.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, last_purchase_price: true },
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // إضافة البنود الجديدة
        let subtotal = 0;
        const itemsToCreate = [];
        for (const it of newItems) {
          const product = productMap.get(it.product_id);
          if (!product) throw new Error('PRODUCT_NOT_FOUND');
          
          const line_total = Number(it.quantity) * Number(it.unit_price);
          subtotal += line_total;
          
          itemsToCreate.push({
            invoice_id: id,
            product_id: it.product_id,
            product_name: product.name,
            row_type: 'بيع',
            quantity: it.quantity,
            unit_price: it.unit_price,
            line_total,
            unit_cost: Number(product.last_purchase_price),
            line_cost: Number(it.quantity) * Number(product.last_purchase_price),
            store_id: it.store_id || existing.store_id,
          });
        }

        // Batch create items
        await tx.sales_invoice_items.createMany({ data: itemsToCreate });

        const discount = Number(body.discount ?? existing.discount ?? 0);
        const total = Math.max(0, subtotal - discount);

        // حساب الإجماليات
        await tx.sales_invoices.update({
          where: { id },
          data: { subtotal, discount, total },
        });

        // أعد تحميل البنود المحدّثة
        existing.items = await tx.sales_invoice_items.findMany({ where: { invoice_id: id } });
        existing.subtotal = subtotal as any;
        existing.discount = discount as any;
        existing.total = total as any;
      } else if (body.discount !== undefined) {
        // تعديل الخصم فقط
        const discount = Number(body.discount);
        const total = Math.max(0, Number(existing.subtotal) - discount);
        await tx.sales_invoices.update({
          where: { id },
          data: { discount, total },
        });
        existing.discount = discount as any;
        existing.total = total as any;
      }

      // 2) التعامل مع تغيير الحالة
      if (!wasCompleted && isCompletedNow && !isQuotation) {
        // من مسودة/قيد التنفيذ → مكتملة: تحقق من المخزون وخصمه + رصيد العميل
        
        // التحقق من المخزون أولاً (قبل أي تعديل)
        for (const it of existing.items) {
          if (!it.store_id) continue;
          const inv = await tx.inventory.findUnique({
            where: { product_id_store_id: { product_id: it.product_id, store_id: it.store_id } },
          });
          const available = inv ? Number(inv.current_stock) : 0;
          if (available < Number(it.quantity)) {
            throw new Error(`المخزون غير كافٍ للصنف "${it.product_name}" (متاح: ${available})`);
          }
        }
        
        // خصم المخزون
        for (const it of existing.items) {
          if (!it.store_id) continue;
          
          // Upsert inventory
          const inv = await tx.inventory.upsert({
            where: { product_id_store_id: { product_id: it.product_id, store_id: it.store_id } },
            update: {},
            create: { product_id: it.product_id, store_id: it.store_id, current_stock: 0 },
          });
          
          // Decrement stock
          await tx.inventory.update({
            where: { id: inv.id },
            data: { current_stock: { decrement: it.quantity } },
          });
        }
        
        // رصيد العميل
        if (existing.customer_id) {
          await tx.customers.update({
            where: { id: existing.customer_id },
            data: { balance: { increment: Number(existing.total) } },
          });
        }
      }

      // 3) تحديث الحالة/النوع/الملاحظات
      const updated = await tx.sales_invoices.update({
        where: { id },
        data: {
          status: newStatus,
          invoice_type: body.invoice_type ?? existing.invoice_type,
          notes: body.notes ?? existing.notes,
          updated_at: new Date(),
        },
      });

      return updated;
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    const msg = e?.message || 'حدث خطأ';
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: msg } }, { status: 500 });
  }
}

// DELETE /api/sales/invoices/[id] - إلغاء الفاتورة (إرجاع المخزون) أو حذف نهائي للأدمن
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    // الحذف النهائي للأدمن فقط
    if (permanent) {
      if (profile.role !== 'admin') {
        return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'الحذف النهائي للأدمن فقط' } }, { status: 403 });
      }

      // حذف نهائي بدون إرجاع مخزون (الأدمن مسؤول)
      await prisma.$transaction(async (tx) => {
        await tx.sales_invoice_items.deleteMany({ where: { invoice_id: id } });
        await tx.customer_payments.deleteMany({ where: { invoice_id: id } });
        await tx.sales_invoices.delete({ where: { id } });
      });

      return NextResponse.json({ ok: true, data: { message: 'تم حذف الفاتورة نهائياً' } });
    }

    // الإلغاء العادي (إرجاع المخزون)
    const invoice = await prisma.sales_invoices.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!invoice) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

    if (invoice.created_by !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
    }

    if (invoice.status === 'ملغاة') {
      return NextResponse.json({ ok: false, error: { code: 'ALREADY_CANCELLED' } }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // إرجاع المخزون لو كانت مكتملة
      if (invoice.status === 'مكتملة' && invoice.invoice_type !== 'عرض سعر') {
        for (const it of invoice.items) {
          if (!it.store_id) continue;
          await tx.inventory.upsert({
            where: { product_id_store_id: { product_id: it.product_id, store_id: it.store_id } },
            create: { product_id: it.product_id, store_id: it.store_id, current_stock: Number(it.quantity) },
            update: { current_stock: { increment: it.quantity } },
          });
        }
      }

      // إرجاع رصيد العميل
      if (invoice.customer_id && invoice.invoice_type !== 'عرض سعر') {
        await tx.customers.update({
          where: { id: invoice.customer_id },
          data: { balance: { decrement: Number(invoice.total) } },
        });
      }

      // تعليم الفاتورة كملغاة
      await tx.sales_invoices.update({
        where: { id },
        data: {
          status: 'ملغاة',
          void_reason: 'إلغاء يدوي',
          updated_at: new Date(),
        },
      });
    });

    return NextResponse.json({ ok: true, data: { message: 'تم إلغاء الفاتورة وإرجاع المخزون' } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
