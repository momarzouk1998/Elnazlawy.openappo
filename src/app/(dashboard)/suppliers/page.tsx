"use client";
import { useState, useEffect } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP } from "@/lib/format";

interface Supplier { id: string; name: string; phone: string | null; balance: number; opening_balance: number; }

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const { data, loading, refetch } = useApi<{ items: Supplier[]; total: number }>(`/api/suppliers?search=${encodeURIComponent(search)}&limit=200`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">🏭 الموردين</h1>
          <p className="text-sm text-gray-500">{data?.total ?? '...'} مورد</p>
        </div>
        <button onClick={() => setShow(true)} className="btn-primary">+ إضافة مورد</button>
      </div>

      <div className="card">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث..." className="input-field" autoFocus />
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
              </tr>
            </thead>
            <tbody>
              {data?.items.map(s => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
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
      )}

      {show && <Form onClose={() => setShow(false)} onSaved={() => { setShow(false); refetch(); }} />}
    </div>
  );
}

function Form({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', phone: '', address: '', opening_balance: 0 });
  const { mutate, loading } = useApiMutation();

  async function save() {
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
