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

  // الرصيد السابق = الرصيد الحالي - صافي الزيادة (الإجمالي - المدفوع)
  const hasCustomer = !!invoice.customer;
  const paid = Number(invoice.paid_amount || 0);
  const netAdded = Number(invoice.total) - paid;
  const prevBalance = hasCustomer
    ? Number(invoice.customer!.balance) - netAdded
    : null;
  const newBalance = hasCustomer ? Number(invoice.customer!.balance) : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '0.75rem', fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif" }}>
      <PrintActions
        autoprint={autoprint}
        fileName={`فاتورة ${invoice.invoice_type} - ${invoice.invoice_number}`}
        targetId="statement"
      />

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
                background: C.orange,
                color: C.white,
                padding: '3px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 800,
              }}
            >
              فاتورة {invoice.invoice_type}
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

          {paid > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.85rem',
                color: C.green,
                fontWeight: 700,
                marginTop: '3px',
              }}
            >
              <span>المدفوع نقداً:</span>
              <span style={{ fontFamily: 'monospace' }}>- {formatEGP(paid)} ج</span>
            </div>
          )}

          {paid > 0 && Number(invoice.total) - paid > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.9rem',
                color: C.darkOrange,
                fontWeight: 800,
                borderTop: `1px dotted ${C.border}`,
                paddingTop: '3px',
                marginTop: '3px',
              }}
            >
              <span>المتبقي من الفاتورة:</span>
              <span style={{ fontFamily: 'monospace' }}>{formatEGP(Number(invoice.total) - paid)} ج</span>
            </div>
          )}
        </div>

        {/* Customer Balance Section (Compact) */}
        {hasCustomer && prevBalance !== null && newBalance !== null && (
          <div
            style={{
              margin: '0 1rem 0.6rem 1rem',
              borderRadius: '8px',
              border: `1px solid ${C.border}`,
              backgroundColor: '#f8fafc',
              fontSize: '0.78rem',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: paid > 0 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                textAlign: 'center',
                borderBottom: `1px solid ${C.border}`,
                backgroundColor: '#f1f5f9',
                padding: '4px 0',
                fontWeight: 700,
                color: C.muted,
              }}
            >
              <div>الحساب السابق</div>
              <div>الفاتورة</div>
              {paid > 0 && <div>المدفوع منها</div>}
              <div style={{ color: C.dark }}>الرصيد النهائي</div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: paid > 0 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                textAlign: 'center',
                padding: '5px 0',
                fontFamily: 'monospace',
                fontWeight: 800,
              }}
            >
              <div style={{ color: prevBalance > 0.01 ? C.red : prevBalance < -0.01 ? C.green : C.muted }}>
                {formatEGP(prevBalance)} ج
              </div>
              <div style={{ color: C.darkOrange }}>
                +{formatEGP(Number(invoice.total))} ج
              </div>
              {paid > 0 && (
                <div style={{ color: C.green }}>
                  -{formatEGP(paid)} ج
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
    </div>
  );
}
