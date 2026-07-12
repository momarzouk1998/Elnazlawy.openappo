import { prisma } from '@/lib/db/prisma-direct';
import { notFound } from 'next/navigation';
import { formatEGP, formatDate } from '@/lib/format';

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.sales_invoices.findUnique({
    where: { id },
    include: {
      customer: true,
      store: true,
      items: { include: { product: { select: { name: true } } } },
      creator: { select: { full_name: true } },
    },
  });
  if (!invoice) notFound();

  const isTax = invoice.invoice_type === 'ضريبية';

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4 print:p-0 print:bg-white">
      {/* Action buttons - hidden on print */}
      <div className="no-print max-w-[600px] mx-auto mb-4 flex flex-wrap gap-3 justify-center">
        <button onClick={() => window.print()} className="bg-button-orange text-white px-6 py-2.5 rounded-full font-bold">🖨️ طباعة</button>
        <button onClick={() => window.close()} className="bg-button-gray text-white px-6 py-2.5 rounded-full font-bold">✕ إغلاق</button>
      </div>

      <div className="print-page max-w-[600px] mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-header-gradient text-white p-5 border-b-4 border-nazlawy-500 flex items-center gap-4">
          <div className="w-[90px] h-[90px] bg-white rounded-xl p-0.5 border-2 border-nazlawy-500 shrink-0">
            <img src="/elnazlawy-logo.png" alt="النزلاوي" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-[1.9em] font-extrabold leading-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>معرض النزلاوي</h1>
            <div className="text-xs opacity-90">لتجارة وتوزيع الأجهزة الكهربائية والإضاءة الحديثة</div>
          </div>
        </div>

        {/* Type ribbon */}
        <div className="bg-nazlawy-500 text-white text-center font-extrabold py-2 text-lg">
          فاتورة {invoice.invoice_type}
        </div>

        {/* Meta */}
        <div className="px-5 py-3 grid grid-cols-2 gap-y-1 text-sm border-b">
          <div><span className="text-gray-500">رقم:</span> <strong className="font-mono">#{invoice.invoice_number}</strong></div>
          <div className="text-left"><span className="text-gray-500">التاريخ:</span> <strong>{formatDate(invoice.invoice_date)}</strong></div>
          {invoice.customer && (
            <div className="col-span-2"><span className="text-gray-500">العميل:</span> <strong>{invoice.customer.name}</strong>{invoice.customer.phone && <span className="text-gray-500 mr-2">• {invoice.customer.phone}</span>}</div>
          )}
          {invoice.store && <div className="col-span-2"><span className="text-gray-500">المخزن:</span> {invoice.store.name}</div>}
        </div>

        {/* Items */}
        <table className="w-full text-[0.85em]">
          <thead className="bg-slate-650 text-white">
            <tr>
              <th className="p-2 text-right">م</th>
              <th className="p-2 text-right">الصنف</th>
              <th className="p-2 text-center">الكمية</th>
              <th className="p-2 text-left">السعر</th>
              <th className="p-2 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={it.id} className={i % 2 === 0 ? 'bg-[#f8fbfd]' : ''}>
                <td className="p-2 text-center">{i + 1}</td>
                <td className="p-2">{it.product_name}</td>
                <td className="p-2 text-center font-mono">{Number(it.quantity)}</td>
                <td className="p-2 text-left font-mono">{formatEGP(Number(it.unit_price))}</td>
                <td className="p-2 text-left font-mono font-bold">{formatEGP(Number(it.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="px-5 py-3 space-y-1 border-t-2 border-nazlawy-500">
          <div className="flex justify-between text-sm"><span>الإجمالي قبل الخصم:</span><span className="font-mono font-bold">{formatEGP(Number(invoice.subtotal))} ج</span></div>
          {Number(invoice.discount) > 0 && <div className="flex justify-between text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded"><span>الخصم:</span><span className="font-mono font-bold">- {formatEGP(Number(invoice.discount))} ج</span></div>}
          <div className="flex justify-between text-xl font-extrabold border-t pt-2 text-red-700">
            <span>الإجمالي النهائي:</span>
            <span className="font-mono">{formatEGP(Number(invoice.total))} ج</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f8f9fa] p-4 border-t text-center text-[#666] text-[0.85em]">
          <p className="font-bold text-[#2c3e50] text-[1.1em] mb-2">شكراً لتعاملكم معنا في فرع النزلاوي</p>
          <p className="mb-2 text-[#555]">📍 الفيوم - دلة - أمام مدرسة الزراعة بجوار كافيه الغابة</p>
          <div className="flex justify-evenly flex-wrap gap-3 font-bold text-[#444]">
            <span>الحاج مهدي: <span className="text-nazlawy-500">01069991623</span></span>
            <span>أ/محمود حسين: <span className="text-nazlawy-500">01006172668</span></span>
            <span>أ/محمد حسين: <span className="text-nazlawy-500">01098700313</span></span>
          </div>
          {isTax && (
            <p className="mt-2 text-[#444] border-t border-dashed pt-2">
              ⚖️ التسجيل الضريبي: <strong className="text-[#d32f2f]">634 - 128 - 467</strong>
              &nbsp;&nbsp;العنوان الضريبي: <strong>الربع - النزلة - يوسف الصديق - الفيوم</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
