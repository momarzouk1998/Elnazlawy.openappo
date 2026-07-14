"use client";
import { useState } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatQty, formatDate } from "@/lib/format";

interface Transfer {
  id: string; transfer_date: string; product_name: string; quantity: number;
  status: string; notes: string | null;
  from_store?: { id: string; name: string } | null;
  to_store?: { id: string; name: string } | null;
  by_user?: { id: number; full_name: string } | null;
}
interface ApiResponse { items: Transfer[]; total: number; }

export default function TransfersPage() {
  const [show, setShow] = useState(false);
  const { data, loading, refetch } = useApi<ApiResponse>("/api/transfers?limit=200");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">🚛 تحويلات المخازن</h1>
          <p className="text-sm text-gray-500">{data?.total ?? '...'} تحويل</p>
        </div>
        <button onClick={() => setShow(true)} className="btn-primary">+ تحويل جديد</button>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">المنتج</th>
                <th className="p-3 text-right">من مخزن</th>
                <th className="p-3 text-right">إلى مخزن</th>
                <th className="p-3 text-right">الكمية</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">بواسطة</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(t => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-xs">{formatDate(t.transfer_date)}</td>
                  <td className="p-3 font-semibold">{t.product_name}</td>
                  <td className="p-3 text-xs">{t.from_store?.name || '—'}</td>
                  <td className="p-3 text-xs">{t.to_store?.name || '—'}</td>
                  <td className="p-3 font-mono font-bold">{formatQty(t.quantity)}</td>
                  <td className="p-3"><span className="badge bg-green-100 text-green-800">{t.status}</span></td>
                  <td className="p-3 text-xs text-gray-600">{t.by_user?.full_name || '—'}</td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-gray-400">لا توجد تحويلات</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && <Form onClose={() => setShow(false)} onSaved={() => { setShow(false); refetch(); }} />}
    </div>
  );
}

function Form({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ product_id: '', from_store_id: '', to_store_id: '', quantity: 0, notes: '', transfer_date: '' });
  const { mutate, loading } = useApiMutation();
  const [products, setProducts] = useState<{id:string;name:string}[]>([]);
  const [stores, setStores] = useState<{id:string;name:string}[]>([]);
  const [search, setSearch] = useState("");

  useState(() => {
    fetch('/api/stores').then(r => r.json()).then(j => setStores(j.data?.items || [])).catch(() => {});
  });

  // بحث المنتجات
  useState(() => {
    fetch(`/api/products?search=${encodeURIComponent(search)}&limit=50`).then(r => r.json()).then(j => setProducts(j.data?.items || [])).catch(() => {});
  });

  async function save() {
    if (!f.product_id || !f.from_store_id || !f.to_store_id || f.quantity <= 0) {
      alert('❌ أكمل البيانات'); return;
    }
    if (f.from_store_id === f.to_store_id) { alert('❌ لا يمكن التحويل لنفس المخزن'); return; }
    const { error } = await mutate('POST', '/api/transfers', f);
    if (error) { alert('❌ ' + error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-3">
        <h2 className="text-xl font-bold">+ تحويل مخزني</h2>
        <div>
          <label className="text-sm font-medium block mb-1">المنتج *</label>
          <input className="input-field" placeholder="🔍 ابحث عن منتج..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <select className="input-field mt-1" value={f.product_id} onChange={(e) => setF({ ...f, product_id: e.target.value })} size={3}>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">من مخزن *</label>
            <select className="input-field" value={f.from_store_id} onChange={(e) => setF({ ...f, from_store_id: e.target.value })}>
              <option value="">اختر...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">إلى مخزن *</label>
            <select className="input-field" value={f.to_store_id} onChange={(e) => setF({ ...f, to_store_id: e.target.value })}>
              <option value="">اختر...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium block mb-1">الكمية *</label><input type="number" step="0.01" className="input-field" value={f.quantity} onChange={(e) => setF({ ...f, quantity: parseFloat(e.target.value) || 0 })} /></div>
          <div><label className="text-sm font-medium block mb-1">التاريخ</label><input type="date" className="input-field" value={f.transfer_date} onChange={(e) => setF({ ...f, transfer_date: e.target.value })} /></div>
        </div>
        <div><label className="text-sm font-medium block mb-1">ملاحظات</label><input className="input-field" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="flex gap-2 pt-3"><button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'جاري الحفظ...' : 'حفظ'}</button><button onClick={onClose} className="btn-secondary">إلغاء</button></div>
      </div>
    </div>
  );
}
