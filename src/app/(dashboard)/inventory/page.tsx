"use client";
import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { formatEGP, formatQty } from "@/lib/format";
import { getCurrentUserClient } from "@/hooks/useCurrentUser";

interface InvItem {
  id: string;
  current_stock: number;
  reorder_level: number;
  product: { id: string; name: string; category: string | null; unit: string; last_purchase_price: number | null };
  store: { id: string; name: string; type: string };
  value: number | null;
}

export default function InventoryPage() {
  const [storeId, setStoreId] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => { getCurrentUserClient().then(setProfile); }, []);

  const params = new URLSearchParams();
  if (storeId) params.set('store_id', storeId);
  if (lowOnly) params.set('low_stock', '1');
  if (search) params.set('search', search);

  const { data, loading } = useApi<InvItem[]>(`/api/inventory?${params.toString()}`);
  const { data: stores } = useApi<{ id: string; name: string }[]>('/api/stores');
  const showCost = profile?.can_see_cost;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">📦 المخزون</h1>
        <p className="text-sm text-gray-500">{data?.length ?? '...'} صف</p>
      </div>

      <div className="card flex flex-wrap gap-2">
        <select className="input-field text-sm w-auto" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">كل المخازن</option>
          {stores?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث..." className="input-field text-sm w-auto flex-1 min-w-[150px]" />
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="accent-nazlawy-500" />
          <span>تحت الحد الأدنى فقط</span>
        </label>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">الصنف</th>
                <th className="p-3 text-right">المخزن</th>
                <th className="p-3 text-right">الكمية</th>
                <th className="p-3 text-right">الحد الأدنى</th>
                {showCost && <th className="p-3 text-right">القيمة</th>}
              </tr>
            </thead>
            <tbody>
              {data?.map(i => {
                const lowStock = Number(i.current_stock) <= Number(i.reorder_level);
                return (
                  <tr key={i.id} className={`border-t hover:bg-gray-50 ${lowStock ? 'bg-red-50' : ''}`}>
                    <td className="p-3 font-semibold">{i.product.name}</td>
                    <td className="p-3 text-xs">{i.store.name}</td>
                    <td className={`p-3 font-mono font-bold ${lowStock ? 'text-red-600' : 'text-nazlawy-600'}`}>{formatQty(i.current_stock)}</td>
                    <td className="p-3 font-mono text-xs text-gray-500">{i.reorder_level}</td>
                    {showCost && <td className="p-3 font-mono text-xs">{formatEGP(i.value)}</td>}
                  </tr>
                );
              })}
              {data?.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-400">لا توجد بيانات</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
