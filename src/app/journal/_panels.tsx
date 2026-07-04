"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import Combobox from "@/components/ui/Combobox";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, ENTRY_TYPE_LABELS } from "@/lib/format";

const PAY_OPTS = Object.entries(PAYMENT_METHOD_LABELS)
  .filter(([k]) => k !== "both" && k !== "كلاهما")
  .map(([k, v]) => ({ value: k, label: v }));

const todayStr = () => new Date().toISOString().slice(0, 10);

/* ============================================================
 * 1) شراء ألواح (panel)
 * ============================================================ */
export function BoardPurchasePanel({ onSaved }: { onSaved?: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    item_id: "", item_name: "", quantity: "", unit_price: "", supplier_id: "",
    payment_method: "نقدي", date: todayStr(), notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/boards?limit=500").then(r => r.json()).then(d => setItems(d?.data?.items ?? d?.items ?? []));
    fetch("/api/suppliers?limit=500").then(r => r.json()).then(d => setSuppliers(d?.data?.items ?? d?.items ?? []));
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return items.filter(i => i.quantity_remaining > 0).slice(0, 12);
    const s = q.toLowerCase();
    return items.filter(i => (i.item_name?.toLowerCase().includes(s) || i.code?.toLowerCase().includes(s))).slice(0, 12);
  }, [items, q]);

  function pick(it: any) {
    setForm(f => ({
      ...f,
      item_id: it.id, item_name: it.item_name, unit_price: String(it.unit_price ?? ""),
      supplier_id: String(it.supplier_id ?? ""),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!form.item_id || !form.quantity) { setErr("اختر الصنف واكتب الكمية"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/boards/purchase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: form.item_id,
          quantity: Number(form.quantity),
          unit_price: Number(form.unit_price || 0),
          supplier_id: form.supplier_id || null,
          payment_method: form.payment_method,
          date: form.date,
          notes: form.notes || null,
          create_journal: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j?.error?.message || "خطأ"); return; }
      setMsg(`✅ تم شراء ${form.quantity} × ${form.item_name}`);
      setForm(f => ({ ...f, item_id: "", item_name: "", quantity: "", notes: "" }));
      onSaved?.();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Input label="ابحث عن صنف" value={q} onChange={e => setQ(e.target.value)} placeholder="اسم أو كود اللوح..." />
        <div className="mt-1 max-h-40 overflow-y-auto divide-y border rounded-lg">
          {filtered.map(it => (
            <button type="button" key={it.id} onClick={() => pick(it)}
              className={`w-full text-right px-3 py-2 hover:bg-brand-orange/10 text-sm ${form.item_id === it.id ? "bg-brand-orange/10 font-semibold" : ""}`}>
              {it.item_name} <span className="text-xs text-gray-500">({it.code}) • متبقي: {it.quantity_remaining}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-gray-400 text-sm">لا توجد نتائج</div>}
        </div>
      </div>
      {form.item_name && <div className="bg-green-50 p-2 rounded text-sm">المختار: <strong>{form.item_name}</strong></div>}
      <div className="grid grid-cols-2 gap-3">
        <Input label="الكمية *" type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
        <Input label="سعر الوحدة" type="number" step="0.01" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="التاريخ" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <Select label="طريقة الدفع" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} options={PAY_OPTS} />
      </div>
      {err && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{err}</div>}
      {msg && <div className="bg-green-50 text-green-700 p-2 rounded text-sm">{msg}</div>}
      {form.quantity && form.unit_price && (
        <div className="bg-blue-50 p-2 rounded text-sm">الإجمالي: <strong>{formatCurrency(Number(form.quantity) * Number(form.unit_price))}</strong> — هيُسجل في اليومية تلقائياً</div>
      )}
      <Button type="submit" loading={saving} className="w-full">🛒 تسجيل الشراء</Button>
    </form>
  );
}

/* ============================================================
 * 2) شراء إكسسوارات
 * ============================================================ */
export function AccessoryPurchasePanel({ onSaved }: { onSaved?: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    item_id: "", item_name: "", quantity: "", unit_price: "", supplier_id: "",
    payment_method: "نقدي", date: todayStr(), notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/accessories?limit=500").then(r => r.json()).then(d => setItems(d?.data?.items ?? d?.items ?? []));
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return items.filter(i => i.quantity_remaining > 0).slice(0, 12);
    const s = q.toLowerCase();
    return items.filter(i => (i.item_name?.toLowerCase().includes(s) || i.code?.toLowerCase().includes(s))).slice(0, 12);
  }, [items, q]);

  function pick(it: any) {
    setForm(f => ({ ...f, item_id: it.id, item_name: it.item_name, unit_price: String(it.unit_price ?? ""), supplier_id: String(it.supplier_id ?? "") }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!form.item_id || !form.quantity) { setErr("اختر الصنف واكتب الكمية"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/accessories/purchase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: form.item_id, quantity: Number(form.quantity),
          unit_price: Number(form.unit_price || 0),
          supplier_id: form.supplier_id || null,
          payment_method: form.payment_method, date: form.date,
          notes: form.notes || null, create_journal: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j?.error?.message || "خطأ"); return; }
      setMsg(`✅ تم شراء ${form.quantity} × ${form.item_name}`);
      setForm(f => ({ ...f, item_id: "", item_name: "", quantity: "", notes: "" }));
      onSaved?.();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Input label="ابحث عن صنف" value={q} onChange={e => setQ(e.target.value)} placeholder="اسم أو كود الإكسسوار..." />
        <div className="mt-1 max-h-40 overflow-y-auto divide-y border rounded-lg">
          {filtered.map(it => (
            <button type="button" key={it.id} onClick={() => pick(it)}
              className={`w-full text-right px-3 py-2 hover:bg-brand-orange/10 text-sm ${form.item_id === it.id ? "bg-brand-orange/10 font-semibold" : ""}`}>
              {it.item_name} <span className="text-xs text-gray-500">({it.code}) • متبقي: {it.quantity_remaining}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-gray-400 text-sm">لا توجد نتائج</div>}
        </div>
      </div>
      {form.item_name && <div className="bg-green-50 p-2 rounded text-sm">المختار: <strong>{form.item_name}</strong></div>}
      <div className="grid grid-cols-2 gap-3">
        <Input label="الكمية *" type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
        <Input label="سعر الوحدة" type="number" step="0.01" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="التاريخ" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <Select label="طريقة الدفع" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} options={PAY_OPTS} />
      </div>
      {err && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{err}</div>}
      {msg && <div className="bg-green-50 text-green-700 p-2 rounded text-sm">{msg}</div>}
      {form.quantity && form.unit_price && (
        <div className="bg-blue-50 p-2 rounded text-sm">الإجمالي: <strong>{formatCurrency(Number(form.quantity) * Number(form.unit_price))}</strong> — هيسجل في اليومية</div>
      )}
      <Button type="submit" loading={saving} className="w-full">🛒 تسجيل الشراء</Button>
    </form>
  );
}

/* ============================================================
 * 3) نثريات / أجور عمال
 * ============================================================ */
const CATS = [
  { value: "", label: "— اختر التصنيف —" },
  { value: "أجور عمال", label: "أجور عمال" },
  { value: "نثريات عامة", label: "نثريات عامة" },
  { value: "كهرباء", label: "كهرباء" },
  { value: "شحن", label: "شحن / نقل" },
  { value: "صيانة", label: "صيانة" },
  { value: "أخرى", label: "أخرى" },
];

export function OverheadPanel({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = useState({
    date: todayStr(), category: "", description: "", amount: "",
    payment_method: "نقدي", notes: "",
  });
  const [workerId, setWorkerId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isWages = form.category === "أجور عمال";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (isWages) {
      if (!workerId || !form.amount) { setErr("لأجور العمال: العامل والمبلغ مطلوبان"); return; }
    } else if (!form.description || !form.amount) { setErr("البيان والمبلغ مطلوبان"); return; }
    setSaving(true);
    try {
      const description = isWages ? (form.description || `أجر عامل: ${workerName}`) : form.description;
      const res = await fetch("/api/overhead?create_journal=true", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date, category: form.category || null, description,
          amount: Number(form.amount), payment_method: form.payment_method,
          notes: form.notes || null, worker_id: isWages ? workerId : null,
        }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j?.error?.message || "خطأ"); return; }
      setMsg(`✅ تم تسجيل ${formatCurrency(Number(form.amount))}${isWages && workerName ? ` للعامل ${workerName}` : ""}`);
      setForm(f => ({ ...f, description: "", amount: "", notes: "" }));
      setWorkerId(""); setWorkerName("");
      onSaved?.();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input label="التاريخ" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
      <Select label="التصنيف" value={form.category} onChange={e => setForm({ ...form, category: e.target.value, description: "" })} options={CATS} />
      {isWages && (
        <Combobox
          label="اسم العامل *"
          endpoint="/api/workers?limit=500"
          value={workerId}
          onChange={(id, name) => { setWorkerId(id); setWorkerName(name || "") }}
          placeholder="ابحث أو أضف عامل..."
          hint="اكتب الاسم — موجود هيظهر، جديد اكتبه كامل واضغط 'إضافة'."
        />
      )}
      {!isWages && (
        <Input label="البيان *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="مثال: كهرباء، شحن" required />
      )}
      {isWages && (
        <Input label="بيان إضافي (اختياري)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="مثال: أسبوع 3" />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="المبلغ *" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        <Select label="طريقة الدفع" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} options={PAY_OPTS} />
      </div>
      {err && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{err}</div>}
      {msg && <div className="bg-green-50 text-green-700 p-2 rounded text-sm">{msg}</div>}
      <Button type="submit" loading={saving} className="w-full">💾 تسجيل المصروف</Button>
    </form>
  );
}

/* ============================================================
 * 4) دفعة واردة من معرض (income)
 * ============================================================ */
export function IncomePanel({ onSaved }: { onSaved?: () => void }) {
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({
    date: todayStr(), amount: "", payment_method: "تحويل",
    description: "دفعة واردة من معرض", notes: "", branch_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/branches?limit=500").then(r => r.json()).then(d => setBranches(d?.data?.items ?? d?.items ?? []));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!form.amount) { setErr("المبلغ مطلوب"); return; }
    setSaving(true);
    try {
      const body: any = {
        date: form.date,
        entry_type: "دفعة واردة من معرض",
        description: form.branch_id
          ? `دفعة واردة من ${branches.find(b => String(b.id) === form.branch_id)?.name || "معرض"}`
          : form.description,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        notes: form.notes || null,
      };
      if (form.branch_id) {
        body.party_type = "branch";
        body.party_id = form.branch_id;
      }
      const res = await fetch("/api/journal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j?.error?.message || "خطأ"); return; }
      setMsg(`✅ تم تسجيل وارد ${formatCurrency(Number(form.amount))}`);
      setForm(f => ({ ...f, amount: "", notes: "" }));
      onSaved?.();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input label="التاريخ" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
      <Select label="المعرض (اختياري)" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}
        options={[{ value: "", label: "— عام —" }, ...branches.map(b => ({ value: String(b.id), label: b.name }))]} />
      <Input label="المبلغ *" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
      <Select label="طريقة الدفع" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} options={PAY_OPTS} />
      <Input label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      {err && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{err}</div>}
      {msg && <div className="bg-green-50 text-green-700 p-2 rounded text-sm">{msg}</div>}
      <Button type="submit" loading={saving} className="w-full">📥 تسجيل الوارد</Button>
    </form>
  );
}

/* ============================================================
 * 5) بحث موحّد في المخزن (ألواح + إكسسوارات)
 * ============================================================ */
export function InventorySearchPanel() {
  const [boards, setBoards] = useState<any[]>([]);
  const [accessories, setAccessories] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/boards?limit=500").then(r => r.json()),
      fetch("/api/accessories?limit=500").then(r => r.json()),
    ]).then(([b, a]) => {
      setBoards(b?.data?.items ?? b?.items ?? []);
      setAccessories(a?.data?.items ?? a?.items ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const all = [
      ...boards.map(x => ({ ...x, _type: "لوح" })),
      ...accessories.map(x => ({ ...x, _type: "إكسسوار" })),
    ];
    if (!q.trim()) return all.filter(x => x.quantity_remaining > 0).slice(0, 30);
    const s = q.toLowerCase();
    return all.filter(x =>
      x.item_name?.toLowerCase().includes(s) || x.code?.toLowerCase().includes(s)
    ).slice(0, 50);
  }, [boards, accessories, q]);

  return (
    <div className="space-y-3">
      <Input label="ابحث في المخزن" value={q} onChange={e => setQ(e.target.value)} placeholder="اسم الصنف أو الكود (مثال: مفصلة، K-100)..." />
      {loading ? (
        <div className="text-gray-400 text-sm py-4 text-center">جاري التحميل...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-right">النوع</th>
                <th className="px-2 py-2 text-right">البيان</th>
                <th className="px-2 py-2 text-right">الكود</th>
                <th className="px-2 py-2 text-right">المتبقي</th>
                <th className="px-2 py-2 text-right">السعر</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map(x => (
                <tr key={x._type + x.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2"><span className={`badge ${x._type === "لوح" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{x._type}</span></td>
                  <td className="px-2 py-2 font-medium">{x.item_name}</td>
                  <td className="px-2 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{x.code}</code></td>
                  <td className={`px-2 py-2 font-bold ${x.quantity_remaining > 0 ? "text-green-600" : "text-red-500"}`}>{x.quantity_remaining}</td>
                  <td className="px-2 py-2">{formatCurrency(Number(x.unit_price ?? 0))}</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-6 text-center text-gray-400">لا توجد نتائج للبحث "{q}"</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="text-xs text-gray-500">النتائج: <strong>{results.length}</strong> — ابحث بالاسم أو الكود لمعرفة إذا كان الصنف موجوداً في المخزن.</div>
    </div>
  );
}

/* ============================================================
 * 6) تقرير العمال السريع (داخل اليومية)
 * ============================================================ */
export function WorkersReportPanel() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/workers?limit=500").then(r => r.json()),
      fetch("/api/overhead?limit=2000").then(r => r.json()),
    ]).then(([w, o]) => {
      setWorkers(w?.data?.items ?? w?.items ?? []);
      setExpenses(o?.data?.expenses ?? o?.data?.items ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const m: Record<string, { total: number; count: number; last: string }> = {};
    for (const e of expenses) {
      if (!e.worker_id) continue;
      const id = String(e.worker_id);
      if (!m[id]) m[id] = { total: 0, count: 0, last: "" };
      m[id].total += Number(e.amount || 0);
      m[id].count += 1;
      const d = String(e.date).slice(0, 10);
      if (d > m[id].last) m[id].last = d;
    }
    return m;
  }, [expenses]);

  const rows = workers.map(w => ({ ...w, ...(stats[w.id] || { total: 0, count: 0, last: "" }) }));
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  if (loading) return <div className="text-gray-400 text-sm py-4 text-center">جاري التحميل...</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="text-xs text-gray-600">عدد العمال</div>
          <div className="text-xl font-bold">{workers.length}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-xs text-gray-600">إجمالي الأجور</div>
          <div className="text-xl font-bold">{formatCurrency(grandTotal)}</div>
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-2 py-2 text-right">العامل</th>
              <th className="px-2 py-2 text-right">عدد المصروفات</th>
              <th className="px-2 py-2 text-right">الإجمالي</th>
              <th className="px-2 py-2 text-right">آخر صرف</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-2 py-2 font-medium">{r.name}</td>
                <td className="px-2 py-2">{r.count || 0}</td>
                <td className="px-2 py-2 font-bold text-purple-700">{formatCurrency(r.total)}</td>
                <td className="px-2 py-2 text-xs">{r.last || "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-2 py-6 text-center text-gray-400">لا يوجد عمال بعد. أضف عمال من تبويب "أجور عمال".</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
