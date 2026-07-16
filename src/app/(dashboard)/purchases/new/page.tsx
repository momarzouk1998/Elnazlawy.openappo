"use client";
import { useState, useEffect } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatQty } from "@/lib/format";
import { useRouter } from "next/navigation";

interface Product { id: string; name: string; unit: string; last_purchase_price: number; total_stock: number; }
interface Supplier { id: string; name: string; balance: number; }
interface Store { id: string; name: string; type: string; }
interface CartItem { product_id: string; product_name: string; store_id: string; store_name: string; quantity: number; unit_cost: number; }

export default function NewPurchasePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [notes, setNotes] = useState("");
  const { mutate, loading: saving } = useApiMutation();
  const { data: productsData } = useApi<{ items: Product[] }>(`/api/products?search=${encodeURIComponent(search)}&limit=30`);
  const { data: suppliers } = useApi<{ items: Supplier[] }>('/api/suppliers?limit=200');
  const { data: stores } = useApi<Store[]>('/api/stores');

  useEffect(() => {
    if (stores && stores.length > 0 && !storeId) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const total = cart.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

  function addToCart(p: Product) {
    if (!storeId) { alert('اختر مخزن للاستلام أولاً'); return; }
    const existing = cart.find(c => c.product_id === p.id && c.store_id === storeId);
    if (existing) {
      setCart(cart.map(c => c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      const store = stores?.find(s => s.id === storeId);
      setCart([...cart, {
        product_id: p.id,
        product_name: p.name,
        store_id: storeId,
        store_name: store?.name || '',
        quantity: 1,
        unit_cost: Number(p.last_purchase_price) || 0,
      }]);
    }
  }

  function updateItem(idx: number, field: keyof CartItem, value: any) {
    setCart(cart.map((c, i) => {
      if (i !== idx) return c;
      const next = { ...c, [field]: value };
      // منع الكمية من النزول تحت 0
      if (field === 'quantity') {
        const q = Number(value);
        next.quantity = Number.isFinite(q) && q >= 0 ? q : 0;
      }
      // سعر الشراء لا يقبل سالب
      if (field === 'unit_cost') {
        const v = Number(value);
        next.unit_cost = Number.isFinite(v) && v >= 0 ? v : 0;
      }
      return next;
    }));
  }

  // زيادة/نقصان الكمية بأزرار (المشتريات ليس لها حد أقصى)
  function adjustQty(idx: number, delta: number) {
    setCart(cart.map((c, i) => {
      if (i !== idx) return c;
      return { ...c, quantity: Math.max(0, c.quantity + delta) };
    }));
  }

  function removeItem(idx: number) {
    setCart(cart.filter((_, i) => i !== idx));
  }

  async function save() {
    if (cart.length === 0) { alert('السلة فارغة'); return; }
    if (!storeId) { alert('اختر مخزن للاستلام'); return; }
    // فلترة الأصناف غير الصالحة (كمية أو سعر صفر)
    const validItems = cart.filter(c => c.quantity > 0 && c.unit_cost >= 0);
    const invalid = cart.length - validItems.length;
    if (invalid > 0) {
      if (!confirm(`يوجد ${invalid} صنف بكمية أو سعر صفر وسيتم استبعاده. متابعة؟`)) return;
    }
    if (validItems.length === 0) { alert('❌ كل الأصناف لها كمية أو سعر غير صالح'); return; }
    if (!supplierId) {
      if (!confirm('لم تختر موردًا. هل تريد المتابعة؟')) return;
    }
    const validTotal = validItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
    const { error, data } = await mutate<{ id: string; purchase_number: number }>('POST', '/api/purchases/invoices', {
      supplier_id: supplierId || null,
      total_amount: validTotal,
      notes,
      items: validItems.map(c => ({ product_id: c.product_id, store_id: c.store_id, quantity: c.quantity, unit_cost: c.unit_cost, row_type: 'شراء' })),
    });
    if (error) { alert('❌ ' + error); return; }
    alert(`✅ تم حفظ فاتورة الشراء رقم ${data?.purchase_number}`);
    router.push('/purchases');
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Products panel */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-extrabold text-slate-650">📥 إنشاء فاتورة مشتريات</h1>
          <button onClick={() => router.push('/purchases')} className="btn-secondary text-sm">↩️ رجوع</button>
        </div>
        <div className="card">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث عن صنف بالاسم..."
            className="input-field"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[600px] overflow-y-auto">
          {productsData?.items.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="card text-right hover:border-nazlawy-500 hover:shadow-lg transition-all p-3"
            >
              <div className="font-semibold text-sm line-clamp-2">{p.name}</div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-nazlawy-600 font-bold">آخر سعر: {formatEGP(p.last_purchase_price)} ج</span>
                <span className="font-mono text-gray-600">متاح: {formatQty(p.total_stock)}</span>
              </div>
            </button>
          ))}
          {productsData?.items.length === 0 && <div className="card text-center text-gray-400 py-12">لا توجد نتائج</div>}
        </div>
      </div>

      {/* Cart panel */}
      <div className="space-y-3">
        <div className="card space-y-2">
          <h2 className="font-bold text-lg">🛍️ السلة ({cart.length})</h2>
          <div>
            <label className="text-xs text-gray-600">المورد</label>
            <select className="input-field text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— بدون مورد —</option>
              {suppliers?.items.map(s => <option key={s.id} value={s.id}>{s.name} (مستحق: {formatEGP(s.balance)})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">مخزن الاستلام</label>
            <select className="input-field text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              {stores?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="card max-h-[300px] overflow-y-auto p-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">السلة فارغة</div>
          ) : (
            <div className="space-y-2">
              {cart.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2 text-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-semibold flex-1 line-clamp-2">{c.product_name}</div>
                    <button onClick={() => removeItem(i)} className="text-red-500 text-xs shrink-0">✕ حذف</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">الكمية</label>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => adjustQty(i, -1)} className="w-6 h-7 shrink-0 rounded bg-gray-200 text-gray-700 font-bold hover:bg-gray-300">−</button>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="input-field text-xs p-1 text-center w-full"
                          value={c.quantity}
                          onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                        <button type="button" onClick={() => adjustQty(i, 1)} className="w-6 h-7 shrink-0 rounded bg-gray-200 text-gray-700 font-bold hover:bg-gray-300">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">سعر الشراء (ج)</label>
                      <input type="number" min={0} step="any" className="input-field text-xs p-1" value={c.unit_cost} onChange={(e) => updateItem(i, 'unit_cost', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">الإجمالي</label>
                      <div className="text-xs font-bold text-nazlawy-600 text-center p-1 bg-white rounded border">{formatEGP(c.quantity * c.unit_cost)}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{c.store_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-2">
          <div className="flex justify-between text-lg font-extrabold border-t pt-2">
            <span>الإجمالي:</span><span className="text-nazlawy-600">{formatEGP(total)} ج</span>
          </div>
          <textarea className="input-field text-xs" rows={2} placeholder="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button onClick={save} disabled={saving || cart.length === 0} className="btn-primary w-full">
            {saving ? '⏳ جاري الحفظ...' : `✅ حفظ الفاتورة (${formatEGP(total)} ج)`}
          </button>
        </div>
      </div>
    </div>
  );
}
