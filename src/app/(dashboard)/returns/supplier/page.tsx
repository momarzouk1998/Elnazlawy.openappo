"use client";
import { useState, useEffect } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatDate, statusColor } from "@/lib/format";
import Link from "next/link";
import SearchableSelect, { type SearchOption } from "@/components/SearchableSelect";
import { getCurrentUserClient } from "@/hooks/useCurrentUser";

interface SupplierReturn {
  id: string;
  return_number: number;
  return_date: string;
  status: string;
  total_amount: number;
  notes: string | null;
  supplier: { id: string; name: string } | null;
  creator?: { full_name: string } | null;
  _count: { items: number };
}

export default function SupplierReturnsPage() {
  const [supplierId, setSupplierId] = useState("");
  const [openReturn, setOpenReturn] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getCurrentUserClient().then(p => { if (p?.role === "admin") setIsAdmin(true); });
  }, []);

  const { data: suppliers } = useApi<{ items: { id: string; name: string; phone: string | null; balance: number }[] }>("/api/suppliers?limit=200");
  const qs = supplierId ? `&supplier_id=${supplierId}` : "";
  const { data, loading, refetch } = useApi<{ items: SupplierReturn[]; total: number }>(`/api/returns/supplier?limit=100${qs}`);

  const totalAmount = (data?.items || []).reduce((s, r) => s + Number(r.total_amount), 0);

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
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">↩️ مرتجعات الموردين</h1>
          <p className="text-sm text-gray-500">
            {data?.total ?? "..."} مرتجع • إجمالي: {formatEGP(totalAmount)} جنيه
          </p>
        </div>
        <Link href="/returns/supplier/new" className="btn-primary">+ مرتجع جديد</Link>
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
        <div className="text-sm text-gray-500 md:mr-auto self-center">{data?.total ?? 0} مرتجع</div>
      </div>

      {loading ? (
        <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-2 md:hidden">
            {data?.items.map(ret => (
              <div
                key={ret.id}
                onClick={() => setOpenReturn(ret.id)}
                className="card p-3 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="font-mono font-bold text-purple-700 text-lg">↩️ #{ret.return_number}</div>
                  <span className={`badge ${statusColor(ret.status)}`}>{ret.status}</span>
                </div>
                <div className="text-xs text-gray-500 mb-1.5">{formatDate(ret.return_date)}</div>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm truncate flex-1">{ret.supplier?.name || "—"}</div>
                  <div className="font-bold text-purple-600 text-base shrink-0 ml-2">{formatEGP(ret.total_amount)} ج</div>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">📦 {ret._count.items} صنف</div>
              </div>
            ))}
            {data?.items.length === 0 && (
              <div className="card text-center py-12 text-gray-400">لا توجد مرتجعات موردين</div>
            )}
          </div>

          {/* Desktop */}
          <div className="card overflow-x-auto p-0 hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">رقم المرتجع</th>
                  <th className="p-3 text-right">التاريخ</th>
                  <th className="p-3 text-right">المورد</th>
                  <th className="p-3 text-right">الأصناف</th>
                  <th className="p-3 text-right">الإجمالي</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">المنشئ</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map(ret => (
                  <tr
                    key={ret.id}
                    onClick={() => setOpenReturn(ret.id)}
                    className="border-t hover:bg-purple-50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-purple-700">↩️ #{ret.return_number}</td>
                    <td className="p-3 text-xs">{formatDate(ret.return_date)}</td>
                    <td className="p-3 font-semibold">{ret.supplier?.name || "—"}</td>
                    <td className="p-3 text-center">{ret._count.items}</td>
                    <td className="p-3 font-mono font-bold">{formatEGP(ret.total_amount)}</td>
                    <td className="p-3"><span className={`badge ${statusColor(ret.status)}`}>{ret.status}</span></td>
                    <td className="p-3 text-xs text-gray-500">{ret.creator?.full_name || "—"}</td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-gray-400">لا توجد مرتجعات موردين</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {openReturn && (
        <SupplierReturnDetailsModal
          returnId={openReturn}
          isAdmin={isAdmin}
          onClose={() => setOpenReturn(null)}
          onChanged={refetch}
        />
      )}
    </div>
  );
}

