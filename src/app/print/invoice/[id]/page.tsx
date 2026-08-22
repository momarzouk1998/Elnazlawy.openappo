import { prisma } from '@/lib/db/prisma-direct';
import { notFound } from 'next/navigation';
import { formatEGP, formatDate } from '@/lib/format';
import PrintActions from './PrintActions';
import { LOGO_BASE64 } from '@/lib/logo-base64';

export const dynamic = 'force-dynamic';

const C = {
  orange: '#f56226',
  darkOrange: '#d9531e',
  dark: '#111315',
  lightGray: '#f8f9fa',
  border: '#e5e7eb',
  text: '#1f2937',
  muted: '#6b7280',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#d97706',
  yellowBg: '#fef3c7',
  white: '#ffffff',
  slate: '#475569',
  tableHeader: '#334155',
  rowAlt: '#f8fafc',
};

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoprint?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const autoprint = sp.autoprint === '1';

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
  const isCancelled = invoice.status === 'ملغاة';
  const hasCustomer = !!invoice.customer;

  // 1. حساب المدفوع المرتبط بالفاتورة — بالاعتماد على invoice_id فقط (دقيق 100% بغض النظر عن التاريخ)
  let paidOnDate = 0;
  if (hasCustomer && invoice.customer) {
    const linkedPayments = await prisma.customer_payments.findMany({
      where: { invoice_id: invoice.id },
      select: { amount: true },
    });
    paidOnDate = linkedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Fallback: لو مفيش مدفوعات مربوطة بـ invoice_id (فواتير قديمة قبل التحديث)
    // نستخدم الـ paid_amount المحفوظ على الفاتورة نفسها
    if (paidOnDate === 0) {
      paidOnDate = Number(invoice.paid_amount || 0);
    }
  }

  let prevBalance: number | null = null;
  let newBalance: number | null = null;

  if (hasCustomer && invoice.customer) {
    // 1. الأولوية الأولى: قراءة الرصيد السابق المحفوظ لحظة الفاتورة
    if (
      invoice.customer_prev_balance !== null &&
      invoice.customer_prev_balance !== undefined
    ) {
      prevBalance = Number(invoice.customer_prev_balance);
      newBalance = isCancelled
        ? prevBalance
        : prevBalance + (Number(invoice.total) - paidOnDate);
    } else {
      // 2. Fallback للفواتير القديمة بالتسلسل الرقمي
      const custId = invoice.customer.id;
      const invDate = invoice.created_at || invoice.invoice_date;
      const opening = Number(invoice.customer.opening_balance || 0);

      // استخدام الترتيب التسلسلي برقم الفاتورة لمنع أي تداخل زمني
      const priorInvoices = await prisma.sales_invoices.findMany({
        where: {
          customer_id: custId,
          status: 'مكتملة',
          invoice_number: { lt: invoice.invoice_number },
        },
        select: { total: true },
      });
      const priorInvoicesTotal = priorInvoices.reduce(
        (sum, inv) => sum + Number(inv.total),
        0
      );

      const priorPayments = await prisma.customer_payments.findMany({
        where: {
          customer_id: custId,
          OR: [
            { invoice_id: null, created_at: { lt: invDate } },
            {
              invoice: {
                invoice_number: { lt: invoice.invoice_number },
              },
            },
          ],
        },
        select: { amount: true },
      });
      const priorPaymentsTotal = priorPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      const priorReturns = await prisma.customer_return_invoices.findMany({
        where: {
          customer_id: custId,
          status: { not: 'ملغاة' },
          created_at: { lte: invDate },
        },
        select: { total_amount: true },
      });
      const priorReturnsTotal = priorReturns.reduce(
        (sum, r) => sum + Number(r.total_amount),
        0
      );

      prevBalance = opening + priorInvoicesTotal - priorPaymentsTotal - priorReturnsTotal;

      if (isCancelled) {
        newBalance = prevBalance;
      } else {
        newBalance = prevBalance + (Number(invoice.total) - paidOnDate);
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '0.75rem', fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif" }}>
      <div
        id="statement"
        className="print-page"
        style={{
          maxWidth: '620px',
          margin: '0 auto',
          backgroundColor: C.white,
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: `1px solid ${C.border}`,
          direction: 'rtl',
          textAlign: 'right',
          color: C.text,
          boxSizing: 'border-box',
        }}
      >
        {/* Top Accent Line */}
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${C.orange} 0%, ${C.darkOrange} 100%)` }} />

        {/* Compact Integrated Header */}
        <div
          style={{
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${C.border}`,
            background: '#ffffff',
          }}
        >
          {/* Logo & Store Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                backgroundColor: C.white,
                borderRadius: '8px',
                padding: '2px',
                border: `1.5px solid ${C.orange}`,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={LOGO_BASE64}
                alt="النزلاوي"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: C.dark, lineHeight: 1.1 }}>
                معرض النزلاوي
              </div>
              <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '2px' }}>
                للأجهزة الكهربائية والإضاءة الحديثة
              </div>
            </div>
          </div>

          {/* Invoice Type & Meta Pill */}
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                display: 'inline-block',
                background: isCancelled ? C.red : C.orange,
                color: C.white,
                padding: '3px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 800,
              }}
            >
              {isCancelled ? 'فاتورة ملغاة 🚫' : `فاتورة ${invoice.invoice_type}`}
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: C.text }}>
              <span style={{ color: C.muted }}>رقم: </span>
              <strong style={{ fontFamily: 'monospace' }}>#{invoice.invoice_number}</strong>
              <span style={{ margin: '0 4px', color: C.border }}>|</span>
              <span style={{ color: C.muted }}>التاريخ: </span>
              <strong>{formatDate(invoice.invoice_date)}</strong>
            </div>
          </div>
        </div>

        {/* Compact Customer & Store Info Bar */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderBottom: `1px solid ${C.border}`,
            padding: '0.45rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
          }}
        >
          {invoice.customer ? (
            <div>
              <span style={{ color: C.muted }}>العميل: </span>
              <strong style={{ fontSize: '0.9rem', color: C.dark }}>{invoice.customer.name}</strong>
              {invoice.customer.phone && (
                <span style={{ color: C.muted, marginRight: '8px' }}>📞 {invoice.customer.phone}</span>
              )}
            </div>
          ) : (
            <div>
              <span style={{ color: C.muted }}>العميل: </span>
              <strong>عميل نقدي</strong>
            </div>
          )}

          {invoice.store && (
            <div style={{ color: C.muted }}>
              <span>المخزن: </span>
              <strong style={{ color: C.dark }}>{invoice.store.name}</strong>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: C.tableHeader, color: C.white }}>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '32px' }}>م</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>الصنف</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '45px' }}>الكمية</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', width: '70px' }}>السعر</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', width: '85px' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr
                key={it.id}
                style={{
                  backgroundColor: i % 2 === 0 ? C.rowAlt : C.white,
                  borderBottom: `1px solid #f1f5f9`,
                }}
              >
                <td style={{ padding: '5px 8px', textAlign: 'center', color: C.muted }}>{i + 1}</td>
                <td style={{ padding: '5px 8px', fontWeight: 600 }}>{it.product_name}</td>
                <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                  {Number(it.quantity)}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'left', fontFamily: 'monospace' }}>
                  {formatEGP(Number(it.unit_price))}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'left', fontFamily: 'monospace', fontWeight: 800 }}>
                  {formatEGP(Number(it.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary & Totals */}
        <div
          style={{
            padding: '0.6rem 1rem',
            borderTop: `2px solid ${C.orange}`,
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '3px' }}>
            <span style={{ color: C.muted }}>الإجمالي قبل الخصم:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {formatEGP(Number(invoice.subtotal))} ج
            </span>
          </div>

          {Number(invoice.discount) > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                color: C.yellow,
                backgroundColor: C.yellowBg,
                padding: '2px 8px',
                borderRadius: '4px',
                marginBottom: '3px',
              }}
            >
              <span>الخصم:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                - {formatEGP(Number(invoice.discount))} ج
              </span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1.15rem',
              fontWeight: 900,
              borderTop: `1px dashed ${C.border}`,
              paddingTop: '4px',
              color: C.red,
            }}
          >
            <span>إجمالي الفاتورة:</span>
            <span style={{ fontFamily: 'monospace' }}>{formatEGP(Number(invoice.total))} ج</span>
          </div>
        </div>

        {/* Customer Balance Section (Compact) */}
        {hasCustomer && prevBalance !== null && newBalance !== null && (
          <div
            style={{
              margin: '0 1rem 0.6rem 1rem',
              borderRadius: '8px',
              border: `1px solid ${isCancelled ? '#fca5a5' : C.border}`,
              backgroundColor: isCancelled ? '#fff1f2' : '#f8fafc',
              fontSize: '0.78rem',
              overflow: 'hidden',
            }}
          >
            {isCancelled && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid #fca5a5' }}>
                🚫 تنبيه: هذه الفاتورة ملغاة ولا تؤثر على حساب العميل
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isCancelled ? '1fr 1fr' : paidOnDate > 0 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                textAlign: 'center',
                borderBottom: `1px solid ${isCancelled ? '#fecdd3' : C.border}`,
                backgroundColor: isCancelled ? '#ffe4e6' : '#f1f5f9',
                padding: '4px 0',
                fontWeight: 700,
                color: isCancelled ? '#9f1239' : C.muted,
              }}
            >
              <div>الحساب السابق</div>
              {!isCancelled && <div>+ الفاتورة الحالية</div>}
              {!isCancelled && paidOnDate > 0 && <div style={{ color: C.green }}>- المدفوع بتاريخ الفاتورة</div>}
              <div style={{ color: C.dark }}>{isCancelled ? 'رصيد العميل' : '= المتبقي على العميل'}</div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isCancelled ? '1fr 1fr' : paidOnDate > 0 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                textAlign: 'center',
                padding: '5px 0',
                fontFamily: 'monospace',
                fontWeight: 800,
              }}
            >
              <div style={{ color: prevBalance > 0.01 ? C.red : prevBalance < -0.01 ? C.green : C.muted }}>
                {formatEGP(prevBalance)} ج
              </div>
              {!isCancelled && (
                <div style={{ color: C.darkOrange }}>
                  +{formatEGP(Number(invoice.total))} ج
                </div>
              )}
              {!isCancelled && paidOnDate > 0 && (
                <div style={{ color: C.green }}>
                  -{formatEGP(paidOnDate)} ج
                </div>
              )}
              <div style={{ color: newBalance > 0.01 ? C.red : newBalance < -0.01 ? C.green : C.dark, fontSize: '0.88rem' }}>
                {formatEGP(newBalance)} ج
              </div>
            </div>
          </div>
        )}

        {/* Compact Elegant Footer */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '0.5rem 1rem',
            borderTop: `1px solid ${C.border}`,
            textAlign: 'center',
            fontSize: '0.72rem',
            color: '#64748b',
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
            شكراً لتعاملكم معنا في معرض النزلاوي • 📍 الفيوم - دله شارع نادي قارون بجوار كافيه الثورة
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', fontWeight: 600 }}>
            <span>📞 الحاج: <strong style={{ color: C.orange }}>01006172668</strong></span>
            <span>المخزن: <strong style={{ color: C.orange }}>01119209017</strong></span>
            <span>المحاسب: <strong style={{ color: C.orange }}>01095463383</strong></span>
          </div>
          {isTax && (
            <div style={{ marginTop: '2px', color: '#475569', fontSize: '0.68rem', borderTop: '1px dashed #e2e8f0', paddingTop: '2px' }}>
              ⚖️ التسجيل الضريبي: <strong style={{ color: '#dc2626' }}>634 - 128 - 467</strong> | الربع - النزلة - يوسف الصديق
            </div>
          )}
        </div>
      </div>

      <PrintActions
        autoprint={autoprint}
        fileName={`فاتورة ${invoice.invoice_type} - ${invoice.invoice_number}`}
        targetId="statement"
        invoiceId={invoice.id}
        customerId={invoice.customer?.id}
        customerName={invoice.customer?.name}
        isCancelled={isCancelled}
      />
    </div>
  );
}
