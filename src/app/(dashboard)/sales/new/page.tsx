"use client";
import { useState, useEffect } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatQty } from "@/lib/format";
import { useRouter } from "next/navigation";

interface Product { id: string; name: string; unit: string; default_sale_price: number; total_stock: number; }
interface Customer { id: string; name: string; balance: number; }
interface Store { id: string; name: string; type: string; }
interface CartItem { product_id: string; product_name: string; store_id: string; store_name: string; quantity: number; unit_price: number; available: number; }

export default function POSPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [invoiceType, setInvoiceType] = useState("عادية");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const { mutate, loading: saving } = useApiMutation();
  const { data: productsData } = useApi<{ items: Product[] }>(`/api/products?search=${encodeURIComponent(search)}&limit=30`);
  const { data: customers } = useApi<{ items: Customer[] }>('/api/customers?limit=200');
  const { data: stores } = useApi<Store[]>('/api/stores');

  useEffect(() => {
    if (stores && stores.length > 0 && !storeId) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - discount);

  function addToCart(p: Product) {
    if (!storeId) { alert('اختر مخزن أولاً'); return; }
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
        unit_price: Number(p.default_sale_price),
        available: Number(p.total_stock),
      }]);
    }
  }

  function updateItem(idx: number, field: keyof CartItem, value: any) {
    setCart(cart.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }

  function removeItem(idx: number) {
    setCart(cart.filter((_, i) => i !== idx));
  }

  async function save() {
    if (cart.length === 0) { alert('السلة فارغة'); return; }
    if (invoiceType !== 'عرض سعر' && !customerId) {
      if (!confirm('لم تختر عميل. هل تريد المتابعة؟')) return;
    }
    const { error, data } = await mutate<{ id: string; invoice_number: number }>('POST', '/api/sales/invoices', {
      customer_id: customerId || null,
      store_id: storeId,
      invoice_type: invoiceType,
      items: cart.map(c => ({ product_id: c.product_id, store_id: c.store_id, quantity: c.quantity, unit_price: c.unit_price, row_type: 'بيع' })),
      subtotal,
      discount,
      total,
      notes,
    });
    if (error) { alert('❌ ' + error); return; }
    alert(`✅ تم حفظ الفاتورة رقم ${data?.invoice_number}`);
    setCart([]);
    setDiscount(0);
    setNotes("");
    router.push(`/print/invoice/${data?.id}`);
  }

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
          {productsData?.items.length === 0 && <div className="card text-center text-gray-400 py-12">لا توجد نتائج</div>}
        </div>
      </div>

      {/* Cart panel */}
      <div className="space-y-3">
        <div className="card space-y-2">
          <h2 className="font-bold text-lg">🛍️ السلة ({cart.length})</h2>
          <div>
            <label className="text-xs text-gray-600">العميل</label>
            <select className="input-field text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— بدون عميل —</option>
              {customers?.items.map(c => <option key={c.id} value={c.id}>{c.name} (مديون: {formatEGP(c.balance)})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">المخزن</label>
              <select className="input-field text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                {stores?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">النوع</label>
              <select className="input-field text-sm" value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                <option value="عادية">عادية</option>
                <option value="ضريبية">ضريبية</option>
                <option value="عرض سعر">عرض سعر</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card max-h-[300px] overflow-y-auto p-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">السلة فارغة</div>
          ) : (
            <div className="space-y-2">
              {cart.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2 text-sm">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold flex-1 line-clamp-2">{c.product_name}</div>
                    <button onClick={() => removeItem(i)} className="text-red-500 text-xs">✕</button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <input type="number" min={0.01} step={0.01} className="input-field text-xs p-1" value={c.quantity} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                    <input type="number" min={0} step={0.01} className="input-field text-xs p-1" value={c.unit_price} onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                    <div className="text-xs font-bold text-nazlawy-600 text-center pt-2">{formatEGP(c.quantity * c.unit_price)}</div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{c.store_name} • متاح: {formatQty(c.available)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-2">
          <div className="flex justify-between text-sm"><span>الإجمالي:</span><span className="font-bold">{formatEGP(subtotal)} ج</span></div>
          <div className="flex justify-between items-center text-sm">
            <span>الخصم:</span>
            <input type="number" min={0} step={0.01} className="w-24 input-field text-sm p-1" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="flex justify-between text-lg font-extrabold border-t pt-2">
            <span>الصافي:</span><span className="text-nazlawy-600">{formatEGP(total)} ج</span>
          </div>
          <textarea className="input-field text-xs" rows={2} placeholder="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button onClick={save} disabled={saving || cart.length === 0} className="btn-primary w-full">
            {saving ? '⏳ جاري الحفظ...' : `✅ حفظ وطباعة (${formatEGP(total)} ج)`}
          </button>
        </div>
      </div>
    </div>
  );
}
