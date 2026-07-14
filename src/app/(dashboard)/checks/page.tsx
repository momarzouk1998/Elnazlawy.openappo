"use client";
import { useState } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatDate } from "@/lib/format";

interface Check {
  id: string; direction: string; bank_name: string | null; check_number: string | null;
  amount: number; issue_date: string; due_date: string; status: string; notes: string | null;
}
interface ApiResponse { items: Check[]; total?: number; }

const STATUS_STYLES: Record<string, string> = {
  "تحت التحصيل": "bg-yellow-100 text-yellow-800",
  "تم الصرف": "bg-green-100 text-green-800",
  "مرفوض": "bg-red-100 text-red-800",
  "مُلغى": "bg-gray-100 text-gray-800",
};

export default function ChecksPage() {
  const [show, setShow] = useState(false);
  const { data, loading, refetch } = useApi<ApiResponse>("/api/checks");

  const totalIncoming = (data?.items || []).filter(c => c.direction === "incoming" && c.status === "تحت التحصيل").reduce((s, c) => s + Number(c.amount), 0);
  const totalOutgoing = (data?.items || []).filter(c => c.direction === "outgoing" && c.status === "تحت التحصيل").reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">🧾 الشيكات</h1>
          <p className="text-sm text-gray-500">{data?.items?.length ?? '...'} شيك</p>
        </div>
        <button onClick={() => setShow(true)} className="btn-primary">+ إضافة شيك</button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">📥 شيكات واردة تحت التحصيل</div>
          <div className="text-2xl font-bold text-green-700">{formatEGP(totalIncoming)} جنيه</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">📤 شيكات صادرة تحت التحصيل</div>
          <div className="text-2xl font-bold text-red-700">{formatEGP(totalOutgoing)} جنيه</div>
        </div>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">الاتجاه</th>
                <th className="p-3 text-right">البنك</th>
                <th className="p-3 text-right">رقم الشيك</th>
                <th className="p-3 text-right">تاريخ الإصدار</th>
                <th className="p-3 text-right">تاريخ الاستحقاق</th>
                <th className="p-3 text-right">المبلغ</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{c.direction === "incoming" ? "📥 وارد" : "📤 صادر"}</td>
                  <td className="p-3 text-xs">{c.bank_name || '—'}</td>
                  <td className="p-3 font-mono text-xs">{c.check_number || '—'}</td>
                  <td className="p-3 text-xs">{formatDate(c.issue_date)}</td>
                  <td className="p-3 text-xs font-semibold">{formatDate(c.due_date)}</td>
                  <td className="p-3 font-mono font-bold">{formatEGP(c.amount)}</td>
                  <td className="p-3"><span className={`badge ${STATUS_STYLES[c.status] || "bg-gray-100"}`}>{c.status}</span></td>
                </tr>
              ))}
              {data?.items?.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-gray-400">لا توجد شيكات</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && <Form onClose={() => setShow(false)} onSaved={() => { setShow(false); refetch(); }} />}
    </div>
  );
}

function Form({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ direction: 'incoming', bank_name: '', check_number: '', amount: 0, issue_date: '', due_date: '', notes: '' });
  const { mutate, loading } = useApiMutation();

  async function save() {
    if (!f.amount || f.amount <= 0 || !f.issue_date || !f.due_date) { alert('❌ أكمل البيانات'); return; }
    const { error } = await mutate('POST', '/api/checks', f);
    if (error) { alert('❌ ' + error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-3">
        <h2 className="text-xl font-bold">+ إضافة شيك</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">الاتجاه *</label>
            <select className="input-field" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}>
              <option value="incoming">📥 وارد (من عميل)</option>
              <option value="outgoing">📤 صادر (لمورد)</option>
            </select>
          </div>
          <div><label className="text-sm font-medium block mb-1">المبلغ *</label><input type="number" step="0.01" className="input-field" value={f.amount} onChange={(e) => setF({ ...f, amount: parseFloat(e.target.value) || 0 })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium block mb-1">البنك</label><input className="input-field" value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} /></div>
          <div><label className="text-sm font-medium block mb-1">رقم الشيك</label><input className="input-field" value={f.check_number} onChange={(e) => setF({ ...f, check_number: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium block mb-1">تاريخ الإصدار *</label><input type="date" className="input-field" value={f.issue_date} onChange={(e) => setF({ ...f, issue_date: e.target.value })} /></div>
          <div><label className="text-sm font-medium block mb-1">تاريخ الاستحقاق *</label><input type="date" className="input-field" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></div>
        </div>
        <div><label className="text-sm font-medium block mb-1">ملاحظات</label><input className="input-field" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="flex gap-2 pt-3"><button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'جاري الحفظ...' : 'حفظ'}</button><button onClick={onClose} className="btn-secondary">إلغاء</button></div>
      </div>
    </div>
  );
}
