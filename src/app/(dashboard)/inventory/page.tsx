"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatQty, formatDate } from "@/lib/format";
import { getCurrentUserClient } from "@/hooks/useCurrentUser";
import Pagination from "@/components/Pagination";

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
  { key: 'stores', label: 'الفروع والمخازن الحالية', icon: '🏪' },
  { key: 'adjustments', label: 'سجل التعديلات', icon: '📊' },
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">📦 المخازن</h1>
        <a
          href="/print/inventory"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold flex items-center gap-2 shadow px-4 py-2 rounded-xl"
        >
          🖨️ طباعة تقرير المخازن (PDF)
        </a>
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
      {tab === 'stores' && <StoresTab profile={profile} />}
      {tab === 'adjustments' && <AdjustmentsTab profile={profile} />}
      {tab === 'transfers' && <TransfersTab />}
    </div>
  );
}

/* ============================================
   تبويب المخزون
============================================ */
function StockTab({ profile }: { profile: any }) {
  const [storeId, setStoreId] = useState("");
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const searchParams = useSearchParams();

  const params = new URLSearchParams();
  if (storeId) params.set('store_id', storeId);
  if (category) params.set('category', category);
  if (lowOnly) params.set('low_stock', '1');
  if (search) params.set('search', search);
  params.set('page', page.toString());

  const { data: summaryData, loading: summaryLoading } = useApi<any>('/api/inventory/summary');
  const { data, loading, refetch } = useApi<{ items: InvItem[]; total: number; limit: number; page: number }>(`/api/inventory?${params.toString()}`);
  const stores = summaryData?.stores || [];
  const overall = summaryData?.overall;
  const showCost = profile?.can_see_cost;

  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) setPage(parseInt(pageParam));
  }, [searchParams]);

  // استخراج الفئات المتاحة
  const categories = Array.from(new Set(data?.items?.map(i => i.product.category).filter(Boolean))) as string[];
  const items = data?.items || [];

  // بدء التعديل
  function startEdit(item: InvItem) {
    setEditingId(item.id);
    setEditValue(Number(item.current_stock));
  }

  // إلغاء التعديل
  function cancelEdit() {
    setEditingId(null);
    setEditValue(0);
  }

  // حفظ التعديل
  async function saveEdit(item: InvItem) {
    if (editValue < 0) {
      alert('❌ الكمية لا يمكن أن تكون سالبة');
      return;
    }

    const oldQty = Number(item.current_stock);
    if (editValue === oldQty) {
      cancelEdit();
      return;
    }

    const difference = editValue - oldQty;
    const confirmMsg = difference > 0 
      ? `زيادة الكمية من ${oldQty} إلى ${editValue}\n(زيادة +${difference})\n\nهذا سيُسجل كـ "تسوية جرد" وسيؤثر على قيمة المخزون.\n\nهل تريد المتابعة؟`
      : `تخفيض الكمية من ${oldQty} إلى ${editValue}\n(نقص ${difference})\n\nهذا سيُسجل كـ "فاقد" وسيؤثر على قيمة المخزون.\n\nهل تريد المتابعة؟`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_id: item.id,
          new_quantity: editValue,
          reason: 'تعديل من صفحة المخزون'
        })
      });

      const json = await response.json();

      if (!response.ok) {
        alert('❌ ' + (json?.error?.message || 'حدث خطأ'));
        setSaving(false);
        return;
      }

      alert(json.message || '✅ تم التعديل بنجاح');
      cancelEdit();
      refetch();
      setSaving(false);

    } catch (err: any) {
      alert('❌ خطأ: ' + err.message);
      setSaving(false);
    }
  }

  // حذف العنصر من المخزن
  async function deleteItem(item: InvItem) {
    if (!confirm(`هل أنت متأكد من حذف الصنف "${item.product?.name}" من المخزن؟`)) return;
    
    try {
      const response = await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok) {
        alert('❌ ' + (json?.error?.message || 'حدث خطأ أثناء الحذف'));
        return;
      }
      alert('✅ تم الحذف بنجاح');
      refetch();
    } catch (err: any) {
      alert('❌ خطأ: ' + err.message);
    }
  }

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
            <div key={s.id} className="card border-l-4 border-l-nazlawy-500 hover:shadow-lg transition-shadow bg-white">
              <h3 className="text-md font-bold text-gray-800 mb-2">🏢 {s.name}</h3>
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
      <div className="flex items-center justify-between flex-wrap gap-3 mt-6">
        <h2 className="text-xl font-bold text-slate-700">تفاصيل المخزون</h2>
        <button onClick={() => setShowBulkAdd(true)} className="btn-primary text-sm">
          ➕ إدخال أصناف متعددة
        </button>
      </div>
      <div className="card flex flex-wrap gap-2">
        <select className="input-field text-sm w-auto" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">كل المخازن</option>
          {stores?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input-field text-sm w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">كل الفئات</option>
          {categories?.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث..." className="input-field text-sm w-auto flex-1 min-w-[150px]" />
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="accent-nazlawy-500" />
          <span>تحت الحد الأدنى فقط</span>
        </label>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <>
          {/* Mobile: كاردات */}
          <div className="space-y-2 md:hidden">
            {items.map(i => {
              const lowStock = Number(i.current_stock) <= Number(i.reorder_level);
              const isEditing = editingId === i.id;
              
              return (
                <div key={i.id} className={`card p-3 ${lowStock ? 'ring-2 ring-red-300' : ''}`}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="font-bold text-sm truncate">{i.product.name}</div>
                      {i.product.category && (
                        <div className="text-xs text-gray-500 mt-0.5">📂 {i.product.category}</div>
                      )}
                    </div>
                    <div className="shrink-0 mr-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            className="w-20 px-2 py-1 border-2 border-nazlawy-500 rounded text-center font-mono font-bold text-sm"
                            value={editValue}
                            onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                            disabled={saving}
                          />
                        </div>
                      ) : (
                        <div 
                          className={`font-mono font-bold text-lg cursor-pointer hover:bg-yellow-100 px-2 py-1 rounded ${lowStock ? 'text-red-600' : 'text-nazlawy-600'}`}
                          onClick={() => startEdit(i)}
                        >
                          {formatQty(i.current_stock)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="flex gap-2 mt-2 pt-2 border-t">
                      <button
                        onClick={() => saveEdit(i)}
                        disabled={saving}
                        className="flex-1 text-xs px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                      >
                        {saving ? '⏳ جاري الحفظ...' : '✓ حفظ'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="flex-1 text-xs px-3 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                      >
                        ✕ إلغاء
                      </button>
                    </div>
                  )}
                  
                  {!isEditing && (
                    <>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>🏢 {i.store.name}</span>
                        <span>الحد الأدنى: <span className="font-mono">{i.reorder_level}</span></span>
                      </div>
                      {showCost && i.value !== null && (
                        <div className="text-xs text-green-700 mt-1 font-mono">💰 {formatEGP(i.value)} ج</div>
                      )}
                      {lowStock && (
                        <div className="text-xs text-red-600 font-bold mt-1">⚠️ تحت الحد الأدنى</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="card text-center py-12 text-gray-400">لا توجد بيانات</div>
            )}
          </div>

          {/* Desktop: جدول */}
          <div className="card overflow-x-auto p-0 hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">الصنف</th>
                  <th className="p-3 text-right">الفئة</th>
                  <th className="p-3 text-right">المخزن</th>
                  <th className="p-3 text-right">الكمية</th>
                  <th className="p-3 text-right">الحد الأدنى</th>
                  {showCost && <th className="p-3 text-right">القيمة</th>}
                  <th className="p-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => {
                  const lowStock = Number(i.current_stock) <= Number(i.reorder_level);
                  const isEditing = editingId === i.id;
                  
                  return (
                    <tr key={i.id} className={`border-t hover:bg-gray-50 ${lowStock ? 'bg-red-50' : ''}`}>
                      <td className="p-3 font-semibold">{i.product.name}</td>
                      <td className="p-3 text-xs text-gray-600">{i.product.category || '—'}</td>
                      <td className="p-3 text-xs">{i.store.name}</td>
                      <td className={`p-3 font-mono font-bold ${lowStock ? 'text-red-600' : 'text-nazlawy-600'}`}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-24 px-2 py-1 border-2 border-nazlawy-500 rounded text-center font-mono font-bold"
                            value={editValue}
                            onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(i);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                            disabled={saving}
                          />
                        ) : (
                          <span className="cursor-pointer hover:bg-yellow-100 px-2 py-1 rounded" onClick={() => startEdit(i)}>
                            {formatQty(i.current_stock)}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-gray-500">{i.reorder_level}</td>
                      {showCost && <td className="p-3 font-mono text-xs">{formatEGP(i.value)}</td>}
                      <td className="p-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(i)}
                              disabled={saving}
                              className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                              title="حفظ"
                            >
                              {saving ? '⏳' : '✓'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                              title="إلغاء"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(i)}
                              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                              title="تعديل الكمية"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteItem(i)}
                              className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                              title="حذف من المخزن"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td colSpan={showCost ? 7 : 6} className="p-12 text-center text-gray-400">لا توجد بيانات</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && data.total > 0 && (
        <Pagination
          total={data.total}
          page={data.page}
          pageSize={data.limit}
          baseUrl="/inventory"
        />
      )}

      {/* Bulk Add Modal */}
      {showBulkAdd && (
        <BulkAddModal 
          stores={stores}
          onClose={() => setShowBulkAdd(false)} 
          onSaved={() => { setShowBulkAdd(false); refetch(); }} 
        />
      )}
    </div>
  );
}

/* ============================================
   تبويب إدارة المخازن والفروع
============================================ */
interface Store {
  id: string;
  name: string;
  type: string;
  description: string | null;
  assigned_user_id: number | null;
  is_active: boolean;
  created_at: string;
  stats: {
    total_products: number;
    total_sales: number;
  };
}

function StoresTab({ profile }: { profile: any }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const { data, loading, refetch } = useApi<{ items: Store[]; total: number }>('/api/stores');
  const { mutate, loading: saving } = useApiMutation();

  const isAdmin = profile?.role === 'admin';
  const stores = data?.items || [];

  // إضافة مخزن جديد
  async function handleAdd(storeData: any) {
    const { error } = await mutate('POST', '/api/stores', storeData);
    if (error) {
      alert('❌ ' + error);
      return;
    }
    
    alert('✅ تم إضافة المخزن بنجاح');
    setShowAddForm(false);
    refetch();
  }

  // تعديل مخزن
  async function handleEdit(storeData: any) {
    if (!editingStore) return;
    
    const { error } = await mutate('PUT', `/api/stores/${editingStore.id}`, storeData);
    if (error) {
      alert('❌ ' + error);
      return;
    }
    
    alert('✅ تم تعديل المخزن بنجاح');
    setEditingStore(null);
    refetch();
  }

  // حذف مخزن
  async function handleDelete(store: Store) {
    const hasData = store.stats.total_products > 0 || store.stats.total_sales > 0;
    const confirmMsg = hasData 
      ? `هذا المخزن يحتوي على بيانات (${store.stats.total_products} منتج، ${store.stats.total_sales} فاتورة).\n\nسيتم إلغاء تفعيله فقط، لا يمكن حذفه نهائياً.\n\nهل تريد المتابعة؟`
      : `حذف "${store.name}" نهائياً؟\n\nهذا المخزن لا يحتوي على بيانات وسيتم حذفه نهائياً.\n\nهل تريد المتابعة؟`;

    if (!confirm(confirmMsg)) return;

    const { error } = await mutate('DELETE', `/api/stores/${store.id}`);
    if (error) {
      alert('❌ ' + error);
      return;
    }
    
    alert('✅ تم تنفيذ العملية بنجاح');
    refetch();
  }

  // إعادة تفعيل مخزن
  async function handleReactivate(store: Store) {
    if (!confirm(`إعادة تفعيل "${store.name}"؟`)) return;

    const { error } = await mutate('PUT', `/api/stores/${store.id}`, {
      ...store,
      is_active: true
    });
    
    if (error) {
      alert('❌ ' + error);
      return;
    }
    
    alert('✅ تم إعادة تفعيل المخزن');
    refetch();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-700">🏪 الفروع والمخازن الحالية</h2>
          <p className="text-sm text-gray-500 mt-1">إدارة وتعديل المخازن والفروع</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddForm(true)} 
            className="btn-primary text-sm"
            disabled={saving}
          >
            ➕ إضافة مخزن/فرع جديد
          </button>
        )}
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-700 text-white">
          <h3 className="text-sm opacity-90 mb-1">إجمالي المخازن</h3>
          <div className="text-2xl font-bold">{stores.length}</div>
        </div>
        <div className="card bg-gradient-to-r from-green-500 to-green-700 text-white">
          <h3 className="text-sm opacity-90 mb-1">المخازن النشطة</h3>
          <div className="text-2xl font-bold">{stores.filter(s => s.is_active).length}</div>
        </div>
        <div className="card bg-gradient-to-r from-orange-500 to-orange-700 text-white">
          <h3 className="text-sm opacity-90 mb-1">المخازن المعطلة</h3>
          <div className="text-2xl font-bold">{stores.filter(s => !s.is_active).length}</div>
        </div>
      </div>

      {/* قائمة المخازن */}
      {loading ? (
        <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div>
      ) : (
        <>
          {/* Mobile: كاردات */}
          <div className="space-y-3 md:hidden">
            {stores.map(store => {
              const typeEmoji = store.type === 'showroom' ? '🏪' : store.type === 'vehicle' ? '🚛' : '📦';
              const typeLabel = store.type === 'showroom' ? 'معرض' : store.type === 'vehicle' ? 'سيارة توزيع' : 'مخزن';
              
              return (
                <div key={store.id} className={`card p-4 ${!store.is_active ? 'opacity-60 border-red-200' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{typeEmoji}</span>
                        <span className="font-bold text-sm">{store.name}</span>
                        {!store.is_active && (
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">معطل</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{typeLabel}</div>
                    </div>
                  </div>
                  
                  {store.description && (
                    <div className="text-xs text-gray-600 mb-2">{store.description}</div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>📦 {store.stats.total_products} منتج</span>
                    <span>📄 {store.stats.total_sales} فاتورة</span>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingStore(store)}
                        className="flex-1 text-xs px-3 py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                        disabled={saving}
                      >
                        ✏️ تعديل
                      </button>
                      {store.is_active ? (
                        <button
                          onClick={() => handleDelete(store)}
                          className="flex-1 text-xs px-3 py-2 rounded bg-red-100 text-red-700 hover:bg-red-200"
                          disabled={saving}
                        >
                          🗑️ حذف
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(store)}
                          className="flex-1 text-xs px-3 py-2 rounded bg-green-100 text-green-700 hover:bg-green-200"
                          disabled={saving}
                        >
                          🔄 تفعيل
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: جدول */}
          <div className="card overflow-x-auto p-0 hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">النوع</th>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">الوصف</th>
                  <th className="p-3 text-right">المنتجات</th>
                  <th className="p-3 text-right">الفواتير</th>
                  <th className="p-3 text-right">الحالة</th>
                  {isAdmin && <th className="p-3 text-right">إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {stores.map(store => {
                  const typeEmoji = store.type === 'showroom' ? '🏪' : store.type === 'vehicle' ? '🚛' : '📦';
                  const typeLabel = store.type === 'showroom' ? 'معرض' : store.type === 'vehicle' ? 'سيارة توزيع' : 'مخزن';
                  
                  return (
                    <tr key={store.id} className={`border-t hover:bg-gray-50 ${!store.is_active ? 'opacity-60' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{typeEmoji}</span>
                          <span className="text-xs">{typeLabel}</span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold">{store.name}</td>
                      <td className="p-3 text-xs text-gray-600 max-w-[200px] truncate">
                        {store.description || '—'}
                      </td>
                      <td className="p-3 font-mono text-center">{store.stats.total_products}</td>
                      <td className="p-3 font-mono text-center">{store.stats.total_sales}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          store.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {store.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingStore(store)}
                              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                              disabled={saving}
                              title="تعديل"
                            >
                              ✏️
                            </button>
                            {store.is_active ? (
                              <button
                                onClick={() => handleDelete(store)}
                                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                disabled={saving}
                                title="حذف/إلغاء تفعيل"
                              >
                                🗑️
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(store)}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                                disabled={saving}
                                title="إعادة تفعيل"
                              >
                                🔄
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {stores.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="p-12 text-center text-gray-400">
                      لا توجد مخازن
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* نموذج الإضافة */}
      {showAddForm && (
        <StoreFormModal
          title="إضافة مخزن/فرع جديد"
          onSave={handleAdd}
          onClose={() => setShowAddForm(false)}
          loading={saving}
        />
      )}

      {/* نموذج التعديل */}
      {editingStore && (
        <StoreFormModal
          title="تعديل المخزن/الفرع"
          store={editingStore}
          onSave={handleEdit}
          onClose={() => setEditingStore(null)}
          loading={saving}
        />
      )}
    </div>
  );
}

/* ============================================
   نموذج إضافة/تعديل المخزن
============================================ */
function StoreFormModal({ 
  title, 
  store, 
  onSave, 
  onClose, 
  loading 
}: { 
  title: string;
  store?: Store | null;
  onSave: (data: any) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: store?.name || '',
    type: store?.type || 'store',
    description: store?.description || '',
    is_active: store?.is_active !== undefined ? store.is_active : true
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('❌ اسم المخزن مطلوب');
      return;
    }
    
    onSave(formData);
  }

  function updateField(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">اسم المخزن/الفرع *</label>
            <input
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="مثال: المخزن الرئيسي"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">النوع *</label>
            <select
              className="input-field"
              value={formData.type}
              onChange={(e) => updateField('type', e.target.value)}
              disabled={loading}
            >
              <option value="store">📦 مخزن</option>
              <option value="showroom">🏪 معرض</option>
              <option value="vehicle">🚛 سيارة توزيع</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">الوصف</label>
            <textarea
              className="input-field"
              rows={2}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="وصف المخزن أو محتوياته..."
              disabled={loading}
            />
          </div>

          {store && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  disabled={loading}
                  className="accent-nazlawy-500"
                />
                <span className="text-sm">مخزن نشط</span>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'جاري الحفظ...' : store ? 'تحديث' : 'إضافة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================
   تبويب سجل التعديلات
============================================ */
interface Adjustment {
  id: string;
  adjustment_date: string;
  product_name: string;
  store_name: string;
  old_quantity: number;
  new_quantity: number;
  difference: number;
  adjustment_type: string;
  unit_cost: number | null;
  financial_impact: number | null;
  reason: string | null;
  notes: string | null;
  user: { id: number; full_name: string; username: string } | null;
}

function AdjustmentsTab({ profile }: { profile: any }) {
  const [storeId, setStoreId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const searchParams = useSearchParams();

  const params = new URLSearchParams();
  if (storeId) params.set('store_id', storeId);
  if (adjustmentType) params.set('adjustment_type', adjustmentType);
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  params.set('page', page.toString());
  params.set('limit', '50');

  // Update page from URL params
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) setPage(parseInt(pageParam));
  }, [searchParams]);

  const { data, loading } = useApi<{ items: Adjustment[]; total: number; page: number; limit: number }>(`/api/inventory/adjustments?${params.toString()}`);
  const { data: summaryData } = useApi<any>('/api/inventory/summary');
  const stores = summaryData?.stores || [];
  const showCost = profile?.can_see_cost;

  const adjustmentTypes = ['إضافة أولية', 'جرد', 'تسوية', 'فاقد', 'تصحيح'];

  // حساب إحصائيات
  const stats = data?.items.reduce((acc, adj) => {
    acc.total_adjustments++;
    if (adj.difference > 0) {
      acc.total_increases++;
      acc.total_increase_qty += Number(adj.difference);
    } else {
      acc.total_decreases++;
      acc.total_decrease_qty += Math.abs(Number(adj.difference));
    }
    if (showCost && adj.financial_impact) {
      acc.total_financial_impact += Number(adj.financial_impact);
    }
    return acc;
  }, {
    total_adjustments: 0,
    total_increases: 0,
    total_decreases: 0,
    total_increase_qty: 0,
    total_decrease_qty: 0,
    total_financial_impact: 0
  });

  return (
    <div className="space-y-6">
      {/* إحصائيات */}
      {stats && stats.total_adjustments > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-700 text-white">
            <h3 className="text-sm opacity-90 mb-1">إجمالي التعديلات</h3>
            <div className="text-2xl font-bold">{stats.total_adjustments}</div>
          </div>
          <div className="card bg-gradient-to-r from-green-500 to-green-700 text-white">
            <h3 className="text-sm opacity-90 mb-1">زيادات</h3>
            <div className="text-2xl font-bold">{stats.total_increases}</div>
            <div className="text-xs opacity-80 mt-1">الكمية: +{formatQty(stats.total_increase_qty)}</div>
          </div>
          <div className="card bg-gradient-to-r from-red-500 to-red-700 text-white">
            <h3 className="text-sm opacity-90 mb-1">نقص/فاقد</h3>
            <div className="text-2xl font-bold">{stats.total_decreases}</div>
            <div className="text-xs opacity-80 mt-1">الكمية: {formatQty(stats.total_decrease_qty)}</div>
          </div>
          {showCost && (
            <div className="card bg-gradient-to-r from-purple-500 to-purple-700 text-white">
              <h3 className="text-sm opacity-90 mb-1">التأثير المالي</h3>
              <div className="text-xl font-bold">{formatEGP(stats.total_financial_impact)} ج</div>
            </div>
          )}
        </div>
      )}

      {/* الفلاتر */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">المخزن</label>
            <select className="input-field text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">كل المخازن</option>
              {stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">نوع التعديل</label>
            <select className="input-field text-sm" value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)}>
              <option value="">الكل</option>
              {adjustmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">من تاريخ</label>
            <input type="date" className="input-field text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">إلى تاريخ</label>
            <input type="date" className="input-field text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* الجدول */}
      {loading ? (
        <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div>
      ) : (
        <>
          {/* Mobile: كاردات */}
          <div className="space-y-2 md:hidden">
            {data?.items.map(adj => (
              <div key={adj.id} className="card p-3 border-r-4 border-r-nazlawy-500">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-sm">{adj.product_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">🏢 {adj.store_name}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    adj.adjustment_type === 'إضافة أولية' ? 'bg-blue-100 text-blue-800' :
                    adj.adjustment_type === 'تسوية' || adj.adjustment_type === 'جرد' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {adj.adjustment_type}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs mb-2 py-2 border-y">
                  <div className="text-center">
                    <div className="text-gray-500">القديمة</div>
                    <div className="font-mono font-bold">{formatQty(adj.old_quantity)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500">→</div>
                    <div className={`font-mono font-bold text-lg ${adj.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {adj.difference > 0 ? '+' : ''}{formatQty(adj.difference)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500">الجديدة</div>
                    <div className="font-mono font-bold">{formatQty(adj.new_quantity)}</div>
                  </div>
                </div>

                {showCost && adj.financial_impact !== null && (
                  <div className="text-xs text-purple-700 font-mono mb-1">
                    💰 التأثير المالي: {formatEGP(adj.financial_impact)} ج
                  </div>
                )}

                {adj.reason && (
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">السبب:</span> {adj.reason}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t">
                  <span>👤 {adj.user?.full_name || '—'}</span>
                  <span>{formatDate(adj.adjustment_date)}</span>
                </div>
              </div>
            ))}
            {data?.items.length === 0 && (
              <div className="card text-center py-12 text-gray-400">لا توجد تعديلات</div>
            )}
          </div>

          {/* Desktop: جدول */}
          <div className="card overflow-x-auto p-0 hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">التاريخ</th>
                  <th className="p-3 text-right">الصنف</th>
                  <th className="p-3 text-right">المخزن</th>
                  <th className="p-3 text-right">القديمة</th>
                  <th className="p-3 text-right">الفرق</th>
                  <th className="p-3 text-right">الجديدة</th>
                  <th className="p-3 text-right">النوع</th>
                  {showCost && <th className="p-3 text-right">التأثير المالي</th>}
                  <th className="p-3 text-right">السبب</th>
                  <th className="p-3 text-right">بواسطة</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map(adj => (
                  <tr key={adj.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-xs text-gray-600">{formatDate(adj.adjustment_date)}</td>
                    <td className="p-3 font-semibold">{adj.product_name}</td>
                    <td className="p-3 text-xs">{adj.store_name}</td>
                    <td className="p-3 font-mono text-gray-500">{formatQty(adj.old_quantity)}</td>
                    <td className={`p-3 font-mono font-bold ${adj.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {adj.difference > 0 ? '+' : ''}{formatQty(adj.difference)}
                    </td>
                    <td className="p-3 font-mono font-bold">{formatQty(adj.new_quantity)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        adj.adjustment_type === 'إضافة أولية' ? 'bg-blue-100 text-blue-800' :
                        adj.adjustment_type === 'تسوية' || adj.adjustment_type === 'جرد' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {adj.adjustment_type}
                      </span>
                    </td>
                    {showCost && (
                      <td className="p-3 font-mono text-xs text-purple-700">
                        {adj.financial_impact !== null ? formatEGP(adj.financial_impact) : '—'}
                      </td>
                    )}
                    <td className="p-3 text-xs text-gray-600 max-w-[200px] truncate" title={adj.reason || ''}>
                      {adj.reason || '—'}
                    </td>
                    <td className="p-3 text-xs text-gray-600">{adj.user?.full_name || '—'}</td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={showCost ? 10 : 9} className="p-12 text-center text-gray-400">
                      لا توجد تعديلات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && data.total > 0 && (
        <>
          <div className="text-sm text-gray-500 text-center">
            عرض {data.items.length} من أصل {data.total} تعديل
          </div>
          <Pagination
            total={data.total}
            page={data.page}
            pageSize={data.limit}
            baseUrl="/inventory"
          />
        </>
      )}
    </div>
  );
}

/* ============================================
   تبويب التحويلات
============================================ */
function TransfersTab() {
  const [showTransfer, setShowTransfer] = useState(false);
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
        <button
          onClick={() => setShowTransfer(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          🔄 تحويل بين المخازن
        </button>
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

      {showTransfer && <InventoryBulkTransferModal onClose={() => setShowTransfer(false)} onSaved={() => { setShowTransfer(false); refetch(); }} />}
    </div>
  );
}

// 📦 مودال التحويل بين المخازن (يدعم اختيار صنف واحد أو عدة أصناف أو الكل)
function InventoryBulkTransferModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [notes, setNotes] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{
    [productId: string]: { selected: boolean; quantity: number; maxQty: number; name: string };
  }>({});
  const [search, setSearch] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const { mutate, loading: saving } = useApiMutation();

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((j) => {
        const items = j.data?.items || j.data || [];
        setStores(items);
        if (items.length > 0) {
          setFromStoreId(items[0].id);
          if (items.length > 1) {
            setToStoreId(items[1].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!fromStoreId) {
      setInventoryItems([]);
      setSelectedItems({});
      return;
    }
    setLoadingInventory(true);
    fetch(`/api/inventory?store_id=${fromStoreId}&limit=5000`)
      .then((r) => r.json())
      .then((j) => {
        const raw = (j.data?.items || []) as any[];
        const available = raw.filter((inv) => Number(inv.current_stock) > 0);
        setInventoryItems(available);

        const initialSelected: { [id: string]: any } = {};
        available.forEach((inv) => {
          const qty = Number(inv.current_stock);
          initialSelected[inv.product.id] = {
            selected: true,
            quantity: qty,
            maxQty: qty,
            name: inv.product.name,
          };
        });
        setSelectedItems(initialSelected);
      })
      .catch(() => {})
      .finally(() => setLoadingInventory(false));
  }, [fromStoreId]);

  const filteredItems = inventoryItems.filter((inv) =>
    inv.product.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const selectedEntries = Object.entries(selectedItems).filter(([_, val]) => val.selected && val.quantity > 0);
  const selectedCount = selectedEntries.length;
  const totalQuantity = selectedEntries.reduce((sum, [_, val]) => sum + val.quantity, 0);

  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((inv) => selectedItems[inv.product.id]?.selected);

  function toggleSelectAll() {
    const nextState = !allFilteredSelected;
    setSelectedItems((prev) => {
      const updated = { ...prev };
      filteredItems.forEach((inv) => {
        if (updated[inv.product.id]) {
          updated[inv.product.id].selected = nextState;
        }
      });
      return updated;
    });
  }

  function setAllToMaxQuantity() {
    setSelectedItems((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id].quantity = updated[id].maxQty;
      });
      return updated;
    });
  }

  function toggleItem(productId: string) {
    setSelectedItems((prev) => {
      const cur = prev[productId];
      if (!cur) return prev;
      return {
        ...prev,
        [productId]: { ...cur, selected: !cur.selected },
      };
    });
  }

  function updateItemQty(productId: string, val: number) {
    setSelectedItems((prev) => {
      const cur = prev[productId];
      if (!cur) return prev;
      const validVal = Math.max(0, Math.min(cur.maxQty, val));
      return {
        ...prev,
        [productId]: { ...cur, quantity: validVal },
      };
    });
  }

  const fromStoreName = stores.find((s) => s.id === fromStoreId)?.name || "المخزن المصدر";
  const toStoreName = stores.find((s) => s.id === toStoreId)?.name || "المخزن الوجهة";

  async function executeBulkTransfer() {
    if (!fromStoreId || !toStoreId) {
      alert("❌ يرجى اختيار المخزن المصدر والمخزن الوجهة");
      return;
    }
    if (fromStoreId === toStoreId) {
      alert("❌ لا يمكن التحويل لنفس المخزن");
      return;
    }
    if (selectedCount === 0 || totalQuantity <= 0) {
      alert("❌ يرجى تحديد صنف واحد على الأقل بكمية صالحة");
      return;
    }

    const payload = {
      from_store_id: fromStoreId,
      to_store_id: toStoreId,
      notes: notes || `تحويل مخزني (${selectedCount} صنف)`,
      transfer_date: transferDate || undefined,
      items: selectedEntries.map(([productId, val]) => ({
        product_id: productId,
        quantity: val.quantity,
      })),
    };

    const { error, data } = await mutate<{ transfers: any[]; count: number }>("POST", "/api/transfers", payload);
    if (error) {
      alert("❌ " + error);
      return;
    }

    alert(`✅ تم التحويل بين المخازن بنجاح!\nعدد الأصناف المحولة: ${data?.count || selectedCount} صنف\nإجمالي الكمية: ${formatQty(totalQuantity)}`);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100"
      >
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              🔄 تحويل بين المخازن
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              تحويل صنف واحد أو عدة أصناف أو كامل المخزون بنقرة واحدة
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                📤 من مخزن (المصدر) *
              </label>
              <select
                className="input-field text-sm font-semibold"
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                📥 إلى مخزن (الوجهة) *
              </label>
              <select
                className="input-field text-sm font-semibold"
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
              >
                <option value="">-- اختر المخزن المستلم --</option>
                {stores
                  .filter((s) => s.id !== fromStoreId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                📋 أصناف المخزن المصدر المتاحة ({inventoryItems.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  {allFilteredSelected ? "❌ إلغاء تحديد الكل" : "✅ تحديد الكل"}
                </button>
                <button
                  type="button"
                  onClick={setAllToMaxQuantity}
                  className="px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  ⚡ كامل الرصيد المتاح
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="🔍 ابحث بالاسم في أصناف المخزن المصدر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field text-xs"
            />

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
              {loadingInventory ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  ⏳ جاري تحميل أصناف المخزن...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  لا توجد أصناف برصيد متاح في هذا المخزن
                </div>
              ) : (
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-black border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded cursor-pointer accent-emerald-600"
                        />
                      </th>
                      <th className="p-2.5">اسم الصنف</th>
                      <th className="p-2.5 text-center">المتاح بالمخزن</th>
                      <th className="p-2.5 text-center w-36">الكمية للتحويل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((inv) => {
                      const itemState = selectedItems[inv.product.id] || {
                        selected: false,
                        quantity: 0,
                        maxQty: Number(inv.current_stock),
                        name: inv.product.name,
                      };
                      const isChecked = itemState.selected;

                      return (
                        <tr
                          key={inv.id}
                          className={`transition-colors ${
                            isChecked ? "bg-emerald-50/40 font-medium" : "hover:bg-gray-50 text-gray-500"
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItem(inv.product.id)}
                              className="w-4 h-4 rounded cursor-pointer accent-emerald-600"
                            />
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{inv.product.name}</div>
                            {inv.product.category && (
                              <span className="text-[10px] text-gray-400">{inv.product.category}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                            {formatQty(itemState.maxQty)}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={itemState.maxQty}
                                step="any"
                                value={itemState.quantity}
                                onChange={(e) =>
                                  updateItemQty(inv.product.id, parseFloat(e.target.value) || 0)
                                }
                                disabled={!isChecked}
                                className="w-24 input-field text-center text-xs py-1 px-1 font-mono font-bold disabled:opacity-40"
                              />
                              <button
                                type="button"
                                title="تعيين كامل الرصيد"
                                onClick={() => updateItemQty(inv.product.id, itemState.maxQty)}
                                disabled={!isChecked}
                                className="text-[10px] bg-slate-200 hover:bg-slate-300 px-1.5 py-1 rounded font-bold cursor-pointer disabled:opacity-40"
                              >
                                الكل
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">تاريخ التحويل</label>
              <input
                type="date"
                className="input-field text-xs"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">ملاحظات التحويل</label>
              <input
                type="text"
                placeholder="ملاحظات (اختياري)..."
                className="input-field text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg font-black text-xs">
              المحدد: {selectedCount} صنف
            </span>
            <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-lg font-black text-xs font-mono">
              إجمالي الكمية: {formatQty(totalQuantity)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">
              إلغاء
            </button>
            <button
              onClick={() => {
                if (fromStoreId === toStoreId) {
                  alert("❌ لا يمكن التحويل لنفس المخزن");
                  return;
                }
                if (selectedCount === 0 || totalQuantity <= 0) {
                  alert("❌ يرجى تحديد أصناف للتحويل أولاً");
                  return;
                }
                setShowConfirm(true);
              }}
              disabled={saving || selectedCount === 0 || totalQuantity <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {saving ? "⏳ جاري التحويل..." : `🔄 تحويل (${selectedCount}) صنف الآن`}
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border-2 border-emerald-500 text-center"
          >
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
              🔄
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">تأكيد التحويل بين المخازن</h3>
              <p className="text-xs text-slate-600 mt-1">
                يرجى مراجعة تفاصيل التحويل قبل الاعتماد النهائي:
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-right text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-gray-500">من مخزن:</span>
                <strong className="text-slate-800">{fromStoreName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">إلى مخزن:</span>
                <strong className="text-emerald-700">{toStoreName}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-gray-500">عدد الأصناف:</span>
                <strong className="text-slate-900">{selectedCount} صنف</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">إجمالي الكمية:</span>
                <strong className="text-emerald-600 font-mono text-sm">
                  {formatQty(totalQuantity)}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 font-bold">
              ⚠️ سيتم خصم هذه الكميات فوراً من [{fromStoreName}] وإضافتها إلى [{toStoreName}].
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  executeBulkTransfer();
                }}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-black text-sm shadow-md transition-all cursor-pointer"
              >
                {saving ? "⏳ جاري التنفيذ..." : "✅ نعم، تأكيد التحويل"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-sm cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================
   نموذج الإضافة الجماعية
============================================ */
interface BulkItem {
  id: number;
  product_name: string;
  category: string;
  unit: string;
  units_per_carton: number;
  default_sale_price: number;
  last_purchase_price: number;
  quantity: number;
  reorder_level: number;
  notes: string;
}

function BulkAddModal({ stores, onClose, onSaved }: { stores: any[]; onClose: () => void; onSaved: () => void }) {
  const [storeId, setStoreId] = useState(stores[0]?.id || '');
  const [items, setItems] = useState<BulkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // تهيئة 20 صف فارغ
  useEffect(() => {
    const emptyRows: BulkItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      product_name: '',
      category: '',
      unit: 'piece',
      units_per_carton: 1,
      default_sale_price: 0,
      last_purchase_price: 0,
      quantity: 0,
      reorder_level: 5,
      notes: ''
    }));
    setItems(emptyRows);
  }, []);

  function updateItem(id: number, field: keyof BulkItem, value: any) {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  }

  async function handleSave() {
    // فلترة الصفوف الممتلئة فقط
    const filledItems = items.filter(i => i.product_name.trim() !== '');
    
    if (filledItems.length === 0) {
      alert('❌ أدخل صنف واحد على الأقل');
      return;
    }

    if (!storeId) {
      alert('❌ اختر المخزن');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/inventory/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          items: filledItems
        })
      });

      const json = await response.json();

      if (!response.ok) {
        alert('❌ ' + (json?.error?.message || 'حدث خطأ'));
        setLoading(false);
        return;
      }

      setResults(json.data);
      setLoading(false);

      if (json.data.error_count === 0) {
        alert(`✅ تم إضافة ${json.data.success_count} صنف بنجاح!`);
        onSaved();
      } else {
        // عرض النتائج
        alert(`✅ تم إضافة ${json.data.success_count} صنف\n❌ فشل ${json.data.error_count} صنف\n\nراجع التفاصيل في الشاشة`);
      }

    } catch (err: any) {
      alert('❌ خطأ: ' + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">📦 إدخال أصناف متعددة</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">المخزن المستهدف:</label>
            <select 
              className="input-field w-auto" 
              value={storeId} 
              onChange={(e) => setStoreId(e.target.value)}
              disabled={loading}
            >
              <option value="">اختر المخزن...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span className="text-xs text-gray-500 mr-auto">يمكنك إدخال حتى 20 صنف</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 text-right border">#</th>
                <th className="p-2 text-right border min-w-[200px]">اسم الصنف *</th>
                <th className="p-2 text-right border min-w-[120px]">الفئة</th>
                <th className="p-2 text-right border w-24">الوحدة</th>
                <th className="p-2 text-right border w-24">قطع/كرتونة</th>
                <th className="p-2 text-right border w-28">سعر البيع *</th>
                <th className="p-2 text-right border w-28">سعر الشراء *</th>
                <th className="p-2 text-right border w-24">الكمية *</th>
                <th className="p-2 text-right border w-24">الحد الأدنى</th>
                <th className="p-2 text-right border min-w-[150px]">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center text-gray-500">{item.id}</td>
                  <td className="p-2 border">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-nazlawy-500 rounded"
                      value={item.product_name}
                      onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                      placeholder="أدخل اسم الصنف..."
                      disabled={loading}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-nazlawy-500 rounded"
                      value={item.category}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      placeholder="الفئة"
                      disabled={loading}
                    />
                  </td>
                  <td className="p-2 border">
                    <select
                      className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-nazlawy-500 rounded text-xs"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      disabled={loading}
                    >
                      <option value="piece">قطعة</option>
                      <option value="box">علبة</option>
                      <option value="carton">كرتونة</option>
                    </select>
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-nazlawy-500 rounded text-center"
                      value={item.units_per_carton}
                      onChange={(e) => updateItem(item.id, 'units_per_carton', parseInt(e.target.value) || 1)}
                      min="1"
                      disabled={loading}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-nazlawy-500 rounded text-center font-mono"
                      value={item.default_sale_price}
                      onChange={(e) => updateItem(item.id, 'default_sale_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      disabled={loading}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-nazlawy-500 rounded text-center font-mono"
                      value={item.last_purchase_price}
                      onChange={(e) => updateItem(item.id, 'last_purchase_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      disabled={loading}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-nazlawy-500 rounded text-center font-mono font-bold"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      disabled={loading}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-nazlawy-500 rounded text-center"
                      value={item.reorder_level}
                      onChange={(e) => updateItem(item.id, 'reorder_level', parseInt(e.target.value) || 5)}
                      min="0"
                      disabled={loading}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-nazlawy-500 rounded text-xs"
                      value={item.notes}
                      onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                      placeholder="ملاحظات..."
                      disabled={loading}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Results */}
        {results && results.error_count > 0 && (
          <div className="px-6 py-3 border-t bg-yellow-50">
            <h3 className="font-bold text-sm mb-2">⚠️ الأخطاء ({results.error_count}):</h3>
            <div className="space-y-1 max-h-32 overflow-auto">
              {results.errors.map((err: any, idx: number) => (
                <div key={idx} className="text-xs text-red-700">
                  صف #{err.row}: {err.name || '—'} - {err.error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            💡 اترك الصفوف الفارغة، سيتم تجاهلها تلقائياً
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary" disabled={loading}>
              إلغاء
            </button>
            <button 
              onClick={handleSave} 
              disabled={loading || !storeId} 
              className="btn-primary min-w-[120px]"
            >
              {loading ? '⏳ جاري الحفظ...' : '💾 حفظ الكل'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

