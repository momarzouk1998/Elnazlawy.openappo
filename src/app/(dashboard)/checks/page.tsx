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

const MAX_BATCH = 15;

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
        <button onClick={() => setShow(true)} className="btn-primary">+ إضافة شيك / دفعة شيكات</button>
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

      {show && <BatchCheckForm onClose={() => setShow(false)} onSaved={() => { setShow(false); refetch(); }} />}
    </div>
  );
}

/* ===========================================================
   نموذج إضافة عدة شيكات دفعة واحدة (بحد أقصى 15)
=========================================================== */
function BatchCheckForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  // عدد الشيكات (افتراضي 1) — المستخدم يحدد
  const [count, setCount] = useState(1);
  // اتجاه موحّد لكل الشيكات في الدفعة
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming');
  // صف الشيكات: مصفوفة من الكائنات (التاريخ، البنك، الرقم، المبلغ)
  const [rows, setRows] = useState<CheckRow[]>(() => defaultRow(1));
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState<string>('');
  const { mutate, loading } = useApiMutation();

  function defaultRow(_: number): CheckRow[] {
    return [emptyRow()];
  }

  function emptyRow(): CheckRow {
    return {
      bank_name: '',
      check_number: '',
      amount: 0,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      notes: '',
    };
  }

  function applyCount(n: number) {
    n = Math.max(1, Math.min(MAX_BATCH, Math.floor(n) || 1));
    setCount(n);
    setRows(prev => {
      if (n === prev.length) return prev;
      if (n > prev.length) {
        // وسّع المصفوفة
        return [...prev, ...Array.from({ length: n - prev.length }, () => emptyRow())];
      } else {
        // قلّص (احتفظ بالأولى)
        return prev.slice(0, n);
      }
    });
  }

  function updateRow(i: number, field: keyof CheckRow, value: any) {
    setRows(rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function removeRow(i: number) {
    if (rows.length <= 1) return;
    const next = rows.filter((_, idx) => idx !== i);
    setRows(next);
    setCount(next.length);
  }

  const validRows = rows.filter(r => Number(r.amount) > 0 && r.issue_date && r.due_date);
  const totalAmount = validRows.reduce((s, r) => s + Number(r.amount), 0);

  async function save() {
    if (validRows.length === 0) {
      alert('❌ لا يوجد صفوف صالحة للحفظ. أكمل المبلغ وتاريخ الإصدار والاستحقاق لشيك واحد على الأقل.');
      return;
    }
    setProgress(`جاري حفظ 0 / ${validRows.length}...`);
    let saved = 0;
    let firstError: string | null = null;
    for (const row of validRows) {
      const payload = {
        direction,
        bank_name: row.bank_name || null,
        check_number: row.check_number || null,
        amount: Number(row.amount),
        issue_date: row.issue_date,
        due_date: row.due_date,
        notes: [notes, row.notes].filter(Boolean).join(' • ') || null,
      };
      const { error } = await mutate('POST', '/api/checks', payload);
      if (error) {
        firstError = error;
        break;
      }
      saved++;
      setProgress(`جاري حفظ ${saved} / ${validRows.length}...`);
    }
    if (firstError) {
      alert(`❌ تم حفظ ${saved} شيك. فشل: ${firstError}`);
      setProgress('');
      return;
    }
    setProgress('');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-nazlawy-500 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">+ إضافة دفعة شيكات</h2>
            <p className="text-xs opacity-90">أضف حتى {MAX_BATCH} شيك في المرة الواحدة. عدّل الجدول قبل الحفظ.</p>
          </div>
          <button onClick={onClose} className="text-2xl hover:text-gray-200">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* إعدادات الدفعة */}
          <div className="card bg-nazlawy-50/30 border-nazlawy-200 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">الاتجاه *</label>
              <select className="input-field" value={direction} onChange={(e) => setDirection(e.target.value as any)}>
                <option value="incoming">📥 وارد (من عميل)</option>
                <option value="outgoing">📤 صادر (لمورد)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">عدد الشيكات (حد أقصى {MAX_BATCH})</label>
              <input
                type="number"
                min={1}
                max={MAX_BATCH}
                className="input-field"
                value={count}
                onChange={(e) => applyCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">ملاحظة عامة (اختياري)</label>
              <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تطبق على كل الشيكات في الدفعة" />
            </div>
          </div>

          {/* جدول الشيكات */}
          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-xs">
                  <tr>
                    <th className="p-2 text-center w-10">#</th>
                    <th className="p-2 text-right">البنك</th>
                    <th className="p-2 text-right">رقم الشيك</th>
                    <th className="p-2 text-right">المبلغ (ج) *</th>
                    <th className="p-2 text-right">تاريخ الإصدار *</th>
                    <th className="p-2 text-right">تاريخ الاستحقاق *</th>
                    <th className="p-2 text-right">ملاحظة خاصة</th>
                    <th className="p-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const valid = Number(r.amount) > 0 && r.issue_date && r.due_date;
                    return (
                      <tr key={i} className={`border-t ${valid ? 'bg-white' : 'bg-yellow-50'}`}>
                        <td className="p-2 text-center font-mono text-gray-500">{i + 1}</td>
                        <td className="p-1"><input className="input-field text-xs p-1.5" value={r.bank_name} onChange={(e) => updateRow(i, 'bank_name', e.target.value)} placeholder="البنك" /></td>
                        <td className="p-1"><input className="input-field text-xs p-1.5 font-mono" value={r.check_number} onChange={(e) => updateRow(i, 'check_number', e.target.value)} placeholder="رقم الشيك" /></td>
                        <td className="p-1"><input type="number" min={0} step="0.01" className="input-field text-xs p-1.5 font-mono font-bold" value={r.amount || ''} onChange={(e) => updateRow(i, 'amount', parseFloat(e.target.value) || 0)} placeholder="0.00" /></td>
                        <td className="p-1"><input type="date" className="input-field text-xs p-1.5" value={r.issue_date} onChange={(e) => updateRow(i, 'issue_date', e.target.value)} /></td>
                        <td className="p-1"><input type="date" className="input-field text-xs p-1.5" value={r.due_date} onChange={(e) => updateRow(i, 'due_date', e.target.value)} /></td>
                        <td className="p-1"><input className="input-field text-xs p-1.5" value={r.notes} onChange={(e) => updateRow(i, 'notes', e.target.value)} placeholder="—" /></td>
                        <td className="p-2 text-center">
                          {rows.length > 1 && (
                            <button type="button" onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700 text-lg" title="حذف هذا الصف">✕</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td colSpan={3} className="p-2 text-left">إجمالي ({validRows.length} من {rows.length} صالح للحفظ):</td>
                    <td className="p-2 font-mono text-nazlawy-600">{formatEGP(totalAmount)} ج</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
            💡 <strong>ملاحظة:</strong> سيتم حفظ كل صف على حدة في قاعدة البيانات بنفس الاتجاه. الصفوف التي لا تحتوي على مبلغ أو تاريخ لن تُحفظ.
          </div>
        </div>

        {/* أزرار */}
        <div className="border-t p-3 flex gap-2 bg-gray-50">
          <button onClick={save} disabled={loading || validRows.length === 0} className="btn-primary flex-1">
            {loading
              ? (progress || `جاري حفظ ${validRows.length} شيك...`)
              : `💾 حفظ ${validRows.length} شيك (${formatEGP(totalAmount)} ج)`}
          </button>
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

interface CheckRow {
  bank_name: string;
  check_number: string;
  amount: number;
  issue_date: string;
  due_date: string;
  notes: string;
}
