"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatDate, statusColor } from "@/lib/format";

interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  opening_balance: number;
  balance: number;
  notes: string | null;
}
interface Payment {
  id: string; payment_date: string; amount: number; payment_method: string; notes: string | null;
  treasury?: { id: string; name: string } | null;
}
interface Invoice {
  id: string; invoice_number: number; invoice_date: string; status: string; total: number;
}
const METHODS = ["نقدي", "إنستاباي", "فودافون كاش", "تحويل بنكي", "شيك"];

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCollect, setShowCollect] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/customers/${params.id}`);
        const json = await res.json();
        setCustomer(json?.data ?? null);
      } catch {
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id]);

  if (loading) return <div className="card py-12 text-center text-gray-500">⏳ جاري التحميل...</div>;

  if (!customer) {
    return <div className="space-y-4">
      <button onClick={() => router.back()} className="btn-secondary">↩️ العودة</button>
      <div className="card py-12 text-center text-gray-500">لا توجد بيانات لهذا العميل</div>
    </div>;
  }

  return (
    <div className="space-y-4">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-650">👤 {customer.name}</h1>
          <p className="text-sm text-gray-500">تفاصيل العميل</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-secondary text-sm">✏️ تعديل</button>
          <button onClick={() => deleteCustomer(customer, router)} className="text-sm px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">🗑️ حذف</button>
          <button onClick={() => router.back()} className="btn-secondary">↩️ العودة</button>
        </div>
      </div>

      {/* قسم بيانات العميل */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div>
            <p className="text-sm text-gray-500">الهاتف</p>
            <p className="font-semibold">{customer.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">واتساب</p>
            <p className="font-semibold">{customer.whatsapp || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">العنوان</p>
            <p className="font-semibold">{customer.address || '—'}</p>
          </div>
        </div>

        <div className="card space-y-3">
          <div>
            <p className="text-sm text-gray-500">الرصيد الافتتاحي</p>
            <p className="font-semibold">{formatEGP(customer.opening_balance)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">الرصيد الحالي</p>
            <p className={`font-bold text-lg ${Number(customer.balance) > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatEGP(customer.balance)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">الملاحظات</p>
            <p className="font-semibold">{customer.notes || '—'}</p>
          </div>
        </div>
      </div>

      {/* قسم كشف الحساب */}
      <StatementSection customerId={customer.id} balance={Number(customer.balance)} onCollect={() => setShowCollect(true)} />

      {/* قسم فواتير العميل */}
      <InvoicesSection customerId={customer.id} />

      {showCollect && (
        <CollectForm customerId={customer.id} onClose={() => setShowCollect(false)} onSaved={() => { setShowCollect(false); router.refresh(); }} />
      )}

      {showEdit && (
        <EditForm customer={customer} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); router.refresh(); }} />
      )}
    </div>
  );
}

// حذف العميل (آمن)
async function deleteCustomer(customer: CustomerDetail, router: ReturnType<typeof useRouter>) {
  if (!confirm(`حذف العميل "${customer.name}"؟`)) return;
  const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) {
    alert('❌ ' + (json?.error?.message || json?.error?.code || 'تعذّر الحذف'));
    return;
  }
  alert(json?.data?.soft_deleted ? '✅ تم إخفاء العميل (له حركات تاريخية)' : '✅ تم حذف العميل');
  router.push('/customers');
}