/* ============================================================
   Modal تفاصيل مرتجع المورد
============================================================ */
function SupplierReturnDetailsModal({
  returnId, isAdmin, onClose, onChanged,
}: {
  returnId: string;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: ret, loading } = useApi<any>(`/api/returns/supplier/${returnId}`);
  const { mutate } = useApiMutation();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl p-8">⏳ جاري التحميل...</div>
      </div>
    );
  }
  if (!ret) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl p-8">❌ لم يتم العثور على المرتجع</div>
      </div>
    );
  }

  const isCancelled = ret.status === "ملغاة";

  async function cancelReturn() {
    if (!confirm("هل تريد إلغاء هذا المرتجع؟\nسيتم إعادة الكميات للمخزون وإرجاع المبلغ لرصيد المورد.")) return;
    const { error } = await mutate("DELETE", `/api/returns/supplier/${returnId}`);
    if (error) { alert("❌ " + error); return; }
    alert("✅ تم إلغاء المرتجع");
    onClose();
    onChanged();
  }

  async function deleteReturn() {
    if (!confirm("⚠️ حذف نهائي — هذا الإجراء لا يمكن التراجع عنه.\nهل أنت متأكد؟")) return;
    if (!confirm("⚠️ تأكيد أخير: حذف المرتجع نهائياً؟")) return;
    const { error } = await mutate("DELETE", `/api/returns/supplier/${returnId}?permanent=true`);
    if (error) { alert("❌ " + error); return; }
    alert("✅ تم الحذف النهائي");
    onClose();
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between gap-2 z-10">
          <div>
            <h2 className="text-lg md:text-xl font-bold">
              ↩️ مرتجع مورد #{ret.return_number}
              <span className={`badge ${statusColor(ret.status)} mr-2`}>{ret.status}</span>
            </h2>
            <p className="text-xs text-gray-500">{formatDate(ret.return_date)}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-red-500">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <ReturnInfo label="المورد" value={ret.supplier?.name} />
            <ReturnInfo label="المنشئ" value={ret.creator?.full_name} />
            {ret.notes && <ReturnInfo label="ملاحظات" value={ret.notes} />}
          </div>

          {/* Items */}
          <div>
            <h3 className="font-bold mb-2">الأصناف المرتجعة ({ret.items?.length ?? 0})</h3>
            <table className="w-full text-sm">
              <thead className="bg-purple-50">
                <tr>
                  <th className="p-2 text-right">الصنف</th>
                  <th className="p-2 text-center">الكمية</th>
                  <th className="p-2 text-left">سعر الشراء</th>
                  <th className="p-2 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {(ret.items || []).map((it: any) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">{it.product_name}</td>
                    <td className="p-2 text-center font-mono">{Number(it.quantity)}</td>
                    <td className="p-2 font-mono">{formatEGP(Number(it.unit_cost))}</td>
                    <td className="p-2 font-mono font-bold">{formatEGP(Number(it.line_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="border-t pt-3">
            <div className="flex justify-between text-lg font-extrabold text-purple-700">
              <span>إجمالي المرتجع:</span>
              <span className="font-mono">{formatEGP(Number(ret.total_amount))} ج</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ✅ تم خصم الكميات من المخزون وخصم المبلغ من رصيد المورد عند إنشاء هذا المرتجع.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {!isCancelled && (
              <button onClick={cancelReturn} className="text-sm px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                ❌ إلغاء المرتجع
              </button>
            )}
            {isCancelled && <span className="text-sm text-red-700 font-bold self-center">🚫 هذا المرتجع ملغى</span>}
            {isAdmin && (
              <button onClick={deleteReturn} className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black ml-auto">
                🗑️ حذف نهائي
              </button>
            )}
            <button onClick={onClose} className="btn-secondary text-sm">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReturnInfo({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value || "—"}</div>
    </div>
  );
}
