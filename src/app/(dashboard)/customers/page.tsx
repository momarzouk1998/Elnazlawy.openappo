"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP } from "@/lib/format";

interface Customer { id: string; name: string; phone: string | null; balance: number; opening_balance: number; }

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [show, setShow] = useState(false);
  const router = useRouter();
  const { data, loading, refetch } = useApi<{ items: Customer[]; total: number }>(`/api/customers?search=${encodeURIComponent(search)}&limit=200`);

  const visibleCustomers = (data?.items ?? []).filter((c) => {
    const status = c.balance > 0.01 ? 'unpaid' : c.balance < -0.01 ? 'overpaid' : 'cleared';
    if (statusFilter === 'all') return true;
    return status === statusFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">👥 العملاء</h1>
          <p className="text-sm text-gray-500">{data?.total ?? '...'} عميل</p>
        </div>
        <button onClick={() => setShow(true)} className="btn-primary">+ إضافة عميل</button>
      </div>

      <div className="card flex flex-col gap-3 md:flex-row">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث..." className="input-field md:flex-1" autoFocus />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field md:w-56">
          <option value="all">كل الحالات</option>
          <option value="unpaid">لم يتم السداد</option>
          <option value="overpaid">مدفوعات زائدة</option>
          <option value="cleared">حساب خالص</option>
        </select>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">الهاتف</th>
                <th className="p-3 text-right">رصيد سابق</th>
                <th className="p-3 text-right">الرصيد الحالي</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.map(c => {
                const status = c.balance > 0.01 ? 'لم يتم السداد' : c.balance < -0.01 ? 'مدفوعات زائدة' : 'حساب خالص';
                const statusClass = c.balance > 0.01 ? 'bg-red-100 text-red-800' : c.balance < -0.01 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
                return (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-semibold">
                      <button type="button" onClick={() => router.push(`/customers/${c.id}`)} className="text-right hover:text-nazlawy-600 transition-colors">
                        {c.name}
                      </button>
                    </td>
                    <td className="p-3 text-sm font-mono">{c.phone || '—'}</td>
                    <td className="p-3 font-mono text-xs">{formatEGP(c.opening_balance)}</td>
                    <td className="p-3 font-mono font-bold">{formatEGP(c.balance)}</td>
                    <td className="p-3"><span className={`badge ${statusClass}`}>{status}</span></td>
                  </tr>
                );
              })}
              {visibleCustomers.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-400">لا يوجد عملاء</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && <Form onClose={() => setShow(false)} onSaved={() => { setShow(false); refetch(); }} />}
    </div>
  );
}

function Form({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', phone: '', whatsapp: '', address: '', opening_balance: 0, notes: '' });
  const { mutate, loading } = useApiMutation();

  async function save() {
    const { error } = await mutate('POST', '/api/customers', f);
    if (error) { alert('❌ ' + error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-3">
        <h2 className="text-xl font-bold">+ إضافة عميل</h2>
        <div><label className="text-sm font-medium block mb-1">الاسم *</label><input className="input-field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium block mb-1">الهاتف</label><input className="input-field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><label className="text-sm font-medium block mb-1">واتساب</label><input className="input-field" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
        </div>
        <div><label className="text-sm font-medium block mb-1">العنوان</label><input className="input-field" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div><label className="text-sm font-medium block mb-1">رصيد سابق (افتتاحي)</label><input type="number" step="0.01" className="input-field" value={f.opening_balance} onChange={(e) => setF({ ...f, opening_balance: parseFloat(e.target.value) || 0 })} /></div>
        <div className="flex gap-2 pt-3"><button onClick={save} disabled={loading || !f.name} className="btn-primary flex-1">{loading ? 'جاري الحفظ...' : 'حفظ'}</button><button onClick={onClose} className="btn-secondary">إلغاء</button></div>
      </div>
    </div>
  );
}
