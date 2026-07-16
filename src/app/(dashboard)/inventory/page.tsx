"use client";
import { useState, useEffect } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatQty, formatDate } from "@/lib/format";
import { getCurrentUserClient } from "@/hooks/useCurrentUser";

/* ============================================
   أنواع مشتركة
============================================ */
interface InvItem {
  id: string;
  current_stock: number;
  reorder_level: number;
  product: { id: string; name: string; category: string | null; unit: string; last_purchase_price: number | null };
  store: { id: string; name: string; type: string };
  value: number | null;
}
interface Transfer {
  id: string; transfer_date: string; product_name: string; quantity: number;
  status: string; notes: string | null;
  from_store?: { id: string; name: string } | null;
  to_store?: { id: string; name: string } | null;
  by_user?: { id: number; full_name: string } | null;
}
interface Store { id: string; name: string; type: string; _count?: { inventory: number }; treasury?: { id: string; name: string; current_balance: number } | null; }

const TABS = [
  { key: 'stock', label: 'المخزون', icon: '📦' },
  { key: 'transfers', label: 'التحويلات', icon: '🚛' },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function InventoryPage() {
  const [tab, setTab] = useState<TabKey>('stock');
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => { getCurrentUserClient().then(setProfile); }, []);

  // لا حاجة لتبويب الفروع بعد الآن، تم دمجه في كاردات المخزون
  const visibleTabs = TABS;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">📦 المخازن</h1>
      </div>

      {/* شريط التبويبات */}
      <div className="flex gap-2 border-b">
        {visibleTabs.map(t => (
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

      {tab === 'stock' && <StockTab profile={profile} />}
      {tab === 'transfers' && <TransfersTab />}
    </div>
  );
}

/* ============================================
   تبويب المخزون
============================================ */
function StockTab({ profile }: { profile: any }) {
  const [storeId, setStoreId] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState("");

  const params = new URLSearchParams();
  if (storeId) params.set('store_id', storeId);
  if (lowOnly) params.set('low_stock', '1');
  if (search) params.set('search', search);

  const { data: summaryData, loading: summaryLoading } = useApi<any>('/api/inventory/summary');
  const { data, loading } = useApi<InvItem[]>(`/api/inventory?${params.toString()}`);
  const stores = summaryData?.stores || [];
  const overall = summaryData?.overall;
  const showCost = profile?.can_see_cost;

  return (
    <div className="space-y-6">
      {/* Cards Section */}
      {summaryLoading ? (
        <div className="card text-center py-6 text-gray-500">⏳ جاري تحميل إحصائيات المخازن...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Card */}
          <div className="card bg-gradient-to-r from-nazlawy-600 to-nazlawy-800 text-white shadow-xl transform hover:scale-[1.02] transition-transform">
            <h3 className="text-lg font-bold opacity-90 mb-2">إجمالي كل المخازن</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm opacity-80">عدد الأصناف:</span>
                <span className="font-mono font-bold">{overall?.total_items || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm opacity-80">إجمالي القطع:</span>
                <span className="font-mono font-bold text-yellow-300">{formatQty(overall?.total_qty || 0)}</span>
              </div>
              {showCost && (
                <div className="flex justify-between pt-2 border-t border-white/20 mt-2">
                  <span className="text-sm opacity-80">إجمالي التكلفة:</span>
                  <span className="font-mono font-bold text-green-300">{formatEGP(overall?.total_value || 0)} ج</span>
                </div>
              )}
            </div>
          </div>

          {/* Store Cards */}
          {stores.map((s: any) => (
            <div key={s.store_id} className="card border-l-4 border-l-nazlawy-500 hover:shadow-lg transition-shadow bg-white">
              <h3 className="text-md font-bold text-gray-800 mb-2">🏢 {s.store_name}</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>عدد الأصناف:</span>
                  <span className="font-mono font-bold text-gray-900">{s.total_items}</span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي القطع:</span>
                  <span className="font-mono font-bold text-nazlawy-600">{formatQty(s.total_qty)}</span>
                </div>
                {showCost && (
                  <div className="flex justify-between pt-2 border-t mt-2">
                    <span>إجمالي التكلفة:</span>
                    <span className="font-mono font-bold text-green-600">{formatEGP(s.total_value)} ج</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Section */}
      <h2 className="text-xl font-bold text-slate-700 mt-6">تفاصيل المخزون</h2>
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

/* ============================================
   تبويب التحويلات
============================================ */
function TransfersTab() {
  const [show, setShow] = useState(false);
  const { data, loading, refetch } = useApi<{ items: Transfer[]; total: number }>("/api/transfers?limit=200");

  async function cancelTransfer(t: Transfer) {
    if (!confirm(`إلغاء التحويل؟\n\nسيتم إرجاع ${t.quantity} من "${t.product_name}" إلى "${t.from_store?.name}".`)) return;
    const res = await fetch(`/api/transfers/${t.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) { alert('❌ ' + (json?.error?.message || json?.error?.code || 'تعذّر الإلغاء')); return; }
    alert('✅ تم إلغاء التحويل وإرجاع الكمية');
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{data?.total ?? '...'} تحويل</p>
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
                <th className="p-3 text-right">إجراءات</th>
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
                  <td className="p-3"><span className={`badge ${t.status === 'مكتملة' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{t.status}</span></td>
                  <td className="p-3 text-xs text-gray-600">{t.by_user?.full_name || '—'}</td>
                  <td className="p-3">
                    {t.status === 'مكتملة' && (
                      <button onClick={() => cancelTransfer(t)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200" title="إلغاء التحويل (نفس اليوم)">
                        🗑️ إلغاء
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-gray-400">لا توجد تحويلات</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && <TransferForm onClose={() => setShow(false)} onSaved={() => { setShow(false); refetch(); }} />}
    </div>
  );
}

function TransferForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ product_id: '', from_store_id: '', to_store_id: '', quantity: 0, notes: '', transfer_date: '' });
  const { mutate, loading } = useApiMutation();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch('/api/stores').then(r => r.json()).then(j => setStores(j.data?.items || j.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/products?search=${encodeURIComponent(search)}&limit=50`).then(r => r.json()).then(j => setProducts(j.data?.items || [])).catch(() => {});
  }, [search]);

  async function save() {
    if (!f.product_id || !f.from_store_id || !f.to_store_id || f.quantity <= 0) { alert('❌ أكمل البيانات'); return; }
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

