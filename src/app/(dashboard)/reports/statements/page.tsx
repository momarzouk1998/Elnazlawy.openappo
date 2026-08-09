import { getCurrentUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { formatDate } from "@/lib/format";
import { StatementsClient } from "./StatementsClient";

export const dynamic = 'force-dynamic';

interface SearchParams {
  type?: string;
  id?: string;
}

export default async function StatementsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const profile = await getCurrentUser();
  if (!profile) redirect('/login');

  const params = await searchParams;
  const type = (params.type === 'supplier' ? 'supplier' : 'customer') as 'customer' | 'supplier';
  const selectedId = params.id || null;

  // جلب قائمة العملاء أو الموردين
  let parties: any[] = [];
  let selected: any = null;
  let transactions: any[] = [];

  if (type === 'customer') {
    const customers = await prisma.customers.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true, balance: true, opening_balance: true, address: true },
    });
    parties = customers.map(c => ({
      id: c.id, name: c.name, phone: c.phone,
      balance: Number(c.balance), opening_balance: Number(c.opening_balance),
      address: c.address,
    }));

    if (selectedId) {
      selected = parties.find(p => p.id === selectedId) || null;

      if (selected) {
        // جلب الحركات
        const [invoices, payments, returns] = await Promise.all([
          prisma.sales_invoices.findMany({
            where: { customer_id: selectedId, status: { not: 'ملغاة' } },
            orderBy: { invoice_date: 'asc' },
            select: { id: true, invoice_number: true, invoice_date: true, total: true },
          }),
          prisma.customer_payments.findMany({
            where: { customer_id: selectedId },
            orderBy: { payment_date: 'asc' },
            select: { id: true, payment_date: true, amount: true, payment_method: true, notes: true },
          }),
          prisma.customer_return_invoices.findMany({
            where: { customer_id: selectedId, status: { not: 'ملغاة' } },
            orderBy: { return_date: 'asc' },
            select: { id: true, return_number: true, return_date: true, total_amount: true },
          }),
        ]);

        const allEvents = [
          ...invoices.map(i => ({ date: new Date(i.invoice_date), sortDate: new Date(i.invoice_date).getTime(), type: 'فاتورة مبيعات', docNumber: `#${i.invoice_number}`, debit: Number(i.total), credit: 0, notes: 'فاتورة مبيعات', id: i.id })),
          ...payments.map(p => ({ date: new Date(p.payment_date), sortDate: new Date(p.payment_date).getTime(), type: p.notes || 'تحصيل نقدي', docNumber: p.payment_method, debit: 0, credit: Number(p.amount), notes: p.notes || 'تحصيل نقدي', id: p.id })),
          ...returns.map(r => ({ date: new Date(r.return_date), sortDate: new Date(r.return_date).getTime(), type: 'مرتجع بضاعة', docNumber: `↩️ #${r.return_number}`, debit: 0, credit: Number(r.total_amount), notes: 'مرتجع بضاعة', id: r.id })),
        ].sort((a, b) => a.sortDate - b.sortDate);

        transactions = allEvents.map(e => ({
          id: e.id,
          date: e.date,
          dateStr: formatDate(e.date),
          type: e.type,
          docNumber: e.docNumber,
          debit: e.debit,
          credit: e.credit,
          notes: e.notes,
        }));
      }
    }
  } else {
    const suppliers = await prisma.suppliers.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true, balance: true, opening_balance: true, address: true },
    });
    parties = suppliers.map(s => ({
      id: s.id, name: s.name, phone: s.phone,
      balance: Number(s.balance), opening_balance: Number(s.opening_balance),
      address: s.address,
    }));

    if (selectedId) {
      selected = parties.find(p => p.id === selectedId) || null;

      if (selected) {
        const [invoices, payments, returns] = await Promise.all([
          prisma.purchase_invoices.findMany({
            where: { supplier_id: selectedId, status: { not: 'ملغاة' } },
            orderBy: { purchase_date: 'asc' },
            select: { id: true, purchase_number: true, purchase_date: true, total_amount: true },
          }),
          prisma.supplier_payments.findMany({
            where: { supplier_id: selectedId },
            orderBy: { payment_date: 'asc' },
            select: { id: true, payment_date: true, amount: true, payment_method: true, notes: true },
          }),
          prisma.supplier_return_invoices.findMany({
            where: { supplier_id: selectedId, status: { not: 'ملغاة' } },
            orderBy: { return_date: 'asc' },
            select: { id: true, return_number: true, return_date: true, total_amount: true },
          }),
        ]);

        const allEvents = [
          ...invoices.map(i => ({ date: new Date(i.purchase_date), sortDate: new Date(i.purchase_date).getTime(), type: 'فاتورة مشتريات', docNumber: `#${i.purchase_number}`, debit: Number(i.total_amount), credit: 0, notes: 'فاتورة مشتريات', id: i.id })),
          ...payments.map(p => ({ date: new Date(p.payment_date), sortDate: new Date(p.payment_date).getTime(), type: p.notes || 'سداد للمورد', docNumber: p.payment_method, debit: 0, credit: Number(p.amount), notes: p.notes || 'سداد للمورد', id: p.id })),
          ...returns.map(r => ({ date: new Date(r.return_date), sortDate: new Date(r.return_date).getTime(), type: 'مرتجع للمورد', docNumber: `↩️ #${r.return_number}`, debit: 0, credit: Number(r.total_amount), notes: 'مرتجع للمورد', id: r.id })),
        ].sort((a, b) => a.sortDate - b.sortDate);

        transactions = allEvents.map(e => ({
          id: e.id,
          date: e.date,
          dateStr: formatDate(e.date),
          type: e.type,
          docNumber: e.docNumber,
          debit: e.debit,
          credit: e.credit,
          notes: e.notes,
        }));
      }
    }
  }

  return (
    <StatementsClient
      type={type}
      parties={parties}
      selected={selected}
      transactions={transactions}
    />
  );
}
