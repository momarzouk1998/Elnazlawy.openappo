"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ENTRY_TYPE_LABELS, PAYMENT_METHOD_LABELS, formatCurrency } from "@/lib/format";

export default function NewJournalForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [refs, setRefs] = useState<any>({ suppliers: [], branches: [], contractors: [], orders: [] });
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    entry_type: "income",
    description: "",
    amount: "",
    payment_method: "cash",
    supplier_id: "", branch_id: "", contractor_id: "", order_id: "",
    is_passthrough: false,
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);
      const [{ data: s }, { data: b }, { data: c }, { data: o }] = await Promise.all([
        supabase.from("mazaya_suppliers").select("id, name").order("name"),
        supabase.from("mazaya_branches").select("id, name").order("name"),
        supabase.from("mazaya_contractors").select("id, name").order("name"),
        supabase.from("mazaya_orders").select("id, order_name").order("id", { ascending: false }).limit(100),
      ]);
      setRefs({ suppliers: s ?? [], branches: b ?? [], contractors: c ?? [], orders: o ?? [] });
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) { setError("البيان والمبلغ مطلوبين"); return; }
    setSaving(true); setError(null);
    const supabase = createClient();
    const payload: any = {
      entry_date: form.entry_date, entry_type: form.entry_type, description: form.description,
      amount: Number(form.amount), payment_method: form.payment_method,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      branch_id: form.branch_id ? Number(form.branch_id) : null,
      contractor_id: form.contractor_id ? Number(form.contractor_id) : null,
      order_id: form.order_id ? Number(form.order_id) : null,
      is_passthrough: form.is_passthrough,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("mazaya_journal_entries").insert([payload]);
    setSaving(false);
    if (error) { setError(error.message); return; }
    // إذا تحويل تمريري بخيار "حركتين منفصلتين": أنشئ حركة ثانية معكوسة
    if (form.entry_type === "transfer" && form.is_passthrough === false) {
      // user chose "two separate entries" → نُدخل المعاملة كدخل + مصروف
      // (تركناها للمستخدم يدوياً لتجنب التعقيد)
    }
    router.push("/journal");
    router.refresh();
  }

  if (!profile) return null;
  const isPass = form.entry_type === "transfer";

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title="حركة يومية جديدة" backHref="/journal" />
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="التاريخ" type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} required />
          <Select label="نوع الحركة" value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value })}
            options={Object.entries(ENTRY_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
        </div>
        <Input label="البيان *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="المبلغ *" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
          <Select label="طريقة الدفع" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
            options={Object.entries(PAYMENT_METHOD_LABELS).filter(([k]) => k !== "both").map(([k, v]) => ({ value: k, label: v }))} />
        </div>

        {form.entry_type === "income" && (
          <Select label="المعرض" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}
            options={[{ value: "", label: "— اختر —" }, ...refs.branches.map((b: any) => ({ value: b.id, label: b.name }))]} />
        )}
        {(form.entry_type === "expense" || form.entry_type === "purchase") && (
          <Select label="المورد" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
            options={[{ value: "", label: "— اختر —" }, ...refs.suppliers.map((s: any) => ({ value: s.id, label: s.name }))]} />
        )}
        {form.entry_type === "transfer" && (
          <>
            <Select label="من (المعرض)" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}
              options={[{ value: "", label: "— اختر —" }, ...refs.branches.map((b: any) => ({ value: b.id, label: b.name }))]} />
            <Select label="إلى (المورد)" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
              options={[{ value: "", label: "— اختر —" }, ...refs.suppliers.map((s: any) => ({ value: s.id, label: s.name }))]} />
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={form.is_passthrough} onChange={e => setForm({ ...form, is_passthrough: e.target.checked })} className="mt-1 accent-brand-orange" />
              <div className="text-sm">
                <div className="font-medium">تمريري — لا يؤثر على صافي الرصيد</div>
                <div className="text-gray-500 text-xs mt-0.5">فعّل ده لو المعرض حوّل مباشرة للمورد (دخلت وخرجت في نفس الوقت).</div>
              </div>
            </label>
          </>
        )}
        {form.entry_type === "overhead" && <div className="bg-purple-50 text-purple-700 text-sm p-3 rounded-lg">💡 الأفضل تسجيل النثريات من صفحة "النثريات" — هتتربط هنا تلقائياً.</div>}

        <Select label="الأوردر المرتبط (اختياري)" value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })}
          options={[{ value: "", label: "— بدون —" }, ...refs.orders.map((o: any) => ({ value: o.id, label: o.order_name }))]} />

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
