import { prisma } from '@/lib/db/prisma-direct';
import { notFound } from 'next/navigation';
import { formatEGP, formatDate } from '@/lib/format';
import PrintActions from './PrintActions';
import { LOGO_BASE64 } from '@/lib/logo-base64';

export const dynamic = 'force-dynamic';

const C = {
  orange: '#ea580c',
  darkOrange: '#c2410c',
  dark: '#0f172a',
  text: '#000000',
  label: '#1e293b',
  border: '#64748b',
  borderLight: '#cbd5e1',
  tableBorder: '#334155',
  tableHeader: '#1e293b',
  red: '#b91c1c',
  green: '#15803d',
  yellow: '#b45309',
  yellowBg: '#fef3c7',
  white: '#ffffff',
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

  // 1. حساب المدفوع المرتبط بالفاتورة
  let paidOnDate = 0;
  if (hasCustomer && invoice.customer) {
    const linkedPayments = await prisma.customer_payments.findMany({
      where: { invoice_id: invoice.id },
      select: { amount: true },
    });
    paidOnDate = linkedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    if (paidOnDate === 0) {
      paidOnDate = Number(invoice.paid_amount || 0);
    }
  }

  let prevBalance: number | null = null;
  let newBalance: number | null = null;

  if (hasCustomer && invoice.customer) {
    if (
      invoice.customer_prev_balance !== null &&
      invoice.customer_prev_balance !== undefined
    ) {
      prevBalance = Number(invoice.customer_prev_balance);
      newBalance = isCancelled
        ? prevBalance
        : prevBalance + (Number(invoice.total) - paidOnDate);
    } else {
      const custId = invoice.customer.id;
      const invDate = invoice.created_at || invoice.invoice_date;
      const opening = Number(invoice.customer.opening_balance || 0);

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
    <div style={{ minHeight: '100vh', backgroundColor: '#e2e8f0', padding: '0.5rem', fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif", direction: 'rtl', letterSpacing: '0px' }}>
      <style>{`
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            direction: rtl !important;
            letter-spacing: 0px !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          #statement {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border: 1.5px solid #1e293b !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          th {
            white-space: nowrap !important;
            word-break: keep-all !important;
            border: 1px solid #1e293b !important;
            background-color: #1e293b !important;
            color: #ffffff !important;
          }
          td {
            white-space: normal !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            border: 1px solid #64748b !important;
            color: #000000 !important;
          }
          td.nowrap, th.nowrap {
            white-space: nowrap !important;
            word-break: keep-all !important;
          }
          tr, .no-split-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      <div
        id="statement"
        className="print-page"
        style={{
          maxWidth: '740px',
          width: '100%',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          border: '1.5px solid #64748b',
          direction: 'rtl',
          textAlign: 'right',
          color: '#000000',
          boxSizing: 'border-box',
          letterSpacing: '0px',
        }}
      >
        {/* Top Accent Line */}
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${C.orange} 0%, ${C.darkOrange} 100%)` }} />

        {/* Header */}
        <div
          className="no-split-block"
          style={{
            padding: '0.45rem 0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1.5px solid #64748b',
            background: '#ffffff',
          }}
        >
          {/* Logo & Store Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                padding: '2px',
                border: `2px solid ${C.orange}`,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={LOGO_BASE64}
                alt="النزلاوي"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#000000', lineHeight: 1.15 }}>
                النزلاوي لتجارة وتوزيع الأدوات الكهربائية
              </div>
              <div style={{ fontSize: '0.7rem', color: '#1e293b', fontWeight: 700, marginTop: '2px' }}>
                للأجهزة الكهربائية والإضاءة الحديثة
              </div>
            </div>
          </div>

          {/* Invoice Type & Meta Pill */}
          <div style={{ textAlign: 'left' }}>
            <div
              className="nowrap"
              style={{
                display: 'inline-block',
                background: isCancelled ? '#fee2e2' : '#ffedd5',
                border: `1.5px solid ${isCancelled ? '#dc2626' : '#ea580c'}`,
                color: isCancelled ? '#991b1b' : '#9a3412',
                padding: '2px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}
            >
              {isCancelled ? 'فاتورة ملغاة 🚫' : `فاتورة ${invoice.invoice_type}`}
            </div>
            <div className="nowrap" style={{ fontSize: '0.76rem', marginTop: '3px', color: '#0f172a', whiteSpace: 'nowrap', fontWeight: 700 }}>
              <span style={{ color: '#334155' }}>رقم: </span>
              <strong style={{ fontFamily: 'monospace', color: '#000000', fontWeight: 900 }}>#{invoice.invoice_number}</strong>
              <span style={{ margin: '0 5px', color: '#64748b' }}>|</span>
              <span style={{ color: '#334155' }}>التاريخ: </span>
              <strong style={{ color: '#000000', fontWeight: 900 }}>{formatDate(invoice.invoice_date)}</strong>
            </div>
          </div>
        </div>

        {/* Customer & Store Info Bar */}
        <div
          className="no-split-block"
          style={{
            backgroundColor: '#f1f5f9',
            borderBottom: '1.5px solid #64748b',
            padding: '0.35rem 0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
          }}
        >
          {invoice.customer ? (
            <div>
              <span style={{ color: '#334155', fontWeight: 700 }}>العميل: </span>
              <strong style={{ fontSize: '0.88rem', color: '#000000', fontWeight: 900 }}>{invoice.customer.name}</strong>
              {invoice.customer.phone && (
                <span style={{ color: '#1e293b', marginRight: '10px', fontWeight: 700 }}>📞 {invoice.customer.phone}</span>
              )}
            </div>
          ) : (
            <div>
              <span style={{ color: '#334155', fontWeight: 700 }}>العميل: </span>
              <strong style={{ color: '#000000', fontWeight: 900 }}>عميل نقدي</strong>
            </div>
          )}

          {invoice.store && (
            <div>
              <span style={{ color: '#334155', fontWeight: 700 }}>المخزن: </span>
              <strong style={{ color: '#000000', fontWeight: 800 }}>{invoice.store.name}</strong>
            </div>
          )}
        </div>

        {/* Items Table — Razor-Sharp Crisp Borders & High-Contrast Typography */}
        <table className="print-table" style={{ width: '100%', tableLayout: 'fixed', fontSize: '0.76rem', borderCollapse: 'collapse', direction: 'rtl', border: '1.5px solid #1e293b' }}>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '48%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
              <th className="nowrap" style={{ padding: '5px 4px', textAlign: 'center', whiteSpace: 'nowrap', border: '1px solid #334155', fontWeight: 900, color: '#ffffff' }}>م</th>
              <th className="nowrap" style={{ padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap', border: '1px solid #334155', fontWeight: 900, color: '#ffffff' }}>الصنف</th>
              <th className="nowrap" style={{ padding: '5px 4px', textAlign: 'center', whiteSpace: 'nowrap', border: '1px solid #334155', fontWeight: 900, color: '#ffffff' }}>الكمية</th>
              <th className="nowrap" style={{ padding: '5px 6px', textAlign: 'center', whiteSpace: 'nowrap', border: '1px solid #334155', fontWeight: 900, color: '#ffffff' }}>السعر</th>
              <th className="nowrap" style={{ padding: '5px 6px', textAlign: 'center', whiteSpace: 'nowrap', border: '1px solid #334155', fontWeight: 900, color: '#ffffff' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr
                key={it.id}
                style={{
                  backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff',
                }}
              >
                <td className="nowrap" style={{ padding: '3.5px 4px', textAlign: 'center', color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap', border: '1px solid #94a3b8', fontSize: '0.76rem' }}>
                  {i + 1}
                </td>
                <td style={{ padding: '3.5px 8px', fontWeight: 700, color: '#000000', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.25, border: '1px solid #94a3b8' }}>
                  {it.product_name}
                </td>
                <td className="nowrap" style={{ padding: '3.5px 4px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000000', whiteSpace: 'nowrap', border: '1px solid #94a3b8', fontSize: '0.82rem' }}>
                  {Number(it.quantity)}
                </td>
                <td className="nowrap" style={{ padding: '3.5px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#000000', whiteSpace: 'nowrap', border: '1px solid #94a3b8', fontSize: '0.82rem' }}>
                  {formatEGP(Number(it.unit_price))}
                </td>
                <td className="nowrap" style={{ padding: '3.5px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, color: '#000000', whiteSpace: 'nowrap', border: '1px solid #94a3b8', fontSize: '0.86rem' }}>
                  {formatEGP(Number(it.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary & Totals */}
        <div
          className="no-split-block"
          style={{
            padding: '0.45rem 0.75rem',
            borderTop: '2px solid #ea580c',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '3px' }}>
            <span style={{ color: '#1e293b', fontWeight: 700 }}>الإجمالي قبل الخصم:</span>
            <span className="nowrap" style={{ fontFamily: 'monospace', fontWeight: 800, color: '#000000', fontSize: '0.86rem', whiteSpace: 'nowrap' }}>
              {formatEGP(Number(invoice.subtotal))} ج
            </span>
          </div>

          {Number(invoice.discount) > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
                color: '#92400e',
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                padding: '2px 8px',
                borderRadius: '4px',
                marginBottom: '3px',
              }}
            >
              <span style={{ fontWeight: 700 }}>الخصم:</span>
              <span className="nowrap" style={{ fontFamily: 'monospace', fontWeight: 800, whiteSpace: 'nowrap' }}>
                - {formatEGP(Number(invoice.discount))} ج
              </span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1.05rem',
              fontWeight: 900,
              borderTop: '1.5px solid #1e293b',
              backgroundColor: '#fef2f2',
              padding: '4px 8px',
              borderRadius: '4px',
              marginTop: '4px',
              color: '#991b1b',
            }}
          >
            <span>إجمالي الفاتورة:</span>
            <span className="nowrap" style={{ fontFamily: 'monospace', whiteSpace: 'nowrap', fontSize: '1.18rem', fontWeight: 900 }}>
              {formatEGP(Number(invoice.total))} ج
            </span>
          </div>
        </div>

        {/* Customer Balance Section (Compact with Clear Grid) */}
        {hasCustomer && prevBalance !== null && newBalance !== null && (
          <div
            className="no-split-block"
            style={{
              margin: '0 0.75rem 0.4rem 0.75rem',
              borderRadius: '6px',
              border: `1.5px solid ${isCancelled ? '#ef4444' : '#64748b'}`,
              backgroundColor: isCancelled ? '#fff1f2' : '#ffffff',
              fontSize: '0.76rem',
              overflow: 'hidden',
            }}
          >
            {isCancelled && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800, textAlign: 'center', borderBottom: '1px solid #ef4444' }}>
                🚫 تنبيه: هذه الفاتورة ملغاة ولا تؤثر على حساب العميل
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isCancelled ? '1fr 1fr' : paidOnDate > 0 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                textAlign: 'center',
                borderBottom: `1px solid ${isCancelled ? '#fca5a5' : '#64748b'}`,
                backgroundColor: isCancelled ? '#ffe4e6' : '#e2e8f0',
                padding: '4px 0',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              <div className="nowrap" style={{ whiteSpace: 'nowrap', borderLeft: '1px solid #cbd5e1' }}>الحساب السابق</div>
              {!isCancelled && <div className="nowrap" style={{ whiteSpace: 'nowrap', borderLeft: '1px solid #cbd5e1' }}>+ الفاتورة الحالية</div>}
              {!isCancelled && paidOnDate > 0 && <div className="nowrap" style={{ color: '#15803d', whiteSpace: 'nowrap', borderLeft: '1px solid #cbd5e1' }}>- المدفوع</div>}
              <div className="nowrap" style={{ color: '#000000', whiteSpace: 'nowrap' }}>{isCancelled ? 'رصيد العميل' : '= المتبقي على العميل'}</div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isCancelled ? '1fr 1fr' : paidOnDate > 0 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                textAlign: 'center',
                padding: '4px 0',
                fontFamily: 'monospace',
                fontWeight: 900,
                backgroundColor: '#ffffff',
              }}
            >
              <div className="nowrap" style={{ color: prevBalance > 0.01 ? '#b91c1c' : prevBalance < -0.01 ? '#15803d' : '#0f172a', whiteSpace: 'nowrap', borderLeft: '1px solid #cbd5e1' }}>
                {formatEGP(prevBalance)} ج
              </div>
              {!isCancelled && (
                <div className="nowrap" style={{ color: '#c2410c', whiteSpace: 'nowrap', borderLeft: '1px solid #cbd5e1' }}>
                  +{formatEGP(Number(invoice.total))} ج
                </div>
              )}
              {!isCancelled && paidOnDate > 0 && (
                <div className="nowrap" style={{ color: '#15803d', whiteSpace: 'nowrap', borderLeft: '1px solid #cbd5e1' }}>
                  -{formatEGP(paidOnDate)} ج
                </div>
              )}
              <div className="nowrap" style={{ color: newBalance > 0.01 ? '#b91c1c' : newBalance < -0.01 ? '#15803d' : '#000000', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                {formatEGP(newBalance)} ج
              </div>
            </div>
          </div>
        )}

        {/* Compact Footer */}
        <div
          className="no-split-block"
          style={{
            backgroundColor: '#f8fafc',
            padding: '0.4rem 0.75rem',
            borderTop: '1.5px solid #64748b',
            textAlign: 'center',
            fontSize: '0.72rem',
            color: '#0f172a',
            lineHeight: 1.35,
          }}
        >
          <div style={{ fontWeight: 800, color: '#000000', marginBottom: '2px' }}>
            شكراً لتعاملكم معنا في النزلاوي • 📍 الفيوم - دله شارع نادي قارون بجوار كافيه الثورة
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', fontWeight: 700, color: '#1e293b' }}>
            <span>📞 الحاج: <strong style={{ color: '#c2410c', fontWeight: 800 }}>01006172668</strong></span>
            <span>المخزن: <strong style={{ color: '#c2410c', fontWeight: 800 }}>01119209017</strong></span>
            <span>المحاسب: <strong style={{ color: '#c2410c', fontWeight: 800 }}>01095463383</strong></span>
          </div>
          {isTax && (
            <div style={{ marginTop: '2px', color: '#0f172a', fontSize: '0.68rem', borderTop: '1px dashed #94a3b8', paddingTop: '2px', fontWeight: 700 }}>
              ⚖️ التسجيل الضريبي: <strong style={{ color: '#b91c1c' }}>634 - 128 - 467</strong> | الربع - النزلة - يوسف الصديق
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
