import { prisma } from '@/lib/db/prisma-direct';
import { notFound } from 'next/navigation';
import { formatEGP, formatDate } from '@/lib/format';
import PrintActions from '@/app/print/invoice/[id]/PrintActions';

export const dynamic = 'force-dynamic';

export default async function SupplierStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [supplier, invoices, payments, returns] = await Promise.all([
    prisma.suppliers.findUnique({ where: { id } }),

    prisma.purchase_invoices.findMany({
      where: { supplier_id: id, status: { not: 'ملغاة' } },
      orderBy: { purchase_date: 'asc' },
      select: {
        id: true, purchase_number: true, purchase_date: true, total_amount: true, status: true,
        items: {
          select: { product_name: true, quantity: true, unit_cost: true, line_total: true },
        },
      },
    }),

    prisma.supplier_payments.findMany({
      where: { supplier_id: id },
      orderBy: { payment_date: 'asc' },
      select: { id: true, payment_date: true, amount: true, payment_method: true, notes: true },
    }),

    prisma.supplier_return_invoices.findMany({
      where: { supplier_id: id, status: { not: 'ملغاة' } },
      orderBy: { return_date: 'asc' },
      select: {
        id: true, return_number: true, return_date: true, total_amount: true,
        items: {
          select: { product_name: true, quantity: true, unit_cost: true, line_total: true },
        },
      },
    }),
  ]);

  if (!supplier || !supplier.is_active) notFound();

  // ── بناء الحركات المرتبة ──────────────────────────────
  type EventItem = { product_name: string; quantity: number; unit_cost: number; line_total: number };
  type Entry = {
    date: Date;
    type: 'opening' | 'invoice' | 'payment' | 'return';
    label: string;
    ref: string;
    debit: number;   // مستحق علينا للمورد
    credit: number;  // دفعنا للمورد أو مرتجع
    balance: number;
    items?: EventItem[];
  };

  let running = Number(supplier.opening_balance);
  const entries: Entry[] = [];

  if (Number(supplier.opening_balance) !== 0) {
    entries.push({
      date: new Date('1970-01-01'),
      type: 'opening',
      label: 'رصيد افتتاحي',
      ref: '—',
      debit:  Number(supplier.opening_balance) > 0 ? Number(supplier.opening_balance) : 0,
      credit: Number(supplier.opening_balance) < 0 ? Math.abs(Number(supplier.opening_balance)) : 0,
      balance: running,
    });
  }

  const allEvents: { date: Date; type: 'invoice' | 'payment' | 'return'; data: any }[] = [
    ...invoices.map(i => ({ date: new Date(i.purchase_date), type: 'invoice' as const, data: i })),
    ...payments.map(p => ({ date: new Date(p.payment_date), type: 'payment' as const, data: p })),
    ...returns.map(r  => ({ date: new Date(r.return_date),  type: 'return'  as const, data: r })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const ev of allEvents) {
    if (ev.type === 'invoice') {
      running += Number(ev.data.total_amount);
      entries.push({
        date:    ev.date,
        type:    'invoice',
        label:   'فاتورة مشتريات',
        ref:     `#${ev.data.purchase_number}`,
        debit:   Number(ev.data.total_amount),
        credit:  0,
        balance: running,
        items:   ev.data.items.map((it: any) => ({
          product_name: it.product_name,
          quantity:     Number(it.quantity),
          unit_cost:    Number(it.unit_cost),
          line_total:   Number(it.line_total),
        })),
      });
    } else if (ev.type === 'payment') {
      running -= Number(ev.data.amount);
      entries.push({
        date:    ev.date,
        type:    'payment',
        label:   ev.data.notes || 'سداد للمورد',
        ref:     ev.data.payment_method,
        debit:   0,
        credit:  Number(ev.data.amount),
        balance: running,
      });
    } else {
      running -= Number(ev.data.total_amount);
      entries.push({
        date:    ev.date,
        type:    'return',
        label:   'مرتجع للمورد',
        ref:     `↩️ #${ev.data.return_number}`,
        debit:   0,
        credit:  Number(ev.data.total_amount),
        balance: running,
        items:   ev.data.items.map((it: any) => ({
          product_name: it.product_name,
          quantity:     Number(it.quantity),
          unit_cost:    Number(it.unit_cost),
          line_total:   Number(it.line_total),
        })),
      });
    }
  }

  const totalDebit   = entries.reduce((s, e) => s + e.debit,  0);
  const totalCredit  = entries.reduce((s, e) => s + e.credit, 0);
  const finalBalance = Number(supplier.balance);

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4 print:p-0 print:bg-white">
      <PrintActions />

      <div className="print-page max-w-[800px] mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-header-gradient text-white p-5 border-b-4 border-nazlawy-500 flex items-center gap-4">
          <div className="w-[80px] h-[80px] bg-white rounded-xl p-0.5 border-2 border-nazlawy-500 shrink-0">
            <img src="/elnazlawy-logo.png" alt="النزلاوي" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-[1.7em] font-extrabold leading-tight">معرض النزلاوي</h1>
            <div className="text-xs opacity-90">لتجارة وتوزيع الأجهزة الكهربائية والإضاءة الحديثة</div>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="bg-nazlawy-500 text-white text-center font-extrabold py-2 text-lg">
          كشف حساب تفصيلي — مورد
        </div>

        {/* ── Supplier info ── */}
        <div className="px-5 py-3 grid grid-cols-2 gap-y-1 text-sm border-b bg-gray-50">
          <div><span className="text-gray-500">المورد:</span> <strong>{supplier.name}</strong></div>
          <div><span className="text-gray-500">الهاتف:</span> <strong>{supplier.phone || '—'}</strong></div>
          <div><span className="text-gray-500">تاريخ الكشف:</span> <strong>{formatDate(new Date())}</strong></div>
          <div><span className="text-gray-500">الرصيد الافتتاحي:</span> <strong className="font-mono">{formatEGP(Number(supplier.opening_balance))} ج</strong></div>
        </div>

        {/* ── Ledger ── */}
        <div className="divide-y divide-gray-100">
          {entries.length === 0 && (
            <p className="p-8 text-center text-gray-400">لا توجد حركات</p>
          )}

          {entries.map((e, i) => (
            <div key={i} className={`${
              e.type === 'invoice' ? 'bg-white' :
              e.type === 'return'  ? 'bg-orange-50' :
              e.type === 'payment' ? 'bg-green-50' : 'bg-gray-50'
            }`}>

              {/* ── Row header ── */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 items-center px-3 py-2 text-[0.83em]">
                <div>
                  <span className={`inline-block text-[0.78em] font-bold px-1.5 py-0.5 rounded mr-1 ${
                    e.type === 'invoice' ? 'bg-blue-100 text-blue-800' :
                    e.type === 'return'  ? 'bg-orange-100 text-orange-800' :
                    e.type === 'payment' ? 'bg-green-100 text-green-800' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {e.type === 'invoice' ? '📥 شراء' : e.type === 'return' ? '↩️ مرتجع' : e.type === 'payment' ? '💸 سداد' : 'افتتاحي'}
                  </span>
                  <span className="font-semibold">{e.label}</span>
                  <span className="text-gray-400 mx-1">•</span>
                  <span className="font-mono text-gray-500">{e.ref}</span>
                  <span className="text-gray-400 mx-1">•</span>
                  <span className="text-gray-500">{e.date.getFullYear() === 1970 ? '—' : formatDate(e.date)}</span>
                </div>

                <div className="text-left w-[90px]">
                  {e.debit > 0
                    ? <span className="font-mono font-bold text-red-700">{formatEGP(e.debit)}</span>
                    : <span className="text-gray-300">—</span>}
                </div>
                <div className="text-left w-[90px]">
                  {e.credit > 0
                    ? <span className="font-mono font-bold text-green-700">{formatEGP(e.credit)}</span>
                    : <span className="text-gray-300">—</span>}
                </div>
                <div className={`text-left w-[90px] font-mono font-extrabold ${
                  e.balance > 0.01 ? 'text-red-700' : e.balance < -0.01 ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {formatEGP(e.balance)}
                </div>
              </div>

              {/* ── Items sub-table ── */}
              {e.items && e.items.length > 0 && (
                <table className="w-full text-[0.78em] border-t border-dashed border-gray-200 mb-1">
                  <thead>
                    <tr className="bg-gray-100 text-gray-500">
                      <th className="px-4 py-1 text-right font-medium">الصنف</th>
                      <th className="px-2 py-1 text-center font-medium w-16">الكمية</th>
                      <th className="px-2 py-1 text-left font-medium w-20">سعر الشراء</th>
                      <th className="px-2 py-1 text-left font-medium w-24">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.items.map((it, j) => (
                      <tr key={j} className="border-t border-gray-100">
                        <td className="px-4 py-1">{it.product_name}</td>
                        <td className="px-2 py-1 text-center font-mono">{it.quantity}</td>
                        <td className="px-2 py-1 text-left font-mono">{formatEGP(it.unit_cost)}</td>
                        <td className="px-2 py-1 text-left font-mono font-bold">{formatEGP(it.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>

        {/* ── Column legend ── */}
        <div className="grid grid-cols-[1fr_90px_90px_90px] gap-x-3 px-3 py-1.5 bg-nazlawy-500 text-white text-[0.78em] font-bold border-t-2 border-nazlawy-600 mt-1">
          <div className="text-right">الحركة</div>
          <div className="text-left">مستحق (علينا)</div>
          <div className="text-left">مدفوع (له)</div>
          <div className="text-left">الرصيد</div>
        </div>

        {/* ── Totals row ── */}
        <div className="grid grid-cols-[1fr_90px_90px_90px] gap-x-3 px-3 py-2.5 bg-gray-100 text-sm font-bold border-t-2 border-nazlawy-400">
          <div className="text-right text-gray-700">الإجمالي</div>
          <div className="text-left font-mono text-red-700">{formatEGP(totalDebit)}</div>
          <div className="text-left font-mono text-green-700">{formatEGP(totalCredit)}</div>
          <div className={`text-left font-mono text-base ${finalBalance > 0.01 ? 'text-red-700' : finalBalance < -0.01 ? 'text-green-700' : 'text-gray-700'}`}>
            {formatEGP(finalBalance)}
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="mx-5 my-4 grid grid-cols-3 gap-3 text-sm text-center">
          <div className="border rounded-lg p-3">
            <div className="text-gray-500 text-xs mb-1">إجمالي المشتريات</div>
            <div className="font-extrabold font-mono text-blue-700">
              {formatEGP(invoices.reduce((s, inv) => s + Number(inv.total_amount), 0))} ج
            </div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-gray-500 text-xs mb-1">إجمالي المرتجعات</div>
            <div className="font-extrabold font-mono text-orange-600">
              {formatEGP(returns.reduce((s, r) => s + Number(r.total_amount), 0))} ج
            </div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-gray-500 text-xs mb-1">إجمالي المدفوعات</div>
            <div className="font-extrabold font-mono text-green-700">
              {formatEGP(payments.reduce((s, p) => s + Number(p.amount), 0))} ج
            </div>
          </div>
          <div className="border rounded-lg p-3 col-span-2">
            <div className="text-gray-500 text-xs mb-1">صافي المشتريات (بعد المرتجعات)</div>
            <div className="font-extrabold font-mono text-nazlawy-700">
              {formatEGP(
                invoices.reduce((s, inv) => s + Number(inv.total_amount), 0) -
                returns.reduce((s, r) => s + Number(r.total_amount), 0)
              )} ج
            </div>
          </div>
          <div className="border-2 border-nazlawy-400 rounded-lg p-3 bg-nazlawy-50">
            <div className="text-gray-500 text-xs mb-1">المتبقي للمورد</div>
            <div className={`font-extrabold font-mono text-base ${finalBalance > 0.01 ? 'text-red-700' : finalBalance < -0.01 ? 'text-green-700' : 'text-gray-700'}`}>
              {formatEGP(finalBalance)} ج
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-[#f8f9fa] p-4 border-t text-center text-[#666] text-[0.82em]">
          <p className="font-bold text-[#2c3e50] mb-1">معرض النزلاوي — الفيوم - دلة</p>
          <p>📞 أ/محمود حسين: <span className="font-bold text-nazlawy-500">01006172668</span></p>
        </div>

      </div>
    </div>
  );
}
