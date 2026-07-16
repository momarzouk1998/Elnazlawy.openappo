"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatDate } from "@/lib/format";

/* ============================================
   أنواع مشتركة
============================================ */
interface Supplier {
  id: string; name: string; phone: string | null; balance: number; opening_balance: number;
  address?: string | null;
}
interface Payment {
  id: string; payment_date: string; amount: number; payment_method: string; notes: string | null;
  supplier?: { id: string; name: string; phone: string | null } | null;
  treasury?: { id: string; name: string } | null;
}
interface Check {
  id: string; direction: string; bank_name: string | null; check_number: string | null;
  amount: number; issue_date: string; due_date: string; status: string; notes: string | null;
  supplier_id?: string | null;
  supplier?: { id: string; name: string } | null;
}

const TABS = [
  { key: 'suppliers', label: 'الموردين', icon: '🏭' },
  { key: 'payments', label: 'السداد', icon: '💸' },
  { key: 'checks', label: 'الشيكات', icon: '🧾' },
] as const;
type TabKey = typeof TABS[number]['key'];

const METHODS = ["نقدي", "إنستاباي", "فودافون كاش", "تحويل بنكي", "شيك"];

export default function SuppliersPage() {
  const [tab, setTab] = useState<TabKey>('suppliers');

  return (
    <div className="space-y-4">
      {/* شريط التبويبات */}
      <div className="flex gap-2 border-b">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-bold transition-all border-b-2 -mb-px ${
              tab === t.key ? 'border-nazlawy-500 text-nazlawy-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'checks' && <ChecksTab />}
    </div>
  );
}

/* ============================================
   تبويب الموردين
============================================ */
function SuppliersTab() {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const router = useRouter();
  const { data, loading, refetch } = useApi<{ items: Supplier[]; total: number }>(`/api/suppliers?search=${encodeURIComponent(search)}&limit=200`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{data?.total ?? '...'} مورد</p>
        <button onClick={() => setShow(true)} className="btn-primary">+ إضافة مورد</button>
      </div>

      <div className="card">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث..." className="input-field" autoFocus />
      </div>

      {/* كاردات إجماليات تتحرك مع البحث */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-xs text-gray-500">عدد الموردين</div>
          <div className="text-2xl font-extrabold text-slate-650">{data?.items.length ?? '...'}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">إجمالي المستحقات</div>
          <div className="text-2xl font-extrabold text-red-700">{formatEGP((data?.items || []).reduce((s, c) => s + Number(c.balance), 0))} ج</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">موردين عليهم مستحقات</div>
          <div className="text-2xl font-extrabold text-orange-700">{(data?.items || []).filter(c => Number(c.balance) > 0).length}</div>
        </div>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <>
          {/* Mobile: كاردات */}
          <div className="space-y-2 md:hidden">
            {data?.items.map(s => (
              <div
                key={s.id}
                onClick={() => router.push(`/reports/statements?type=supplier&id=${s.id}`)}
                className="card p-3 cursor-pointer hover:border-nazlawy-500 hover:shadow-md transition-all"
              >
                <div className="font-bold text-sm truncate mb-1">{s.name}</div>
                <div className="text-xs text-gray-500 font-mono mb-1.5">{s.phone || '—'}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">الرصيد:</span>
                  <span className={`font-bold font-mono ${s.balance > 0.01 ? 'text-red-700' : s.balance < -0.01 ? 'text-blue-700' : 'text-green-700'}`}>
                    {formatEGP(s.balance)} ج
                  </span>
                </div>
              </div>
            ))}
            {data?.items.length === 0 && (
              <div className="card text-center py-12 text-gray-400">لا يوجد موردين</div>
            )}
          </div>

          {/* Desktop: جدول */}
          <div className="card overflow-x-auto p-0 hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">الهاتف</th>
                  <th className="p-3 text-right">رصيد سابق</th>
                  <th className="p-3 text-right">الرصيد الحالي</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map(s => (
                  <tr key={s.id} onClick={() => router.push(`/reports/statements?type=supplier&id=${s.id}`)} className="border-t hover:bg-gray-50 cursor-pointer transition-colors hover:text-nazlawy-600">
                    <td className="p-3 font-semibold">{s.name}</td>
                    <td className="p-3 text-sm font-mono">{s.phone || '—'}</td>
                    <td className="p-3 font-mono text-xs">{formatEGP(s.opening_balance)}</td>
                    <td className="p-3 font-mono font-bold">{formatEGP(s.balance)}</td>
                  </tr>
                ))}
                {data?.items.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-gray-400">لا يوجد موردين</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {show && <SupplierForm onClose={() => setShow(false)} onSaved={() => { setShow(false); refetch(); }} />}
    </div>
  );
}

function SupplierForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', phone: '', address: '', opening_balance: 0 });
  const { mutate, loading } = useApiMutation();

  async function save() {
    if (!f.name.trim()) { alert('❌ اسم المورد مطلوب'); return; }
    const { error } = await mutate('POST', '/api/suppliers', f);
    if (error) { alert('❌ ' + error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-3">
        <h2 className="text-xl font-bold">+ إضافة مورد</h2>
        <div><label className="text-sm font-medium block mb-1">الاسم *</label><input className="input-field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
        <div><label className="text-sm font-medium block mb-1">الهاتف</label><input className="input-field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><label className="text-sm font-medium block mb-1">العنوان</label><input className="input-field" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div><label className="text-sm font-medium block mb-1">رصيد سابق (مستحق للمورد)</label><input type="number" step="0.01" className="input-field" value={f.opening_balance} onChange={(e) => setF({ ...f, opening_balance: parseFloat(e.target.value) || 0 })} /></div>
        <div className="flex gap-2 pt-3"><button onClick={save} disabled={loading || !f.name} className="btn-primary flex-1">{loading ? 'جاري الحفظ...' : 'حفظ'}</button><button onClick={onClose} className="btn-secondary">إلغاء</button></div>
      </div>
    </div>
  );
}

/* ============================================
   تبويب السداد
============================================ */
function PaymentsTab() {
  const [show, setShow] = useState(false);
  const { data, loading, refetch } = useApi<{ items: Payment[]; total: number; total_amount: number }>("/api/payments/suppliers?limit=200");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{data?.total ?? '...'} سداد • إجمالي: {data ? formatEGP(data.total_amount) : '...'} جنيه</p>
        <button onClick={() => setShow(true)} className="btn-primary">+ سداد جديد</button>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">المورد</th>
                <th className="p-3 text-right">الخزينة</th>
                <th className="p-3 text-right">طريقة الدفع</th>
                <th className="p-3 text-right">المبلغ</th>
                <th className="p-3 text-right">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-xs">{formatDate(p.payment_date)}</td>
                  <td className="p-3 font-semibold">{p.supplier?.name || '—'}</td>
                  <td className="p-3 text-xs text-gray-600">{p.treasury?.name || '—'}</td>
                  <td className="p-3 text-xs">{p.payment_method}</td>
                  <td className="p-3 font-mono font-bold text-red-700">{formatEGP(p.amount)}</td>
                  <td className="p-3 text-xs text-gray-500">{p.notes || '—'}</td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-400">لا توجد مدفوعات</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && <PaymentForm onClose={() => setShow(false)} onSaved={() => { setShow(false); refetch(); }} />}
    </div>
  );
}

function PaymentForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ supplier_id: '', amount: 0, payment_method: 'نقدي', treasury_id: '', payment_date: '', notes: '' });
  const { mutate, loading } = useApiMutation();
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [treasuries, setTreasuries] = useState<{ id: string; name: string }[]>([]);
  const [supSearch, setSupSearch] = useState("");

  useEffect(() => {
    fetch('/api/treasury').then(r => r.json()).then(j => setTreasuries(j.data?.items || [])).catch(() => {});
    fetch('/api/suppliers?limit=200').then(r => r.json()).then(j => setSuppliers(j.data?.items || [])).catch(() => {});
  }, []);

  const filtered = suppliers.filter(s => s.name.includes(supSearch)).slice(0, 50);

  async function save() {
    if (!f.supplier_id || !f.treasury_id || f.amount <= 0) { alert('❌ أكمل البيانات'); return; }
    const { error } = await mutate('POST', '/api/payments/suppliers', f);
    if (error) { alert('❌ ' + error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-3">
        <h2 className="text-xl font-bold">+ سداد لمورد</h2>
        <div>
          <label className="text-sm font-medium block mb-1">المورد *</label>
          <input className="input-field" placeholder="🔍 ابحث عن مورد..." value={supSearch} onChange={(e) => setSupSearch(e.target.value)} autoFocus />
          <select className="input-field mt-1" value={f.supplier_id} onChange={(e) => setF({ ...f, supplier_id: e.target.value })} size={4}>
            {filtered.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium block mb-1">المبلغ *</label><input type="number" step="0.01" className="input-field" value={f.amount} onChange={(e) => setF({ ...f, amount: parseFloat(e.target.value) || 0 })} /></div>
          <div>
            <label className="text-sm font-medium block mb-1">طريقة الدفع</label>
            <select className="input-field" value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">الخزينة *</label>
            <select className="input-field" value={f.treasury_id} onChange={(e) => setF({ ...f, treasury_id: e.target.value })}>
              <option value="">اختر...</option>
              {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><label className="text-sm font-medium block mb-1">التاريخ</label><input type="date" className="input-field" value={f.payment_date} onChange={(e) => setF({ ...f, payment_date: e.target.value })} /></div>
        </div>
        <div><label className="text-sm font-medium block mb-1">ملاحظات</label><input className="input-field" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="flex gap-2 pt-3"><button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'جاري الحفظ...' : 'حفظ'}</button><button onClick={onClose} className="btn-secondary">إلغاء</button></div>
      </div>
    </div>
  );
}

/* ============================================
   تبويب الشيكات (شيكات صادرة للموردين)
============================================ */
const STATUS_STYLES: Record<string, string> = {
  "تحت التحصيل": "bg-yellow-100 text-yellow-800",
  "تم الصرف": "bg-green-100 text-green-800",
  "مرفوض": "bg-red-100 text-red-800",
  "مُلغى": "bg-gray-100 text-gray-800",
};

function ChecksTab() {
  const [show, setShow] = useState(false);
  const { data, loading, refetch } = useApi<{ items: Check[]; total: number }>("/api/checks");
  const checks = data?.items || [];

  // الشيكات الصادرة للموردين بس + مرتبة بموعد الاستحقاق الأقرب
  const supplierChecks = checks
    .filter(c => c.direction === 'outgoing')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pending = supplierChecks.filter(c => c.status === 'تحت التحصيل');
  const dueSoon = pending.filter(c => {
    const due = new Date(c.due_date);
    const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days <= 7 && days >= 0;
  });
  const overdue = pending.filter(c => new Date(c.due_date) < today);

  const totalPending = pending.reduce((s, c) => s + Number(c.amount), 0);
  const totalDueSoon = dueSoon.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{supplierChecks.length} شيك صادر</p>
        <button onClick={() => setShow(true)} className="btn-primary">+ إضافة شيك</button>
      </div>

      {/* مؤشرات مواعيد السداد */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">إجمالي الشيكات تحت السداد</div>
          <div className="text-2xl font-bold text-orange-700">{formatEGP(totalPending)} ج</div>
        </div>
        <div className="card p-4 bg-yellow-50">
          <div className="text-sm text-yellow-800">⏰ قرب الاستحقاق (خلال 7 أيام)</div>
          <div className="text-2xl font-bold text-yellow-800">{formatEGP(totalDueSoon)} ج</div>
          <div className="text-xs text-yellow-700 mt-1">{dueSoon.length} شيك</div>
        </div>
        <div className="card p-4 bg-red-50">
          <div className="text-sm text-red-800">🚨 متأخرة السداد</div>
          <div className="text-2xl font-bold text-red-800">{overdue.length} شيك</div>
        </div>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">المورد</th>
                <th className="p-3 text-right">البنك</th>
                <th className="p-3 text-right">رقم الشيك</th>
                <th className="p-3 text-right">الاستحقاق</th>
                <th className="p-3 text-right">المتبقي</th>
                <th className="p-3 text-right">المبلغ</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {supplierChecks.map(c => {
                const due = new Date(c.due_date);
                const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = days < 0 && c.status === 'تحت التحصيل';
                const isDueSoon = days >= 0 && days <= 7 && c.status === 'تحت التحصيل';
                return (
                  <tr key={c.id} className={`border-t hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-yellow-50' : ''}`}>
                    <td className="p-3 font-semibold">{c.supplier?.name || '—'}</td>
                    <td className="p-3 text-xs">{c.bank_name || '—'}</td>
                    <td className="p-3 font-mono text-xs">{c.check_number || '—'}</td>
                    <td className="p-3 text-xs font-semibold">{formatDate(c.due_date)}</td>
                    <td className="p-3 text-xs">
                      {c.status === 'تحت التحصيل' ? (
                        <span className={isOverdue ? 'text-red-700 font-bold' : isDueSoon ? 'text-yellow-800 font-bold' : 'text-gray-600'}>
                          {isOverdue ? `متأخر ${Math.abs(days)} يوم` : days === 0 ? 'اليوم' : `بعد ${days} يوم`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3 font-mono font-bold">{formatEGP(c.amount)}</td>
                    <td className="p-3"><span className={`badge ${STATUS_STYLES[c.status] || "bg-gray-100"}`}>{c.status}</span></td>
                    <td className="p-3">
                      {c.status === 'تحت التحصيل' && (
                        <button onClick={() => settleCheck(c.id, refetch)} className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700">تم السداد</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {supplierChecks.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-gray-400">لا توجد شيكات للموردين</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && <CheckForm onClose={() => setShow(false)} onSaved={() => { setShow(false); refetch(); }} />}
    </div>
  );
}

async function settleCheck(id: string, refetch: () => void) {
  // اختيار الخزينة قبل التسديد
  const treasuryId = prompt('أدخل معرف الخزينة للخصم منها (سيتم ربط الاختيار بالخزائن لاحقاً):');
  if (!treasuryId) {
    if (!confirm('سيتم تسديد الشيك من الخزينة الافتراضية. متابعة؟')) return;
  }
  const res = await fetch('/api/checks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status: 'تم الصرف', treasury_id: treasuryId || undefined }),
  });
  const json = await res.json();
  if (!res.ok) { alert('❌ ' + (json?.error?.message || json?.error?.code || 'حدث خطأ')); return; }
  alert('✅ تم تسديد الشيك وتسجيل سداد للمورد');
  refetch();
}

function CheckForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ supplier_id: '', bank_name: '', check_number: '', amount: 0, issue_date: '', due_date: '', notes: '' });
  const { mutate, loading } = useApiMutation();
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [supSearch, setSupSearch] = useState("");

  useEffect(() => {
    fetch('/api/suppliers?limit=200').then(r => r.json()).then(j => setSuppliers(j.data?.items || [])).catch(() => {});
  }, []);

  const filtered = suppliers.filter(s => s.name.includes(supSearch)).slice(0, 50);

  async function save() {
    if (!f.amount || f.amount <= 0 || !f.issue_date || !f.due_date || !f.supplier_id) { alert('❌ أكمل البيانات (المورد والتواريخ والمبلغ)'); return; }
    const { error } = await mutate('POST', '/api/checks', { ...f, direction: 'outgoing' });
    if (error) { alert('❌ ' + error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-3">
        <h2 className="text-xl font-bold">+ إضافة شيك صادر</h2>
        <div>
          <label className="text-sm font-medium block mb-1">المورد *</label>
          <input className="input-field" placeholder="🔍 ابحث عن مورد..." value={supSearch} onChange={(e) => setSupSearch(e.target.value)} autoFocus />
          <select className="input-field mt-1" value={f.supplier_id} onChange={(e) => setF({ ...f, supplier_id: e.target.value })} size={4}>
            {filtered.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium block mb-1">المبلغ *</label><input type="number" step="0.01" className="input-field" value={f.amount} onChange={(e) => setF({ ...f, amount: parseFloat(e.target.value) || 0 })} /></div>
          <div><label className="text-sm font-medium block mb-1">البنك</label><input className="input-field" value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium block mb-1">رقم الشيك</label><input className="input-field" value={f.check_number} onChange={(e) => setF({ ...f, check_number: e.target.value })} /></div>
          <div><label className="text-sm font-medium block mb-1">تاريخ الإصدار *</label><input type="date" className="input-field" value={f.issue_date} onChange={(e) => setF({ ...f, issue_date: e.target.value })} /></div>
        </div>
        <div><label className="text-sm font-medium block mb-1">تاريخ الاستحقاق *</label><input type="date" className="input-field" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></div>
        <div><label className="text-sm font-medium block mb-1">ملاحظات</label><input className="input-field" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="flex gap-2 pt-3"><button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'جاري الحفظ...' : 'حفظ'}</button><button onClick={onClose} className="btn-secondary">إلغاء</button></div>
      </div>
    </div>
  );
}
