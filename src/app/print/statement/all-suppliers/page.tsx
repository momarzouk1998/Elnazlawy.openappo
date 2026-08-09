import { prisma } from '@/lib/db/prisma-direct';
import { formatEGP, formatDate } from '@/lib/format';
import PrintActions from '@/app/print/invoice/[id]/PrintActions';

export const dynamic = 'force-dynamic';

const C = {
  orange: '#f56226',
  darkOrange: '#d9531e',
  gray: '#677077',
  text: '#343a40',
  lightBg: '#f8f9fa',
  border: '#dee2e6',
  success: '#28a745',
  danger: '#dc3545',
  white: '#ffffff',
  muted: '#6c757d',
} as const;

export default async function AllSuppliersStatementPage() {
  const suppliers = await prisma.suppliers.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      phone: true,
      balance: true,
      opening_balance: true,
      purchase_invoices: {
        where: { status: { not: 'ملغاة' } },
        select: { total_amount: true },
      },
      payments: {
        select: { amount: true },
      },
      return_invoices: {
        where: { status: { not: 'ملغاة' } },
        select: { total_amount: true },
      },
    },
  });

  const rows = suppliers.map(s => {
    const totalInvoices = s.purchase_invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    const totalPayments = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalReturns = s.return_invoices.reduce((sum, r) => sum + Number(r.total_amount), 0);
    const netBalance = Number(s.balance);
    const statusLabel = netBalance > 0 ? 'مستحق علينا' : netBalance < 0 ? 'لصالحنا' : 'خالص';

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      totalInvoices,
      totalPayments,
      totalReturns,
      netBalance,
      statusLabel,
    };
  });

  const grandTotalInvoices = rows.reduce((s, r) => s + r.totalInvoices, 0);
  const grandTotalPayments = rows.reduce((s, r) => s + r.totalPayments, 0);
  const grandTotalReturns = rows.reduce((s, r) => s + r.totalReturns, 0);
  const grandBalance = rows.reduce((s, r) => s + r.netBalance, 0);
  const suppliersWithDebt = rows.filter(r => r.netBalance > 0).length;
  const suppliersSettled = rows.filter(r => r.netBalance === 0).length;

  const n = (v: number) => formatEGP(v);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '1rem', fontFamily: "'Cairo', 'Segoe UI', sans-serif", direction: 'rtl' }}>
      <PrintActions
        backLink="/suppliers"
        backLabel="↩️ العودة للموردين"
        fileName="كشف حساب مجمع - كل الموردين"
        targetId="statement"
      />

      <div id="statement" style={{
        maxWidth: '800px', width: '800px', margin: '0 auto', background: C.white,
        borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        overflow: 'hidden', border: `1px solid ${C.border}`, fontFamily: "'Cairo', 'Segoe UI', sans-serif",
        direction: 'rtl', textAlign: 'right', color: C.text,
      }}>

        {/* Top accent bar */}
        <div style={{ height: '4px', width: '100%', background: `linear-gradient(90deg, ${C.orange} 0%, ${C.darkOrange} 50%, ${C.gray} 100%)` }} />

        {/* Header */}
        <div style={{
          padding: '1.2rem 1.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: C.white, borderBottom: `2px solid ${C.gray}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: C.white, borderRadius: '12px', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: `2px solid ${C.orange}`,
              width: '60px', height: '60px',
            }}>
              <img src="/elnazlawy-logo.png" alt="النزلاوي" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: C.gray, lineHeight: 1.2 }}>معرض النزلاوي</div>
              <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 400 }}>لتجارة وتوزيع الأجهزة الكهربائية والإضاءة الحديثة</div>
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{
              display: 'inline-block', background: `linear-gradient(90deg, ${C.gray} 0%, ${C.orange} 100%)`,
              color: C.white, padding: '5px 18px', borderRadius: '20px',
              fontSize: '0.85rem', fontWeight: 800, boxShadow: '0 2px 6px rgba(245,98,38,0.25)',
            }}>
              كشف مجمع — كل الموردين
            </div>
            <div style={{ fontSize: '0.8rem', color: C.muted, fontWeight: 700, marginTop: '6px' }}>
              تاريخ الاستخراج: {formatDate(new Date())}
            </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem 1.8rem' }}>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <div style={{ background: `linear-gradient(135deg, ${C.white}, ${C.lightBg})`, border: `2px solid ${C.orange}`, borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.3rem' }}>عدد الموردين</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.orange }}>{rows.length}</div>
            </div>
            <div style={{ background: `linear-gradient(135deg, ${C.white}, ${C.lightBg})`, border: `2px solid ${C.danger}`, borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.3rem' }}>موردين مستحق لهم</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.danger }}>{suppliersWithDebt}</div>
            </div>
            <div style={{ background: `linear-gradient(135deg, ${C.white}, ${C.lightBg})`, border: `2px solid ${C.success}`, borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.3rem' }}>موردين خالصون</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.success }}>{suppliersSettled}</div>
            </div>
            <div style={{ background: `linear-gradient(135deg, ${C.white}, ${C.lightBg})`, border: `2px solid ${C.gray}`, borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.3rem' }}>إجمالي المرتجعات</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: C.gray }}>{n(grandTotalReturns)}</div>
            </div>
          </div>

          {/* Suppliers table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: C.gray, color: C.white }}>
                <th style={{ padding: '10px', textAlign: 'center', border: `1px solid ${C.border}`, width: '30px' }}>#</th>
                <th style={{ padding: '10px', textAlign: 'right', border: `1px solid ${C.border}` }}>اسم المورد</th>
                <th style={{ padding: '10px', textAlign: 'center', border: `1px solid ${C.border}` }}>حالة الحساب</th>
                <th style={{ padding: '10px', textAlign: 'center', border: `1px solid ${C.border}` }}>إجمالي المشتريات</th>
                <th style={{ padding: '10px', textAlign: 'center', border: `1px solid ${C.border}` }}>إجمالي المدفوعات</th>
                <th style={{ padding: '10px', textAlign: 'center', border: `1px solid ${C.border}` }}>صافي الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const textColor = r.netBalance > 0 ? C.danger : r.netBalance < 0 ? C.success : C.muted;
                return (
                  <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? C.white : C.lightBg }}>
                    <td style={{ padding: '9px', textAlign: 'center', border: `1px solid ${C.border}` }}>{i + 1}</td>
                    <td style={{ padding: '9px', fontWeight: 700, border: `1px solid ${C.border}` }}>{r.name}</td>
                    <td style={{ padding: '9px', textAlign: 'center', border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: textColor }}>
                        {r.statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '9px', textAlign: 'center', fontWeight: 700, color: C.danger, border: `1px solid ${C.border}` }}>
                      {n(r.totalInvoices)}
                    </td>
                    <td style={{ padding: '9px', textAlign: 'center', fontWeight: 700, color: C.success, border: `1px solid ${C.border}` }}>
                      {n(r.totalPayments)}
                    </td>
                    <td style={{ padding: '9px', textAlign: 'center', fontWeight: 800, color: C.orange, border: `1px solid ${C.border}`, fontFamily: 'monospace' }}>
                      {n(r.netBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: C.orange, color: C.white, fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '10px', border: `1px solid ${C.border}`, textAlign: 'center' }}>الإجماليات</td>
                <td style={{ padding: '10px', textAlign: 'center', border: `1px solid ${C.border}` }}>{n(grandTotalInvoices)}</td>
                <td style={{ padding: '10px', textAlign: 'center', border: `1px solid ${C.border}` }}>{n(grandTotalPayments)}</td>
                <td style={{ padding: '10px', textAlign: 'center', border: `1px solid ${C.border}`, fontWeight: 800 }}>{n(grandBalance)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Balance summary */}
          <div style={{
            background: `linear-gradient(135deg, ${C.orange}, ${C.darkOrange})`,
            color: C.white, borderRadius: '12px', padding: '1.5rem', textAlign: 'center',
            boxShadow: '0 6px 20px rgba(245, 98, 38, 0.3)',
          }}>
            <div style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '0.4rem' }}>إجمالي المستحق لكل الموردين</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.4rem' }}>
              {n(grandBalance)} جنيه
            </div>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                {suppliersWithDebt} مورد مستحق له من أصل {rows.length}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: C.lightBg, padding: '1rem', borderTop: `1px solid ${C.border}`,
          textAlign: 'center', color: '#666', fontSize: '0.82rem',
        }}>
          <p style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '4px' }}>معرض النزلاوي — الفيوم - دلة</p>
          <p style={{ margin: 0 }}>📞 أ/محمود حسين: <span style={{ fontWeight: 700, color: C.orange }}>01006172668</span></p>
        </div>
      </div>
    </div>
  );
}
