import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id') || '';
  const type = searchParams.get('type') || ''; // عرض سعر | عادية | ضريبية
  const status = searchParams.get('status') || '';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: Prisma.sales_invoicesWhereInput = {};
  if (customerId) where.customer_id = customerId;
  if (type) where.invoice_type = type;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.sales_invoices.findMany({
      where,
      orderBy: { invoice_number: 'desc' },
      take: limit,
      skip: offset,
      include: {
        customer: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
        creator: { select: { id: true, full_name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.sales_invoices.count({ where }),
  ]);

  return NextResponse.json({ ok: true, data: { items, total, limit, offset } });
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentUser();
  if (!profile) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  try {
    const body = await request.json();
    const { items: invoiceItems, ...invoiceData } = body;

    // === Validate inventory availability ===
    for (const item of invoiceItems) {
      if (invoiceData.invoice_type === 'عرض سعر' || invoiceData.invoice_type === 'Quotation') continue;
      if (item.row_type !== 'بيع') continue;
      const inv = await prisma.inventory.findUnique({
        where: { product_id_store_id: { product_id: item.product_id, store_id: item.store_id } },
      });
      if (!inv || Number(inv.current_stock) < Number(item.quantity)) {
        const available = inv ? Number(inv.current_stock) : 0;
        return NextResponse.json(
          { ok: false, error: { code: 'INSUFFICIENT_STOCK', message: `الصنف غير متوفر بالكمية المطلوبة (متاح: ${available})` } },
          { status: 400 }
        );
      }
    }

    // === Transaction: invoice + items + stock decrement + customer balance ===
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get next invoice number
      const maxInv = await tx.sales_invoices.aggregate({ _max: { invoice_number: true } });
      const invoice_number = (maxInv._max.invoice_number || 0) + 1;

      // 2. Per-customer sequence
      let customer_seq = 0;
      if (invoiceData.customer_id) {
        const maxCust = await tx.sales_invoices.aggregate({
          where: { customer_id: invoiceData.customer_id },
          _max: { customer_seq: true },
        });
        customer_seq = (maxCust._max.customer_seq || 0) + 1;
      }

      // 3. Create invoice
      const invoice = await tx.sales_invoices.create({
        data: {
          invoice_number,
          invoice_date: invoiceData.invoice_date ? new Date(invoiceData.invoice_date) : new Date(),
          customer_seq,
          customer_id: invoiceData.customer_id || null,
          store_id: invoiceData.store_id || null,
          invoice_type: invoiceData.invoice_type || 'عادية',
          status: 'مكتملة',
          subtotal: invoiceData.subtotal || 0,
          discount: invoiceData.discount || 0,
          total: invoiceData.total || 0,
          notes: invoiceData.notes || null,
          created_by: profile.id,
          salesperson: profile.full_name,
        },
      });

      let totalCost = 0;

      // 4. Create items + decrement stock
      for (const item of invoiceItems) {
        const product = await tx.products.findUnique({ where: { id: item.product_id } });
        if (!product) throw new Error('PRODUCT_NOT_FOUND');

        const line_total = Number(item.quantity) * Number(item.unit_price);
        const unit_cost = Number(product.last_purchase_price);
        const line_cost = Number(item.quantity) * unit_cost;
        totalCost += line_cost;

        await tx.sales_invoice_items.create({
          data: {
            invoice_id: invoice.id,
            product_id: item.product_id,
            product_name: product.name,
            row_type: item.row_type || 'بيع',
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total,
            unit_cost,
            line_cost,
            store_id: item.store_id,
          },
        });

        // Decrement inventory (only for sales, not for quotations)
        if (invoiceData.invoice_type !== 'عرض سعر' && item.row_type === 'بيع') {
          const inv = await tx.inventory.upsert({
            where: { product_id_store_id: { product_id: item.product_id, store_id: item.store_id } },
            update: {},
            create: { product_id: item.product_id, store_id: item.store_id, current_stock: 0 },
          });
          await tx.inventory.update({
            where: { id: inv.id },
            data: { current_stock: { decrement: item.quantity } },
          });
        }
      }

      // 5. Net profit
      const net_profit = Number(invoiceData.total || 0) - totalCost;
      await tx.sales_invoices.update({
        where: { id: invoice.id },
        data: { net_profit },
      });

      // 6. Customer balance
      if (invoiceData.customer_id && invoiceData.invoice_type !== 'عرض سعر') {
        await tx.customers.update({
          where: { id: invoiceData.customer_id },
          data: { balance: { increment: invoiceData.total || 0 } },
        });
      }

      return invoice;
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: e?.message } }, { status: 500 });
  }
}
