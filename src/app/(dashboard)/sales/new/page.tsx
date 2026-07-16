"use client";
import { useState, useEffect } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatQty } from "@/lib/format";
import { useRouter } from "next/navigation";
import SearchableSelect, { type SearchOption } from "@/components/SearchableSelect";

interface Product {
  id: string; name: string; unit: string; default_sale_price: number; total_stock: number;
  category?: string | null;
  inventory_items?: { current_stock: number; store_id: string }[];
}
interface Customer { id: string; name: string; balance: number; phone?: string | null; }
interface Store { id: string; name: string; type: string; }
interface CartItem { product_id: string; product_name: string; store_id: string; store_name: string; quantity: number; unit_price: number; available: number; product_ref: Product; }

export default function POSPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [invoiceType, setInvoiceType] = useState("عادية");
  const [status, setStatus] = useState("قيد التنفيذ");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [smartSplitItem, setSmartSplitItem] = useState<{ product: Product, requestedQty: number, currentStoreId: string, itemIdx?: number } | null>(null);
  const { mutate, loading: saving } = useApiMutation();
  const { data: productsData } = useApi<{ items: Product[] }>(`/api/products?search=${encodeURIComponent(search)}&limit=30`);
  const { data: customers } = useApi<{ items: Customer[] }>('/api/customers?limit=200');
  const { data: stores } = useApi<{ items: Store[] }>('/api/stores');

  useEffect(() => {
    if (stores?.items && stores.items.length > 0 && !storeId) setStoreId(stores.items[0].id);
  }, [stores, storeId]);

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - discount);

  // المخزون المتاح للصنف في المخزن المختار
  function stockFor(p: Product, sId: string = storeId): number {
    if (!sId) return 0;
    const perStore = p.inventory_items?.find(i => i.store_id === sId);
    return perStore ? Number(perStore.current_stock) : Number(p.total_stock);
  }

  function addToCart(p: Product) {
    if (!storeId) { alert('اختر مخزن أولاً'); return; }
    const available = stockFor(p);
    const existing = cart.find(c => c.product_id === p.id && c.store_id === storeId);
    const currentQty = existing ? existing.quantity : 0;
    
    if (available <= 0 && p.total_stock > 0) {
      setSmartSplitItem({ product: p, requestedQty: 1, currentStoreId: storeId });
      return;
    }
    if (available <= 0) { alert(`❌ الصنف "${p.name}" غير متوفر في أي مخزن`); return; }
    
    if (currentQty + 1 > available) {
      if (p.total_stock >= currentQty + 1) {
        setSmartSplitItem({ product: p, requestedQty: currentQty + 1, currentStoreId: storeId });
      } else {
        alert(`⚠️ الكمية المطلوبة تتجاوز إجمالي المخزون المتاح في جميع المخازن (${p.total_stock})`);
      }
      return;
    }
    
    if (existing) {
      setCart(cart.map(c => c.product_id === p.id && c.store_id === storeId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      const store = stores?.items.find(s => s.id === storeId);
      setCart([...cart, {
        product_id: p.id,
        product_name: p.name,
        store_id: storeId,
        store_name: store?.name || '',
        quantity: 1,
        unit_price: Number(p.default_sale_price),
        available,
        product_ref: p
      }]);
    }
  }

  function updateItem(idx: number, field: keyof CartItem, value: any) {
    let shouldOpenSplit = false;
    let splitParams: any = null;

    setCart(cart.map((c, i) => {
      if (i !== idx) return c;
      let next = { ...c, [field]: value };
      if (field === 'quantity') {
        const q = Number(value);
        if (!Number.isFinite(q) || q <= 0) {
          next.quantity = 0;
        } else if (q > c.available) {
          if (c.product_ref.total_stock >= q) {
            shouldOpenSplit = true;
            splitParams = { product: c.product_ref, requestedQty: q, currentStoreId: c.store_id, itemIdx: i };
            return c; // لا تحدث الكمية هنا، سنحدثها في الـ Modal
          } else {
            alert(`⚠️ الكمية المطلوبة تتجاوز إجمالي المخزون المتاح في جميع المخازن (${c.product_ref.total_stock})`);
            next.quantity = c.available;
          }
        } else {
          next.quantity = q;
        }
      }
      if (field === 'unit_price') {
        const v = Number(value);
        next.unit_price = Number.isFinite(v) && v >= 0 ? v : 0;
      }
      return next;
    }));

    if (shouldOpenSplit && splitParams) {
      setSmartSplitItem(splitParams);
    }
  }

  function adjustQty(idx: number, delta: number) {
    const c = cart[idx];
    if (!c) return;
    const newQty = c.quantity + delta;
    updateItem(idx, 'quantity', newQty);
  }

  function removeItem(idx: number) {
    setCart(cart.filter((_, i) => i !== idx));
  }
  
  function handleSmartSplitConfirm(splits: { store_id: string, store_name: string, quantity: number }[]) {
    if (!smartSplitItem) return;
    const { product, itemIdx } = smartSplitItem;
    
    // إزالة العنصر القديم إذا كنا نعدل
    let newCart = [...cart];
    if (itemIdx !== undefined) {
      newCart = newCart.filter(c => c.product_id !== product.id);
    } else {
      newCart = newCart.filter(c => c.product_id !== product.id);
    }
    
    // إضافة الأسطر الجديدة
    splits.forEach(split => {
      if (split.quantity > 0) {
        newCart.push({
          product_id: product.id,
          product_name: product.name,
          store_id: split.store_id,
          store_name: split.store_name,
          quantity: split.quantity,
          unit_price: Number(product.default_sale_price),
          available: stockFor(product, split.store_id),
          product_ref: product
        });
      }
    });
    
    setCart(newCart);
    setSmartSplitItem(null);
  }

  async function save() {
    if (cart.length === 0) { alert('السلة فارغة'); return; }
    const validItems = cart.filter(c => c.quantity > 0 && c.unit_price >= 0);
    const invalid = cart.length - validItems.length;
    if (invalid > 0) {
      if (!confirm(`يوجد ${invalid} صنف بكمية أو سعر صفر وسيتم استبعاده. متابعة؟`)) return;
    }
    if (validItems.length === 0) { alert('❌ كل الأصناف لها كمية أو سعر غير صالح'); return; }
    if (status !== 'قيد التنفيذ' && invoiceType !== 'عرض سعر' && !customerId) {
      if (!confirm('لم تختر عميل. هل تريد المتابعة؟')) return;
    }
    
    const finalStatus = invoiceType === 'عرض سعر' ? 'قيد التنفيذ' : status;

    const { error, data } = await mutate<{ id: string; invoice_number: number }>('POST', '/api/sales/invoices', {
      customer_id: customerId || null,
      store_id: storeId, // المخزن الافتراضي للفاتورة، بس كل سطر ليه مخزنه الخاص
      invoice_type: invoiceType,
      status: finalStatus,
      items: validItems.map(c => ({ product_id: c.product_id, store_id: c.store_id, quantity: c.quantity, unit_price: c.unit_price, row_type: 'بيع' })),
      subtotal: validItems.reduce((s, i) => s + i.quantity * i.unit_price, 0),
      discount,
      total: Math.max(0, validItems.reduce((s, i) => s + i.quantity * i.unit_price, 0) - discount),
      notes,
    });
    if (error) { alert('❌ ' + error); return; }
    alert(`✅ تم حفظ الفاتورة رقم ${data?.invoice_number}`);
    setCart([]);
    setDiscount(0);
    setNotes("");
    if (finalStatus === 'مكتملة') {
      router.push(`/print/invoice/${data?.id}`);
    } else {
      router.push(`/sales`);
    }
  }

  const customerOptions: SearchOption[] = (customers?.items || []).map(c => ({
    id: c.id,
    name: c.name,
    sub: c.phone || undefined,
    extra: `مديون: ${formatEGP(c.balance)} ج`,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Products panel */}
      <div className="lg:col-span-2 space-y-3">
        <h1 className="text-2xl font-extrabold text-slate-650">🛒 إنشاء فاتورة مبيعات</h1>
        <div className="card">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث عن صنف بالاسم أو الباركود..."
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
                <span className="text-nazlawy-600 font-bold">{formatEGP(p.default_sale_price)} ج</span>
                <span className={`font-mono ${p.total_stock <= 0 ? 'text-red-500' : 'text-gray-600'}`}>
                  متاح: {formatQty(p.total_stock)}
                </span>
              </div>
            </button>
          ))}
          {search.trim() !== "" && productsData?.items.length === 0 && (
            <div className="col-span-full card p-4 text-center">
              <p className="text-gray-500 mb-2">لا توجد نتائج لـ "{search}"</p>
              <button
                type="button"
                onClick={() => setShowNewProduct(true)}
                className="btn-primary text-sm"
              >+ إضافة صنف جديد بهذا الاسم</button>
            </div>
          )}
          {search.trim() === "" && productsData?.items.length === 0 && (
            <div className="card text-center text-gray-400 py-12 col-span-full">ابدأ بكتابة اسم الصنف للبحث</div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="space-y-3">
        <div className="card space-y-2">
          <h2 className="font-bold text-lg">🛍️ السلة ({cart.length})</h2>
          <div>
            <label className="text-xs text-gray-600 block mb-1">العميل</label>
            <SearchableSelect
              options={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              placeholder="🔍 ابحث عن عميل بالاسم أو الهاتف..."
              emptyLabel="— بدون عميل —"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 block mb-1">المخزن الأساسي للفاتورة</label>
              <select className="input-field text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                {stores?.items.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">النوع</label>
              <select className="input-field text-sm" value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                <option value="عادية">عادية</option>
                <option value="ضريبية">ضريبية</option>
                <option value="عرض سعر">عرض سعر</option>
              </select>
            </div>
          </div>
          {invoiceType !== 'عرض سعر' && (
            <div>
              <label className="text-xs text-gray-600 block mb-1">حالة الفاتورة</label>
              <select className="input-field text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="قيد التنفيذ">قيد التنفيذ (مسودة — قابلة للتعديل)</option>
                <option value="مكتملة">مكتملة (نهائية — تخصم المخزون)</option>
              </select>
            </div>
          )}
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
                      <label className="text-[10px] text-gray-500 block mb-0.5">سعر الوحدة (ج)</label>
                      <input type="number" min={0} step="any" className="input-field text-xs p-1" value={c.unit_price} onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">الإجمالي</label>
                      <div className="text-xs font-bold text-nazlawy-600 text-center p-1 bg-white rounded border">{formatEGP(c.quantity * c.unit_price)}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{c.store_name} • متاح: {formatQty(c.available)} {c.quantity >= c.available && c.available > 0 && <span className="text-red-600 font-bold">• وصلت للحد الأقصى</span>}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-2">
          <div className="flex justify-between text-sm"><span>الإجمالي:</span><span className="font-bold">{formatEGP(subtotal)} ج</span></div>
          <div className="flex justify-between items-center text-sm">
            <span>الخصم:</span>
            <input type="number" min={0} step={0.01} className="w-24 input-field text-sm p-1" value={discount} onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} />
          </div>
          <div className="flex justify-between text-lg font-extrabold border-t pt-2">
            <span>الصافي:</span><span className="text-nazlawy-600">{formatEGP(total)} ج</span>
          </div>
          <textarea className="input-field text-xs" rows={2} placeholder="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button onClick={save} disabled={saving || cart.length === 0} className="btn-primary w-full">
            {saving ? '⏳ جاري الحفظ...' : ((status === 'مكتملة' && invoiceType !== 'عرض سعر') ? `✅ حفظ وطباعة (${formatEGP(total)} ج)` : `💾 حفظ كمسودة (${formatEGP(total)} ج)`)}
          </button>
        </div>
      </div>

      {showNewProduct && (
        <NewProductModal
          initialName={search}
          onClose={() => setShowNewProduct(false)}
          onAdded={(p) => { addToCart(p); setShowNewProduct(false); }}
        />
      )}
      
      {smartSplitItem && stores && (
        <SmartSplitModal
          item={smartSplitItem}
          stores={stores.items}
          onClose={() => setSmartSplitItem(null)}
          onConfirm={handleSmartSplitConfirm}
        />
      )}
    </div>
  );
}

function NewProductModal({ initialName, onClose, onAdded }: { initialName: string; onClose: () => void; onAdded: (p: Product) => void }) {
  const [f, setF] = useState({
    name: initialName,
    default_sale_price: 0,
    last_purchase_price: 0,
    category: "",
    unit: "piece",
  });
  const { mutate, loading } = useApiMutation();

  async function save() {
    if (!f.name.trim()) { alert('❌ اسم الصنف مطلوب'); return; }
    if (f.default_sale_price < 0 || f.last_purchase_price < 0) { alert('❌ الأسعار يجب أن تكون موجبة'); return; }
    const { error, data } = await mutate<Product>('POST', '/api/products', f);
    if (error) { alert('❌ ' + error); return; }
    onAdded(data!);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3">
        <h2 className="text-lg font-bold">+ إضافة صنف جديد</h2>
        <div>
          <label className="text-sm font-medium block mb-1">الاسم *</label>
          <input className="input-field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">سعر البيع *</label>
            <input type="number" step="0.01" min={0} className="input-field" value={f.default_sale_price} onChange={(e) => setF({ ...f, default_sale_price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">سعر الشراء *</label>
            <input type="number" step="0.01" min={0} className="input-field" value={f.last_purchase_price} onChange={(e) => setF({ ...f, last_purchase_price: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">الفئة</label>
          <input className="input-field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="مثال: إضاءة، كشافات، أسلاك..." />
        </div>
        <p className="text-xs text-gray-500">💡 بعد الإضافة ستتم إضافته تلقائياً للفاتورة. يمكن تعديل التفاصيل لاحقاً من صفحة الأصناف.</p>
        <div className="flex gap-2 pt-2">
          <button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'جاري الحفظ...' : 'حفظ وإضافة للفاتورة'}</button>
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function SmartSplitModal({ item, stores, onClose, onConfirm }: {
  item: { product: Product, requestedQty: number, currentStoreId: string },
  stores: Store[],
  onClose: () => void,
  onConfirm: (splits: { store_id: string, store_name: string, quantity: number }[]) => void
}) {
  const { product, requestedQty } = item;
  
  // تجميع المخزون لكل مخزن
  const storeStocks = stores.map(store => {
    const invItem = product.inventory_items?.find(i => i.store_id === store.id);
    return {
      store_id: store.id,
      store_name: store.name,
      available: invItem ? Number(invItem.current_stock) : 0,
      quantity: 0
    };
  }).filter(s => s.available > 0);
  
  // توزيع تلقائي للكمية المطلوبة
  const [splits, setSplits] = useState(() => {
    let remaining = requestedQty;
    const initialSplits = storeStocks.map(s => ({ ...s, quantity: 0 }));
    
    // الأولوية للمخزن الحالي المختار
    const currentStore = initialSplits.find(s => s.store_id === item.currentStoreId);
    if (currentStore && currentStore.available > 0) {
      const take = Math.min(remaining, currentStore.available);
      currentStore.quantity = take;
      remaining -= take;
    }
    
    // توزيع الباقي على المخازن الأخرى
    for (const s of initialSplits) {
      if (remaining <= 0) break;
      if (s.store_id === item.currentStoreId) continue; // تم خصمه بالفعل
      const take = Math.min(remaining, s.available);
      s.quantity = take;
      remaining -= take;
    }
    
    return initialSplits;
  });

  const totalAssigned = splits.reduce((sum, s) => sum + s.quantity, 0);

  function handleQuantityChange(store_id: string, qty: number) {
    setSplits(splits.map(s => {
      if (s.store_id !== store_id) return s;
      return { ...s, quantity: Math.max(0, Math.min(qty, s.available)) };
    }));
  }

  function confirm() {
    if (totalAssigned <= 0) {
      alert('يجب توزيع كمية واحدة على الأقل');
      return;
    }
    onConfirm(splits);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">💡</div>
          <h2 className="text-lg font-bold">توزيع ذكي للمخزون</h2>
          <p className="text-sm text-gray-500 mt-1">
            الصنف "{product.name}" غير كافٍ في المخزن المختار.<br/>تم اقتراح سحبه من مخازن متعددة.
          </p>
        </div>
        
        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex justify-between font-bold border border-blue-100">
          <span>الكمية المطلوبة: {requestedQty}</span>
          <span>إجمالي المتاح: {product.total_stock}</span>
        </div>

        <div className="space-y-2">
          {splits.map(s => (
            <div key={s.store_id} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
              <div>
                <div className="font-semibold text-sm">{s.store_name}</div>
                <div className="text-xs text-gray-500">متاح: {formatQty(s.available)}</div>
              </div>
              <input
                type="number"
                min={0}
                max={s.available}
                value={s.quantity || ''}
                onChange={(e) => handleQuantityChange(s.store_id, parseFloat(e.target.value) || 0)}
                className="input-field w-20 text-center font-mono"
              />
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center text-sm font-bold pt-2 border-t">
          <span>الإجمالي الموزع:</span>
          <span className={totalAssigned === requestedQty ? 'text-green-600' : 'text-orange-600'}>
            {totalAssigned} / {requestedQty}
          </span>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={confirm} className="btn-primary flex-1">اعتماد التوزيع</button>
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
