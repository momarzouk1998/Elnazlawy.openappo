import { getCurrentUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { formatEGP, formatDate } from "@/lib/format";
import { StatementsClient } from "./StatementsClient";

export const dynamic = 'force-dynamic';

interface SearchParams {
  type?: 'customer' | 'supplier';
  id?: string;
}

export default async function StatementsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const profile = await getCurrentUser();
  if (!profile) redirect('/login');

  const params = await searchParams;
  const type = (params.type === 'supplier' ? 'supplier' : 'customer') as 'customer' | 'supplier';
  const selectedId = params.id || '';

  // جلب قائمة العملاء/الموردين
  const parties = (type === 'customer'
    ? await prisma.customers.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, phone: true, balance: true, opening_balance: true },
      })
    : await prisma.suppliers.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, phone: true, balance: true, opening_balance: true },
      })
  ).map(p => ({
    ...p,
    balance: Number(p.balance),
    opening_balance: Number(p.opening_balance),
  }));

  // جلب تفاصيل الطرف المختار
  const selected = selectedId
    ? (type === 'customer'
        ? await prisma.customers.findUnique({
            where: { id: selectedId },
            select: { id: true, name: true, phone: true, balance: true, opening_balance: true, address: true },
          })
        : await prisma.suppliers.findUnique({
            where: { id: selectedId },
            select: { id: true, name: true, phone: true, balance: true, opening_balance: true, address: true },
          }))
    : null;
  const selectedNormalized = selected ? {
    ...selected,
    balance: Number(selected.balance),
    opening_balance: Number(selected.opening_balance),
  } : null;

  // جلب الحركات (فواتير + مدفوعات) للطرف المختار
  let transactions: any[] = [];
  if (selectedNormalized) {
    const selected = selectedNormalized; // alias for cleaner code below
    const [salesInvoices, purchaseInvoices, customerPayments, supplierPayments] = await Promise.all([
      type === 'customer'
        ? prisma.sales_invoices.findMany({
            where: { customer_id: selected.id, invoice_type: { not: 'عرض سعر' } },
            orderBy: { invoice_date: 'asc' },
            select: { id: true, invoice_number: true, invoice_date: true, total: true, paid_amount: true, status: true, invoice_type: true, notes: true, void_reason: true },
          })
        : Promise.resolve([]),
      type === 'supplier'
        ? prisma.purchase_invoices.findMany({
            where: { supplier_id: selected.id },
            orderBy: { purchase_date: 'asc' },
            select: { id: true, purchase_number: true, purchase_date: true, total_amount: true, paid_amount: true, status: true, notes: true },
          })
        : Promise.resolve([]),
      type === 'customer'
        ? prisma.customer_payments.findMany({
            where: { customer_id: selected.id },
            orderBy: { payment_date: 'asc' },
            select: { id: true, payment_date: true, amount: true, payment_method: true, notes: true },
          })
        : Promise.resolve([]),
      type === 'supplier'
        ? prisma.supplier_payments.findMany({
            where: { supplier_id: selected.id },
            orderBy: { payment_date: 'asc' },
            select: { id: true, payment_date: true, amount: true, payment_method: true, notes: true },
          })
        : Promise.resolve([]),
    ]);

    if (type === 'customer') {
      // العميل: الفاتورة تزيد الدين (مدين)، التحصيل ينقص الدين (دائن)
      for (const inv of salesInvoices as any[]) {
        if (inv.status === 'ملغاة') continue;
        transactions.push({
          id: `inv-${inv.id}`,
          date: new Date(inv.invoice_date),
          dateStr: formatDate(inv.invoice_date),
          type: 'فاتورة مبيعات',
          docNumber: `#${inv.invoice_number}`,
          debit: Number(inv.total || 0),    // عليه (مدين)
          credit: Number(inv.paid_amount || 0), // مسدد منها
          notes: inv.invoice_type || '',
        });
      }
      for (const pay of customerPayments as any[]) {
        transactions.push({
          id: `pay-${pay.id}`,
          date: new Date(pay.payment_date),
          dateStr: formatDate(pay.payment_date),
          type: 'تحصيل',
          docNumber: pay.payment_method,
          debit: 0,
          credit: Number(pay.amount || 0),
          notes: pay.notes || '',
        });
      }
    } else {
      // المورد: الفاتورة تزيد ما لنا عليه (دائن)، السداد ينقص (مدين)
      for (const inv of purchaseInvoices as any[]) {
        if (inv.status === 'ملغاة') continue;
        transactions.push({
          id: `inv-${inv.id}`,
          date: new Date(inv.purchase_date),
          dateStr: formatDate(inv.purchase_date),
          type: 'فاتورة مشتريات',
          docNumber: `#${inv.purchase_number}`,
          debit: Number(inv.paid_amount || 0),
          credit: Number(inv.total_amount || 0),
          notes: inv.notes || '',
        });
      }
      for (const pay of supplierPayments as any[]) {
        transactions.push({
          id: `pay-${pay.id}`,
          date: new Date(pay.payment_date),
          dateStr: formatDate(pay.payment_date),
          type: 'سداد للمورد',
          docNumber: pay.payment_method,
          debit: Number(pay.amount || 0),
          credit: 0,
          notes: pay.notes || '',
        });
      }
    }

    // ترتيب زمني
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  return (
    <StatementsClient
      type={type as 'customer' | 'supplier'}
      parties={parties}
      selected={selectedNormalized}
      transactions={transactions}
    />
  );
}
