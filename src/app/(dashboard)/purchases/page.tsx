"use client";
import { useState } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatDate, statusColor } from "@/lib/format";
import Link from "next/link";
import SearchableSelect, { type SearchOption } from "@/components/SearchableSelect";

interface PurchaseInvoice {
  id: string; purchase_number: number; purchase_date: string; total_amount: number;
  paid_amount: number; status: string; notes: string | null;
  supplier?: { name: string } | null;
  creator?: { full_name: string } | null;
  _count?: { items: number };
}
interface ApiResponse { items: PurchaseInvoice[]; total: number; }

export default function PurchasesPage() {
  const [openInvoice, setOpenInvoice] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const { data: suppliers } = useApi<{ items: { id: string; name: string; phone: string | null; balance: number }[]; total: number }>('/api/suppliers?limit=200');
  const qs = supplierId ? `?supplier_id=${supplierId}` : '';
  const { data, loading, refetch } = useApi<ApiResponse>(`/api/purchases/invoices${qs}`);
  const totalAmount = (data?.items || []).reduce((s, i) => s + Number(i.total_amount), 0);

  const supplierOptions: SearchOption[] = (suppliers?.items || []).map(s => ({
    id: s.id,
    name: s.name,
    sub: s.phone || undefined,
    extra: `مستحق: ${formatEGP(s.balance)} ج`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">📥 فواتير المشتريات</h1>
          <p className="text-sm text-gray-500">{data?.total ?? '...'} فاتورة • إجمالي: {formatEGP(totalAmount)} جنيه</p>
        </div>
        <Link href="/purchases/new" className="btn-primary">+ فاتورة شراء</Link>
      </div>

      <div className="card flex flex-col gap-3 md:flex-row md:flex-wrap">
        <div className="md:flex-1 md:min-w-[200px]">
          <SearchableSelect
            options={supplierOptions}
            value={supplierId}
            onChange={setSupplierId}
            placeholder="🔍 فلترة حسب المورد..."
            emptyLabel="كل الموردين"
          />
        </div>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">رقم</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">المورد</th>
                <th className="p-3 text-right">الأصناف</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(inv => (
                <tr
                  key={inv.id}
                  onClick={() => setOpenInvoice(inv.id)}
                  className="border-t hover:bg-nazlawy-50 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-mono font-bold">#{inv.purchase_number}</td>
                  <td className="p-3 text-xs">{formatDate(inv.purchase_date)}</td>
                  <td className="p-3 font-semibold">{inv.supplier?.name || '—'}</td>
                  <td className="p-3 text-center">{inv._count?.items ?? 0}</td>
                  <td className="p-3 font-mono font-bold">{formatEGP(inv.total_amount)}</td>
                  <td className="p-3"><span className={`badge ${statusColor(inv.status)}`}>{inv.status}</span></td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-400">لا توجد فواتير مشتريات</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {openInvoice && (
        <PurchaseDetailsModal
          invoiceId={openInvoice}
          onClose={() => setOpenInvoice(null)}
        />
      )}
    </div>
  );
}

function PurchaseDetailsModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data: inv, loading, refetch } = useApi<any>(`/api/purchases/invoices/${invoiceId}`);
  const { mutate } = useApiMutation();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  const isCompleted = inv?.status === 'مكتملة';
  const isCancelled = inv?.status === 'ملغاة';

  if (!loading && inv && status === "") {
    setStatus(inv.status);
    setNotes(inv.notes || '');
  }

  async function saveChanges() {
    const { error } = await mutate('PATCH', `/api/purchases/invoices/${invoiceId}`, { status, notes });
    if (error) { alert('❌ ' + error); return; }
    alert('✅ تم حفظ التعديلات');
    setEditing(false);
    refetch();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('focus'));
  }

  async function cancelInvoice() {
    if (!confirm('هل تريد إلغاء هذه الفاتورة؟ سيتم خصم المخزون المضاف وإرجاع المبلغ لخصمه من رصيد المورد.')) return;
    const { error } = await mutate('DELETE', `/api/purchases/invoices/${invoiceId}`);
    if (error) { alert('❌ ' + error); return; }
    alert('✅ تم إلغاء الفاتورة');
    onClose();
    if (typeof window !== 'undefined') window.location.reload();
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl p-8">⏳ جاري التحميل...</div>
      </div>
    );
  }
  if (!inv) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl p-8">❌ لم يتم العثور على الفاتورة</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between gap-2 z-10">
          <div>
            <h2 className="text-lg md:text-xl font-bold">
              📥 فاتورة مشتريات #{inv.purchase_number}
              <span className={`badge ${statusColor(inv.status)} mr-2`}>{inv.status}</span>
            </h2>
            <p className="text-xs text-gray-500">{formatDate(inv.purchase_date)}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-red-500">✕</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Info label="المورد" value={inv.supplier?.name || '—'} />
            <Info label="المنشئ" value={inv.creator?.full_name || '—'} />
          </div>

          <div>
            <h3 className="font-bold mb-2">الأصناف ({inv.items.length})</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-right">الصنف</th>
                  <th className="p-2 text-center">الكمية</th>
                  <th className="p-2 text-left">سعر الشراء</th>
                  <th className="p-2 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((it: any) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">{it.product_name}</td>
                    <td className="p-2 text-center font-mono">{Number(it.quantity)}</td>
                    <td className="p-2 text-left font-mono">{formatEGP(Number(it.unit_cost))}</td>
                    <td className="p-2 text-left font-mono font-bold">{formatEGP(Number(it.line_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-lg font-extrabold border-t pt-2 text-nazlawy-600">
              <span>الإجمالي:</span><span className="font-mono">{formatEGP(Number(inv.total_amount))} ج</span>
            </div>
            {inv.notes && (
              <div className="text-xs text-gray-600 pt-2 border-t">📝 {inv.notes}</div>
            )}
          </div>

          {/* Editable fields */}
          {editing && !isCompleted && !isCancelled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">الحالة</label>
                <select className="input-field text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="قيد التنفيذ">قيد التنفيذ (مسودة)</option>
                  <option value="مكتملة">مكتملة (نهائية)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 block mb-1">ملاحظات</label>
                <textarea
                  className="input-field text-sm"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {editing ? (
              <>
                <button onClick={saveChanges} className="btn-primary text-sm">💾 حفظ التعديلات</button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm text-gray-600">إلغاء التعديل</button>
              </>
            ) : (
              <>
                {!isCompleted && !isCancelled && (
                  <button onClick={() => setEditing(true)} className="btn-secondary text-sm">✏️ تعديل</button>
                )}
                {!isCancelled && (
                  <button onClick={cancelInvoice} className="btn-secondary text-sm !bg-red-50 !text-red-600 hover:!bg-red-100 !border-red-200">🗑️ إلغاء الفاتورة</button>
                )}
              </>
            )}
            <button onClick={onClose} className="btn-secondary text-sm">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value || '—'}</div>
    </div>
  );
}
