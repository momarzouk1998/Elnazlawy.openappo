import { prisma } from '@/lib/db/prisma-direct';
import { notFound } from 'next/navigation';
import { formatEGP, formatDate } from '@/lib/format';
import PrintActions from './PrintActions';
import { LOGO_BASE64 } from '@/lib/logo-base64';

export const dynamic = 'force-dynamic';

const C = {
  orange: '#f56226',
  darkOrange: '#d9531e',
  gray: '#111315',
  lightGray: '#f8f9fa',
  border: '#e5e7eb',
  text: '#1f2937',
  muted: '#6b7280',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#d97706',
  yellowBg: '#fef3c7',
  white: '#ffffff',
  slate: '#677077',
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

  // الرصيد السابق = الرصيد الحالي - قيمة الفاتورة (لأن الفاتورة أُضيفت بالفعل)
  const hasCustomer = !!invoice.customer;
  const prevBalance = hasCustomer
    ? Number(invoice.customer!.balance) - Number(invoice.total)
    : null;
  const newBalance = hasCustomer ? Number(invoice.customer!.balance) : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '1rem', fontFamily: "'Cairo', 'Segoe UI', sans-serif" }}>
      <PrintActions
        autoprint={autoprint}
        fileName={`فاتورة ${invoice.invoice_type} - ${invoice.invoice_number}`}
        targetId="statement"
      />

      <div
        id="statement"
        className="print-page"
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: C.white,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          border: `1px solid ${C.border}`,
          direction: 'rtl',
          textAlign: 'right',
          color: C.text,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(180deg, #111315 0%, #1d1f22 100%)',
            color: C.white,
            padding: '1.25rem',
            borderBottom: `4px solid ${C.orange}`,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '90px',
              height: '90px',
              backgroundColor: C.white,
              borderRadius: '12px',
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
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1
              style={{
                fontSize: '1.9em',
                fontWeight: 800,
                lineHeight: 1.2,
                margin: 0,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              معرض النزلاوي
            </h1>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '4px' }}>
              لتجارة وتوزيع الأجهزة الكهربائية والإضاءة الحديثة
            </div>
          </div>
        </div>

        {/* Type ribbon */}
        <div
          style={{
            backgroundColor: C.orange,
            color: C.white,
            textAlign: 'center',
            fontWeight: 800,
            padding: '0.5rem',
            fontSize: '1.125rem',
          }}
        >
          فاتورة {invoice.invoice_type}
        </div>

        {/* Meta */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            rowGap: '0.35rem',
            fontSize: '0.875rem',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div>
            <span style={{ color: C.muted }}>رقم: </span>
            <strong style={{ fontFamily: 'monospace' }}>#{invoice.invoice_number}</strong>
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ color: C.muted }}>التاريخ: </span>
            <strong>{formatDate(invoice.invoice_date)}</strong>
          </div>
          {invoice.customer && (
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: C.muted }}>العميل: </span>
              <strong>{invoice.customer.name}</strong>
              {invoice.customer.phone && (
                <span style={{ color: C.muted, marginRight: '8px' }}>• {invoice.customer.phone}</span>
              )}
            </div>
          )}
          {invoice.store && (
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: C.muted }}>المخزن: </span>
              <strong>{invoice.store.name}</strong>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', fontSize: '0.85em', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: C.slate, color: C.white }}>
              <th style={{ padding: '8px', textAlign: 'center', width: '35px' }}>م</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>الصنف</th>
              <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>الكمية</th>
              <th style={{ padding: '8px', textAlign: 'left', width: '80px' }}>السعر</th>
              <th style={{ padding: '8px', textAlign: 'left', width: '90px' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr
                key={it.id}
                style={{
                  backgroundColor: i % 2 === 0 ? '#f8fbfd' : C.white,
                  borderBottom: `1px solid #f0f0f0`,
                }}
              >
                <td style={{ padding: '8px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ padding: '8px' }}>{it.product_name}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'monospace' }}>
                  {Number(it.quantity)}
                </td>
                <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'monospace' }}>
                  {formatEGP(Number(it.unit_price))}
                </td>
                <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {formatEGP(Number(it.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: `2px solid ${C.orange}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '4px' }}>
            <span>الإجمالي قبل الخصم:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {formatEGP(Number(invoice.subtotal))} ج
            </span>
          </div>
          {Number(invoice.discount) > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: C.yellow,
                backgroundColor: C.yellowBg,
                padding: '4px 8px',
                borderRadius: '4px',
                marginBottom: '4px',
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
              fontSize: '1.25rem',
              fontWeight: 800,
              borderTop: `1px solid ${C.border}`,
              paddingTop: '6px',
              color: C.red,
            }}
          >
            <span>إجمالي الفاتورة:</span>
            <span style={{ fontFamily: 'monospace' }}>{formatEGP(Number(invoice.total))} ج</span>
          </div>
        </div>

        {/* Account balance section */}
        {hasCustomer && prevBalance !== null && newBalance !== null && (
          <div
            style={{
              margin: '0 1.25rem 1rem 1.25rem',
              borderRadius: '12px',
              border: `2px solid ${C.orange}`,
              overflow: 'hidden',
              fontSize: '0.875rem',
            }}
          >
            <div
              style={{
                backgroundColor: C.orange,
                color: C.white,
                textAlign: 'center',
                fontWeight: 'bold',
                padding: '6px',
                fontSize: '0.75rem',
              }}
            >
              حساب العميل
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  borderBottom: `1px solid #f3f4f6`,
                }}
              >
                <span style={{ color: C.muted }}>الحساب السابق</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: prevBalance > 0.01 ? C.red : prevBalance < -0.01 ? C.green : C.muted,
                  }}
                >
                  {formatEGP(prevBalance)} ج
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  borderBottom: `1px solid #f3f4f6`,
                }}
              >
                <span style={{ color: C.muted }}>الفاتورة الحالية</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: C.darkOrange }}>
                  + {formatEGP(Number(invoice.total))} ج
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <span style={{ fontWeight: 'bold' }}>الرصيد المتبقي</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: newBalance > 0.01 ? C.red : newBalance < -0.01 ? C.green : C.text,
                  }}
                >
                  {formatEGP(newBalance)} ج
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            backgroundColor: C.lightGray,
            padding: '1rem',
            borderTop: `1px solid ${C.border}`,
            textAlign: 'center',
            color: '#666666',
            fontSize: '0.85em',
          }}
        >
          <p style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '1.1em', marginBottom: '8px' }}>
            شكراً لتعاملكم معنا في معرض النزلاوي
          </p>
          <p style={{ marginBottom: '8px', color: '#555555' }}>
            📍 الفيوم - دله شارع نادي قارون بجوار كافيه الثورة
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', fontWeight: 'bold', color: '#444444' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <span>رقم الحاج: <span style={{ color: C.orange }}>01006172668</span></span>
              <span>رقم المخزن: <span style={{ color: C.orange }}>01119209017</span></span>
            </div>
            <div>
              <span>المحاسب: <span style={{ color: C.orange }}>01095463383</span></span>
            </div>
          </div>
          {isTax && (
            <p style={{ marginTop: '8px', color: '#444444', borderTop: '1px dashed #cccccc', paddingTop: '8px' }}>
              ⚖️ التسجيل الضريبي: <strong style={{ color: '#d32f2f' }}>634 - 128 - 467</strong>
              &nbsp;&nbsp;العنوان الضريبي: <strong>الربع - النزلة - يوسف الصديق - الفيوم</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
