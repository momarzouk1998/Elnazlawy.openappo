"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { useApi } from "@/hooks/useApi";
import { useApiMutation } from "@/hooks/useApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ENTRY_TYPE_LABELS, PAYMENT_METHOD_LABELS, formatCurrency } from "@/lib/format";

export default function NewJournalForm() {
  const router = useRouter();
  const { user: profile } = useUserStore();
  const { data: suppliersData } = useApi<{ items: any[] }>('/api/suppliers?limit=500');
  const { data: branchesData } = useApi<{ items: any[] }>('/api/branches?limit=500');
  const { data: contractorsData } = useApi<{ items: any[] }>('/api/contractors?limit=500');
  const { data: ordersData } = useApi<{ items: any[] }>('/api/orders?limit=100');
  const suppliers = suppliersData?.items ?? [];
  const branches = branchesData?.items ?? [];
  const contractors = contractorsData?.items ?? [];
  const orders = ordersData?.items ?? [];

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    entry_type: "دفعة واردة من معرض",
    description: "",
    amount: "",
    payment_method: "نقدي",
    supplier_id: "", branch_id: "", contractor_id: "", order_id: "",
    is_passthrough: false,
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const { mutate, loading: saving } = useApiMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) { setError("البيان والمبلغ مطلوبين"); return; }
    setError(null);
    const payload: any = {
      date: form.date, entry_type: form.entry_type, description: form.description,
      amount: Number(form.amount), payment_method: form.payment_method,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      branch_id: form.branch_id ? Number(form.branch_id) : null,
      contractor_id: form.contractor_id ? Number(form.contractor_id) : null,
      order_id: form.order_id ? Number(form.order_id) : null,
      is_passthrough: form.is_passthrough,
      notes: form.notes || null,
    };
    const { error: err } = await mutate('POST', '/api/journal', payload);
    if (err) { setError(err); return; }
    router.push("/journal");
    router.refresh();
  }

  if (!profile) return null;
  const isPass = form.entry_type === "تحويل تمريري";

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title="حركة يومية جديدة" backHref="/journal" />
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="التاريخ" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          <Select label="نوع الحركة" value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value })}
            options={Object.entries(ENTRY_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
        </div>
        <Input label="البيان *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="المبلغ *" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
          <Select label="طريقة الدفع" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
            options={Object.entries(PAYMENT_METHOD_LABELS).filter(([k]) => k !== "both").map(([k, v]) => ({ value: k, label: v }))} />
        </div>

        {form.entry_type === "دفعة واردة من معرض" && (
          <Select label="المعرض" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}
            options={[{ value: "", label: "— اختر —" }, ...branches.map((b: any) => ({ value: String(b.id), label: b.name }))]} />
        )}
        {(form.entry_type === "مشتريات" || form.entry_type === "دفعة صادرة لمورد") && (
          <Select label="المورد" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
            options={[{ value: "", label: "— اختر —" }, ...suppliers.map((s: any) => ({ value: String(s.id), label: s.name }))]} />
        )}
        {form.entry_type === "تحويل تمريري" && (
          <>
            <Select label="من (المعرض)" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}
              options={[{ value: "", label: "— اختر —" }, ...branches.map((b: any) => ({ value: String(b.id), label: b.name }))]} />
            <Select label="إلى (المورد)" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
              options={[{ value: "", label: "— اختر —" }, ...suppliers.map((s: any) => ({ value: String(s.id), label: s.name }))]} />
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={form.is_passthrough} onChange={e => setForm({ ...form, is_passthrough: e.target.checked })} className="mt-1 accent-brand-orange" />
              <div className="text-sm">
                <div className="font-medium">تمريري — لا يؤثر على صافي الرصيد</div>
                <div className="text-gray-500 text-xs mt-0.5">فعّل ده لو المعرض حوّل مباشرة للمورد (دخلت وخرجت في نفس الوقت).</div>
              </div>
            </label>
          </>
        )}
        {form.entry_type === "نثريات" && <div className="bg-purple-50 text-purple-700 text-sm p-3 rounded-lg">💡 الأفضل تسجيل النثريات من صفحة "النثريات" — هتتربط هنا تلقائياً.</div>}

        <Select label="الأوردر المرتبط (اختياري)" value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })}
          options={[{ value: "", label: "— بدون —" }, ...orders.map((o: any) => ({ value: String(o.id), label: o.order_name }))]} />

        <Textarea label="ملاحظات" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

        <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
          <span className="text-gray-600">المبلغ:</span>
          <span className="text-2xl font-extrabold text-brand-orange">{formatCurrency(Number(form.amount) || 0)}</span>
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()}>إلغاء</Button>
          <Button type="submit" loading={saving}>حفظ</Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