/* ============================================
   قسم كشف الحساب
============================================ */
function StatementSection({ customerId, balance, onCollect }: { customerId: string; balance: number; onCollect: () => void }) {
  const { data, loading } = useApi<{ items: Payment[]; total_amount: number }>(`/api/payments/customers?customer_id=${customerId}&limit=9999`);
  const payments = data?.items || [];
  const totalPaid = data?.total_amount || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">📋 كشف الحساب</h2>
        <button onClick={onCollect} className="btn-primary text-sm">+ تحصيل جديد</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">رصيد مدين (له علينا)</div>
          <div className={`text-2xl font-bold ${balance > 0 ? "text-red-700" : "text-green-700"}`}>{formatEGP(balance)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">إجمالي المدفوعات</div>
          <div className="text-2xl font-bold text-blue-700">{formatEGP(totalPaid)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">عدد الحركات</div>
          <div className="text-2xl font-bold text-slate-650">{payments.length}</div>
        </div>
      </div>

      {loading ? <div className="card text-center py-8 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">الخزينة</th>
                <th className="p-3 text-right">طريقة الدفع</th>
                <th className="p-3 text-right">البيان</th>
                <th className="p-3 text-right">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-xs">{formatDate(p.payment_date)}</td>
                  <td className="p-3 text-xs text-gray-600">{p.treasury?.name || '—'}</td>
                  <td className="p-3 text-xs">{p.payment_method}</td>
                  <td className="p-3">{p.notes || 'تحصيل من عميل'}</td>
                  <td className="p-3 font-mono font-bold text-green-700">{formatEGP(p.amount)}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">لا توجد حركات</td></tr>}
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={4} className="p-3 text-left">الإجمالي:</td>
                  <td className="p-3 font-mono">{formatEGP(totalPaid)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================
   قسم فواتير العميل
============================================ */
function InvoicesSection({ customerId }: { customerId: string }) {
  const { data, loading } = useApi<{ items: Invoice[] }>(`/api/sales/invoices?customer_id=${customerId}&limit=200`);
  const invoices = data?.items || [];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">🛒 فواتير العميل</h2>
      {loading ? <div className="card text-center py-8 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">رقم</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold">#{inv.invoice_number}</td>
                  <td className="p-3 text-xs">{formatDate(inv.invoice_date)}</td>
                  <td className="p-3 font-bold text-nazlawy-600">{formatEGP(inv.total)}</td>
                  <td className="p-3"><span className={`badge ${statusColor(inv.status)}`}>{inv.status}</span></td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا توجد فواتير</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================
   نموذج تعديل بيانات العميل
============================================ */
function EditForm({ customer, onClose, onSaved }: { customer: CustomerDetail; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: customer.name,
    phone: customer.phone || '',
    whatsapp: customer.whatsapp || '',
    address: customer.address || '',
    opening_balance: customer.opening_balance,
    notes: customer.notes || '',
  });
  const { mutate, loading } = useApiMutation();

  async function save() {
    if (!f.name.trim()) { alert('❌ اسم العميل مطلوب'); return; }
    const { error } = await mutate('PATCH', `/api/customers/${customer.id}`, {
      name: f.name.trim(),
      phone: f.phone || null,
      whatsapp: f.whatsapp || null,
      address: f.address || null,
      opening_balance: Number(f.opening_balance) || 0,
      notes: f.notes || null,
    });
    if (error) { alert('❌ ' + error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3">
        <h2 className="text-xl font-bold">✏️ تعديل بيانات العميل</h2>
        <div><label className="text-sm font-medium block mb-1">اسم العميل *</label><input className="input-field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium block mb-1">الهاتف</label><input className="input-field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><label className="text-sm font-medium block mb-1">واتساب</label><input className="input-field" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
        </div>
        <div><label className="text-sm font-medium block mb-1">العنوان</label><input className="input-field" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div>
          <label className="text-sm font-medium block mb-1">الرصيد الافتتاحي</label>
          <input type="number" step="0.01" className="input-field" value={f.opening_balance} onChange={(e) => setF({ ...f, opening_balance: parseFloat(e.target.value) || 0 })} />
          <p className="text-xs text-orange-600 mt-1">⚠️ تعديل الرصيد الافتتاحي يغيّر الرصيد الحالي مباشرة</p>
        </div>
        <div><label className="text-sm font-medium block mb-1">ملاحظات</label><textarea className="input-field" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="flex gap-2 pt-3"><button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button><button onClick={onClose} className="btn-secondary">إلغاء</button></div>
      </div>
    </div>
  );
}

/* ============================================
   نموذج التحصيل السريع
============================================ */
function CollectForm({ customerId, onClose, onSaved }: { customerId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ amount: 0, payment_method: 'نقدي', treasury_id: '', payment_date: '', notes: '' });
  const { mutate, loading } = useApiMutation();
  const [treasuries, setTreasuries] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/treasury').then(r => r.json()).then(j => setTreasuries(j.data?.items || [])).catch(() => {});
  }, []);

  async function save() {
    if (!f.treasury_id || f.amount <= 0) { alert('❌ أكمل البيانات'); return; }
    const { error } = await mutate('POST', '/api/payments/customers', { ...f, customer_id: customerId });
    if (error) { alert('❌ ' + error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3">
        <h2 className="text-xl font-bold">+ تحصيل من العميل</h2>
        <div><label className="text-sm font-medium block mb-1">المبلغ *</label><input type="number" step="0.01" className="input-field" value={f.amount} onChange={(e) => setF({ ...f, amount: parseFloat(e.target.value) || 0 })} autoFocus /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">طريقة الدفع</label>
            <select className="input-field" value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">الخزينة *</label>
            <select className="input-field" value={f.treasury_id} onChange={(e) => setF({ ...f, treasury_id: e.target.value })}>
              <option value="">اختر...</option>
              {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div><label className="text-sm font-medium block mb-1">التاريخ</label><input type="date" className="input-field" value={f.payment_date} onChange={(e) => setF({ ...f, payment_date: e.target.value })} /></div>
        <div><label className="text-sm font-medium block mb-1">ملاحظات</label><input className="input-field" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="flex gap-2 pt-3"><button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'جاري الحفظ...' : 'حفظ'}</button><button onClick={onClose} className="btn-secondary">إلغاء</button></div>
      </div>
    </div>
  );
}
