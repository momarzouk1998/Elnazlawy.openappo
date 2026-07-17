"use client";
import { useState, useEffect } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatDate, statusColor } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchableSelect, { type SearchOption } from "@/components/SearchableSelect";
import { getCurrentUserClient } from "@/hooks/useCurrentUser";

interface Invoice {
  id: string;
  invoice_number: number;
  invoice_date: string;
  invoice_type: string;
  status: string;
  total: number;
  customer: { name: string } | null;
  store: { name: string } | null;
  creator?: { full_name: string } | null;
  _count: { items: number };
  subtotal?: number;
  discount?: number;
  paid_amount?: number;
}

export default function SalesListPage() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [openInvoice, setOpenInvoice] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  useEffect(() => {
    getCurrentUserClient().then(p => { if (p && p.role === 'admin') setIsAdmin(true); });
  }, []);
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (status) params.set('status', status);
  if (customerId) params.set('customer_id', customerId);
  const { data, loading } = useApi<{ items: Invoice[]; total: number }>(`/api/sales/invoices?${params.toString()}&limit=100`);
  const { data: customers } = useApi<{ items: { id: string; name: string; phone: string | null; balance: number }[]; total: number }>('/api/customers?limit=200');

  const customerOptions: SearchOption[] = (customers?.items || []).map(c => ({
    id: c.id,
    name: c.name,
    sub: c.phone || undefined,
    extra: `مديون: ${formatEGP(c.balance)} ج`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">🛒 فواتير المبيعات</h1>
        <Link href="/sales/new" className="btn-primary">+ فاتورة جديدة</Link>
      </div>

      <div className="card flex flex-col gap-3 md:flex-row md:flex-wrap">
        <div className="md:flex-1 md:min-w-[200px]">
          <SearchableSelect
            options={customerOptions}
            value={customerId}
            onChange={setCustomerId}
            placeholder="🔍 فلترة حسب العميل..."
            emptyLabel="كل العملاء"
          />
        </div>
        <select className="input-field text-sm md:w-40" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">كل الأنواع</option>
          <option value="عادية">عادية</option>
          <option value="ضريبية">ضريبية</option>
          <option value="عرض سعر">عرض سعر</option>
        </select>
        <select className="input-field text-sm md:w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="مكتملة">مكتملة</option>
          <option value="قيد التنفيذ">قيد التنفيذ</option>
          <option value="ملغاة">ملغاة</option>
        </select>
        <div className="text-sm text-gray-500 md:mr-auto self-center">{data?.total ?? 0} فاتورة</div>
      </div>

      {loading ? (
        <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div>
      ) : (
        <>
          {/* ===== Mobile: كاردات (تجنب جدول عريض) ===== */}
          <div className="space-y-2 md:hidden">
            {data?.items.map(inv => (
              <div key={inv.id} className="card p-3">
                <div
                  onClick={() => setOpenInvoice(inv.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="font-mono font-bold text-nazlawy-600 text-lg">#{inv.invoice_number}</div>
                    <span className={`badge ${statusColor(inv.status)}`}>{inv.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>{formatDate(inv.invoice_date)}</span>
                    <span>{inv.invoice_type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm truncate flex-1">{inv.customer?.name || '—'}</div>
                    <div className="font-bold text-nazlawy-600 text-base shrink-0 ml-2">{formatEGP(inv.total)} ج</div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                    <span>📦 {inv._count.items} صنف{inv._count.items !== 1 ? 'ات' : ''}</span>
                    {inv.store?.name && <span>🏢 {inv.store.name}</span>}
                  </div>
                </div>
                <div className="flex gap-2 mt-2 pt-2 border-t">
                  <button onClick={(e) => { e.stopPropagation(); window.open(`/print/invoice/${inv.id}`, '_blank'); }} className="flex-1 text-xs px-2 py-1.5 rounded bg-nazlawy-50 text-nazlawy-700 hover:bg-nazlawy-100 border border-nazlawy-200">
                    🖨️ طباعة
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); window.open(`/print/invoice/${inv.id}?format=pdf`, '_blank'); }} className="flex-1 text-xs px-2 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                    📄 PDF
                  </button>
                </div>
              </div>
            ))}
            {data?.items.length === 0 && (
              <div className="card text-center py-12 text-gray-400">لا توجد فواتير</div>
            )}
          </div>

          {/* ===== Desktop: جدول ===== */}
          <div className="card overflow-x-auto p-0 hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">رقم</th>
                  <th className="p-3 text-right">التاريخ</th>
                  <th className="p-3 text-right">النوع</th>
                  <th className="p-3 text-right">العميل</th>
                  <th className="p-3 text-right">المخزن</th>
                  <th className="p-3 text-right">الأصناف</th>
                  <th className="p-3 text-right">الإجمالي</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => setOpenInvoice(inv.id)}
                    className="border-t hover:bg-nazlawy-50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono font-bold">#{inv.invoice_number}</td>
                    <td className="p-3 text-xs">{formatDate(inv.invoice_date)}</td>
                    <td className="p-3 text-xs">{inv.invoice_type}</td>
                    <td className="p-3">{inv.customer?.name || '—'}</td>
                    <td className="p-3 text-xs">{inv.store?.name || '—'}</td>
                    <td className="p-3 text-center">{inv._count.items}</td>
                    <td className="p-3 font-bold text-nazlawy-600">{formatEGP(inv.total)}</td>
                    <td className="p-3"><span className={`badge ${statusColor(inv.status)}`}>{inv.status}</span></td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => window.open(`/print/invoice/${inv.id}`, '_blank')} className="text-xs px-2 py-1 rounded bg-nazlawy-50 text-nazlawy-700 hover:bg-nazlawy-100 border border-nazlawy-200">
                          🖨️
                        </button>
                        <button onClick={() => window.open(`/print/invoice/${inv.id}?format=pdf`, '_blank')} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                          📄
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr><td colSpan={9} className="p-12 text-center text-gray-400">لا توجد فواتير</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {openInvoice && (
        <InvoiceDetailsModal
          invoiceId={openInvoice}
          isAdmin={isAdmin}
          onClose={() => setOpenInvoice(null)}
        />
      )}
    </div>
  );
}

/* ============================================
   Modal تفاصيل/تعديل الفاتورة
============================================ */
function InvoiceDetailsModal({ invoiceId, isAdmin, onClose }: { invoiceId: string; isAdmin: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data: inv, loading, refetch } = useApi<any>(`/api/sales/invoices/${invoiceId}`);
  const { data: storesData } = useApi<{ items: { id: string; name: string }[] }>('/api/stores');
  const { data: productsData } = useApi<{ items: { id: string; name: string; default_sale_price: number; total_stock: number; inventory_items?: { current_stock: number; store_id: string }[] }[] }>(`/api/products?limit=200`);
  const { mutate, loading: saving } = useApiMutation();
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState("");
  const [invoiceType, setInvoiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // عند تحميل الفاتورة، عبّي الحقول
  if (inv && items.length === 0 && !editing) {
    setItems(inv.items || []);
    setDiscount(Number(inv.discount || 0));
    setStatus(inv.status);
    setInvoiceType(inv.invoice_type);
    setNotes(inv.notes || "");
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

  const isCompleted = inv.status === 'مكتملة';
  const isCancelled = inv.status === 'ملغاة';
  const isQuotation = inv.invoice_type === 'عرض سعر';

  // حساب الإجماليات
  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const total = Math.max(0, subtotal - discount);

  function addItem(p: any) {
    const store = storesData?.items.find(s => s.id === inv.store_id) || storesData?.items[0];
    setItems([...items, {
      product_id: p.id,
      product_name: p.name,
      quantity: 1,
      unit_price: Number(p.default_sale_price),
      store_id: inv.store_id || store?.id,
    }]);
    setShowProductPicker(false);
    setProductSearch("");
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: any) {
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, [field]: value };
      if (field === 'quantity') {
        const q = Number(value);
        next.quantity = Number.isFinite(q) && q > 0 ? q : 0;
      }
      if (field === 'unit_price') {
        const v = Number(value);
        next.unit_price = Number.isFinite(v) && v >= 0 ? v : 0;
      }
      return next;
    }));
  }

  async function saveChanges() {
    const validItems = items.filter(i => Number(i.quantity) > 0 && Number(i.unit_price) >= 0);
    if (validItems.length === 0) { alert('❌ لازم صنف واحد على الأقل'); return; }
    const { error } = await mutate('PATCH', `/api/sales/invoices/${invoiceId}`, {
      items: validItems.map(i => ({
        product_id: i.product_id,
        store_id: i.store_id || inv.store_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        row_type: i.row_type || 'بيع',
      })),
      discount,
      status: invoiceType === 'عرض سعر' ? 'قيد التنفيذ' : status,
      invoice_type: invoiceType,
      notes,
    });
    if (error) { alert('❌ ' + error); return; }
    alert('✅ تم حفظ التعديلات');
    setEditing(false);
    refetch();
    // تحديث صفحة القائمة
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('focus'));
  }

  async function cancelInvoice() {
    const confirmText = isAdmin
      ? '⚠️ كمدير عام: سيتم إلغاء الفاتورة وإرجاع المخزون وخصم المبلغ من رصيد العميل.\n\nهل أنت متأكد؟'
      : 'هل تريد إلغاء هذه الفاتورة؟ سيتم إرجاع المخزون وخصم المبلغ من رصيد العميل.';
    if (!confirm(confirmText)) return;
    const { error } = await mutate('DELETE', `/api/sales/invoices/${invoiceId}`);
    if (error) { alert('❌ ' + error); return; }
    alert('✅ تم إلغاء الفاتورة وإرجاع المخزون');
    onClose();
    if (typeof window !== 'undefined') window.location.reload();
  }

  async function deleteInvoice() {
    const confirmText = '⚠️⚠️ تحذير: حذف نهائي\n\nسيتم حذف الفاتورة بالكامل من قاعدة البيانات.\nهذا الإجراء لا يمكن التراجع عنه!\n\nهل أنت متأكد 100%؟';
    if (!confirm(confirmText)) return;
    const doubleConfirm = confirm('❗ تأكيد أخير: هل تريد فعلاً حذف الفاتورة نهائياً؟');
    if (!doubleConfirm) return;
    const { error } = await mutate('DELETE', `/api/sales/invoices/${invoiceId}?permanent=true`);
    if (error) { alert('❌ ' + error); return; }
    alert('✅ تم حذف الفاتورة نهائياً');
    onClose();
    if (typeof window !== 'undefined') window.location.reload();
  }

  async function printInvoice() {
    window.open(`/print/invoice/${invoiceId}`, '_blank');
  }

  const filteredProducts = (productsData?.items || []).filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 30);

  // Debug: log products data
  if (typeof window !== 'undefined' && showProductPicker) {
    console.log('Products data:', productsData);
    console.log('Filtered products:', filteredProducts);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between gap-2 z-10">
          <div>
            <h2 className="text-lg md:text-xl font-bold">
              🛒 فاتورة مبيعات #{inv.invoice_number}
              <span className={`badge ${statusColor(inv.status)} mr-2`}>{inv.status}</span>
            </h2>
            <p className="text-xs text-gray-500">{formatDate(inv.invoice_date)} • {inv.invoice_type}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-red-500">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Meta info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Info label="العميل" value={inv.customer?.name || '—'} />
            <Info label="المخزن" value={inv.store?.name || '—'} />
            <Info label="المنشئ" value={inv.creator?.full_name || '—'} />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">الأصناف ({items.length})</h3>
              {editing && !isCompleted && !isCancelled && (
                <button onClick={() => setShowProductPicker(true)} className="text-xs btn-primary py-1 px-3">+ صنف</button>
              )}
            </div>
            {editing && !isCompleted && !isCancelled ? (
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-sm flex items-center gap-2 flex-wrap">
                    <div className="font-semibold flex-1 min-w-[150px]">{it.product_name}</div>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={it.quantity}
                      onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                      className="input-field text-xs p-1 w-20"
                      placeholder="الكمية"
                    />
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={it.unit_price}
                      onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="input-field text-xs p-1 w-24"
                      placeholder="السعر"
                    />
                    <div className="text-xs font-bold w-24 text-left">{formatEGP(Number(it.quantity) * Number(it.unit_price))}</div>
                    <button onClick={() => removeItem(i)} className="text-red-500 text-xs">✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-right">الصنف</th>
                    <th className="p-2 text-center">الكمية</th>
                    <th className="p-2 text-left">السعر</th>
                    <th className="p-2 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((it: any) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-2">{it.product_name}</td>
                      <td className="p-2 text-center font-mono">{Number(it.quantity)}</td>
                      <td className="p-2 text-left font-mono">{formatEGP(Number(it.unit_price))}</td>
                      <td className="p-2 text-left font-mono font-bold">{formatEGP(Number(it.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Editable fields */}
          {editing && !isCompleted && !isCancelled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">النوع</label>
                <select className="input-field text-sm" value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                  <option value="عادية">عادية</option>
                  <option value="ضريبية">ضريبية</option>
                  <option value="عرض سعر">عرض سعر</option>
                </select>
              </div>
              {invoiceType !== 'عرض سعر' && (
                <div>
                  <label className="text-xs text-gray-600 block mb-1">الحالة</label>
                  <select className="input-field text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="قيد التنفيذ">قيد التنفيذ (مسودة)</option>
                    <option value="مكتملة">مكتملة (نهائية — تخصم المخزون)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-600 block mb-1">الخصم</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input-field text-sm"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div className="md:col-span-3">
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

          {/* Totals */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>الإجمالي قبل الخصم:</span><span className="font-mono font-bold">{formatEGP(Number(inv.subtotal))} ج</span></div>
            {Number(inv.discount) > 0 && <div className="flex justify-between text-yellow-700"><span>الخصم:</span><span className="font-mono font-bold">- {formatEGP(Number(inv.discount))} ج</span></div>}
            <div className="flex justify-between text-lg font-extrabold border-t pt-2 text-red-700">
              <span>الإجمالي النهائي:</span><span className="font-mono">{formatEGP(Number(inv.total))} ج</span>
            </div>
            {editing && (
              <div className="text-xs text-gray-500 pt-2 border-t">
                الإجمالي بعد التعديل: <strong className="font-mono">{formatEGP(total)}</strong> (خصم: {formatEGP(discount)})
              </div>
            )}
            {inv.notes && !editing && (
              <div className="text-xs text-gray-600 pt-2 border-t">📝 {inv.notes}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <button onClick={printInvoice} className="btn-secondary text-sm">🖨️ طباعة</button>
            {!isCancelled && !isCompleted && (
              <>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="btn-primary text-sm">✏️ تعديل</button>
                ) : (
                  <>
                    <button onClick={saveChanges} disabled={saving} className="btn-primary text-sm">{saving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}</button>
                    <button onClick={() => { setEditing(false); setItems(inv.items); setDiscount(Number(inv.discount)); setStatus(inv.status); setInvoiceType(inv.invoice_type); setNotes(inv.notes || ''); }} className="btn-secondary text-sm">إلغاء التعديل</button>
                  </>
                )}
                <button onClick={cancelInvoice} className="text-sm px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">❌ إلغاء الفاتورة</button>
              </>
            )}
            {isCompleted && !isQuotation && (
              <button onClick={cancelInvoice} className="text-sm px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">❌ إلغاء الفاتورة (سيتم إرجاع المخزون)</button>
            )}
            {isCancelled && <span className="text-sm text-red-700 font-bold self-center">🚫 هذه الفاتورة ملغاة</span>}
            {/* زر الحذف النهائي — للأدمن فقط */}
            {isAdmin && (
              <button onClick={deleteInvoice} className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black ml-auto">🗑️ حذف نهائي</button>
            )}
          </div>
        </div>

        {/* Product picker */}
        {showProductPicker && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowProductPicker(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="p-3 border-b">
                <input
                  autoFocus
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="🔍 ابحث عن صنف..."
                  className="input-field"
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {!productsData && <div className="p-8 text-center text-gray-400">⏳ جاري تحميل الأصناف...</div>}
                {productsData && filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addItem(p)} className="w-full text-right p-3 border-b hover:bg-gray-50 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-xs text-gray-500">{formatEGP(p.default_sale_price)} ج</div>
                    </div>
                    <span className="text-xs text-gray-400">+ إضافة</span>
                  </button>
                ))}
                {productsData && filteredProducts.length === 0 && <div className="p-8 text-center text-gray-400">لا توجد نتائج</div>}
              </div>
              <div className="p-3 border-t">
                <button onClick={() => setShowProductPicker(false)} className="btn-secondary w-full">إغلاق</button>
              </div>
            </div>
          </div>
        )}
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
