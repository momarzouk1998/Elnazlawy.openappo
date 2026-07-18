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

  const params = new URLSearchParams();
  if (storeId) params.set('store_id', storeId);
  if (category) params.set('category', category);
  if (lowOnly) params.set('low_stock', '1');
  if (search) params.set('search', search);

  const { data: summaryData, loading: summaryLoading } = useApi<any>('/api/inventory/summary');
  const { data, loading, refetch } = useApi<InvItem[]>(`/api/inventory?${params.toString()}`);
  const stores = summaryData?.stores || [];
  const overall = summaryData?.overall;
  const showCost = profile?.can_see_cost;

  // استخراج الفئات المتاحة
  const categories = Array.from(new Set(data?.map(i => i.product.category).filter(Boolean))) as string[];

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
            {data?.map(i => {
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
            {data?.length === 0 && (
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
                {data?.map(i => {
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
                          <button
                            onClick={() => startEdit(i)}
                            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                            title="تعديل الكمية"
                          >
                            ✏️ تعديل
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {data?.length === 0 && <tr><td colSpan={showCost ? 7 : 6} className="p-12 text-center text-gray-400">لا توجد بيانات</td></tr>}
              </tbody>
            </table>
          </div>
        </>
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

  const params = new URLSearchParams();
  if (storeId) params.set('store_id', storeId);
  if (adjustmentType) params.set('adjustment_type', adjustmentType);
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  params.set('limit', '200');

  const { data, loading } = useApi<{ items: Adjustment[]; total: number }>(`/api/inventory/adjustments?${params.toString()}`);
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
        <div className="text-sm text-gray-500 text-center">
          عرض {data.items.length} من أصل {data.total} تعديل
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

