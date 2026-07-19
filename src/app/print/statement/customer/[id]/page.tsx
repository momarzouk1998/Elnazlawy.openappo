import { prisma } from '@/lib/db/prisma-direct';
import { notFound } from 'next/navigation';
import { formatEGP, formatDate } from '@/lib/format';
import PrintActions from '@/app/print/invoice/[id]/PrintActions';

export const dynamic = 'force-dynamic';

export default async function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [customer, invoices, payments, returns] = await Promise.all([
    prisma.customers.findUnique({ where: { id } }),
    prisma.sales_invoices.findMany({
      where: { customer_id: id, status: { not: 'ملغاة' } },
      orderBy: { invoice_date: 'asc' },
      select: { id: true, invoice_number: true, invoice_date: true, total: true, status: true },
    }),
    prisma.customer_payments.findMany({
      where: { customer_id: id },
      orderBy: { payment_date: 'asc' },
      select: { id: true, payment_date: true, amount: true, payment_method: true, notes: true },
    }),
    prisma.customer_return_invoices.findMany({
      where: { customer_id: id, status: { not: 'ملغاة' } },
      orderBy: { return_date: 'asc' },
      select: { id: true, return_number: true, return_date: true, total_amount: true },
    }),
  ]);

  if (!customer || !customer.is_active) notFound();

  // بناء الحركات مرتبة تاريخياً
  type Entry = {
    date: Date;
    label: string;
    ref: string;
    debit: number;   // مبلغ الفاتورة (على العميل)
    credit: number;  // مبلغ السداد أو المرتجع (لصالح العميل)
    balance: number; // running balance
  };

  const entries: Entry[] = [];
  let running = Number(customer.opening_balance);

  // افتح بالرصيد الافتتاحي
  if (Number(customer.opening_balance) !== 0) {
    entries.push({
      date: new Date('1970-01-01'),
      label: 'رصيد افتتاحي',
      ref: '—',
      debit: Number(customer.opening_balance) > 0 ? Number(customer.opening_balance) : 0,
      credit: Number(customer.opening_balance) < 0 ? Math.abs(Number(customer.opening_balance)) : 0,
      balance: running,
    });
  }

  // اجمع كل الحركات مع نوعها
  const allEvents: { date: Date; type: 'invoice' | 'payment' | 'return'; data: any }[] = [
    ...invoices.map(i => ({ date: new Date(i.invoice_date), type: 'invoice' as const, data: i })),
    ...payments.map(p => ({ date: new Date(p.payment_date), type: 'payment' as const, data: p })),
    ...returns.map(r => ({ date: new Date(r.return_date), type: 'return' as const, data: r })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const ev of allEvents) {
    if (ev.type === 'invoice') {
      running += Number(ev.data.total);
      entries.push({
        date: ev.date,
        label: 'فاتورة مبيعات',
        ref: `#${ev.data.invoice_number}`,
        debit: Number(ev.data.total),
        credit: 0,
        balance: running,
      });
    } else if (ev.type === 'payment') {
      running -= Number(ev.data.amount);
      entries.push({
        date: ev.date,
        label: ev.data.notes || 'تحصيل',
        ref: ev.data.payment_method,
        debit: 0,
        credit: Number(ev.data.amount),
        balance: running,
      });
    } else {
      running -= Number(ev.data.total_amount);
      entries.push({
        date: ev.date,
        label: 'مرتجع',
        ref: `↩️ #${ev.data.return_number}`,
        debit: 0,
        credit: Number(ev.data.total_amount),
        balance: running,
      });
    }
  }

  const totalDebit  = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const finalBalance = Number(customer.balance);

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4 print:p-0 print:bg-white">
      <PrintActions />

      <div className="print-page max-w-[720px] mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-header-gradient text-white p-5 border-b-4 border-nazlawy-500 flex items-center gap-4">
          <div className="w-[80px] h-[80px] bg-white rounded-xl p-0.5 border-2 border-nazlawy-500 shrink-0">
            <img src="/elnazlawy-logo.png" alt="النزلاوي" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-[1.7em] font-extrabold leading-tight">معرض النزلاوي</h1>
            <div className="text-xs opacity-90">لتجارة وتوزيع الأجهزة الكهربائية والإضاءة الحديثة</div>
          </div>
        </div>

        {/* Title ribbon */}
        <div className="bg-nazlawy-500 text-white text-center font-extrabold py-2 text-lg">
          كشف حساب عميل
        </div>

        {/* Customer info */}
        <div className="px-5 py-3 grid grid-cols-2 gap-y-1 text-sm border-b bg-gray-50">
          <div><span className="text-gray-500">العميل:</span> <strong>{customer.name}</strong></div>
          <div><span className="text-gray-500">الهاتف:</span> <strong>{customer.phone || '—'}</strong></div>
          <div><span className="text-gray-500">تاريخ الكشف:</span> <strong>{formatDate(new Date())}</strong></div>
          <div><span className="text-gray-500">الرصيد الافتتاحي:</span> <strong className="font-mono">{formatEGP(Number(customer.opening_balance))} ج</strong></div>
        </div>

        {/* Statement table */}
        <table className="w-full text-[0.82em]">
          <thead className="bg-slate-650 text-white">
            <tr>
              <th className="p-2 text-right w-[90px]">التاريخ</th>
              <th className="p-2 text-right">البيان</th>
              <th className="p-2 text-center w-[60px]">المرجع</th>
              <th className="p-2 text-left w-[90px]">مدين (عليه)</th>
              <th className="p-2 text-left w-[90px]">دائن (له)</th>
              <th className="p-2 text-left w-[90px]">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fbfd]'}>
                <td className="p-2 text-xs">{e.date.getFullYear() === 1970 ? '—' : formatDate(e.date)}</td>
                <td className="p-2">{e.label}</td>
                <td className="p-2 text-center font-mono text-xs text-gray-500">{e.ref}</td>
                <td className="p-2 text-left font-mono">{e.debit > 0 ? formatEGP(e.debit) : '—'}</td>
                <td className="p-2 text-left font-mono text-green-700">{e.credit > 0 ? formatEGP(e.credit) : '—'}</td>
                <td className={`p-2 text-left font-mono font-bold ${e.balance > 0.01 ? 'text-red-700' : e.balance < -0.01 ? 'text-green-700' : 'text-gray-500'}`}>
                  {formatEGP(e.balance)}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد حركات</td></tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-nazlawy-500 bg-gray-100 font-bold text-sm">
            <tr>
              <td colSpan={3} className="p-3 text-right">الإجمالي</td>
              <td className="p-3 text-left font-mono">{formatEGP(totalDebit)}</td>
              <td className="p-3 text-left font-mono text-green-700">{formatEGP(totalCredit)}</td>
              <td className={`p-3 text-left font-mono text-base ${finalBalance > 0.01 ? 'text-red-700' : finalBalance < -0.01 ? 'text-green-700' : 'text-gray-700'}`}>
                {formatEGP(finalBalance)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Summary box */}
        <div className="mx-5 my-4 grid grid-cols-3 gap-3 text-sm text-center">
          <div className="border rounded-lg p-3">
            <div className="text-gray-500 text-xs mb-1">إجمالي الفواتير</div>
            <div className="font-extrabold font-mono text-red-700">{formatEGP(totalDebit)} ج</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-gray-500 text-xs mb-1">إجمالي المدفوعات</div>
            <div className="font-extrabold font-mono text-green-700">{formatEGP(totalCredit)} ج</div>
          </div>
          <div className="border-2 border-nazlawy-400 rounded-lg p-3 bg-nazlawy-50">
            <div className="text-gray-500 text-xs mb-1">الرصيد المتبقي</div>
            <div className={`font-extrabold font-mono text-base ${finalBalance > 0.01 ? 'text-red-700' : finalBalance < -0.01 ? 'text-green-700' : 'text-gray-700'}`}>
              {formatEGP(finalBalance)} ج
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f8f9fa] p-4 border-t text-center text-[#666] text-[0.82em]">
          <p className="font-bold text-[#2c3e50] mb-1">معرض النزلاوي — الفيوم - دلة</p>
          <p>📞 أ/محمود حسين: <span className="font-bold text-nazlawy-500">01006172668</span></p>
        </div>
      </div>
    </div>
  );
}
