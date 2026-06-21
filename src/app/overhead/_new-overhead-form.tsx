"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format";

export default function NewOverheadForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ expense_date: new Date().toISOString().slice(0, 10), description: "", amount: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) { setError("البيان والمبلغ مطلوبين"); return; }
    setSaving(true); setError(null);
    const supabase = createClient();
    // 1) insert overhead
    const { data: oh, error: e1 } = await supabase.from("mazaya_overhead_expenses").insert([{
      expense_date: form.expense_date, description: form.description,
      amount: Number(form.amount), notes: form.notes || null,
    }]).select("id").single();
    if (e1 || !oh) { setError(e1?.message); setSaving(false); return; }
    // 2) auto journal entry
    await supabase.from("mazaya_journal_entries").insert([{
      entry_date: form.expense_date, entry_type: "overhead",
      description: `نثريات: ${form.description}`, amount: Number(form.amount),
      payment_method: "cash", notes: form.notes,
    }]);
    router.push("/overhead");
    router.refresh();
  }

  if (!profile) return null;
  return (
    <DashboardLayout profile={profile}>
      <PageHeader title="نثريات جديدة" subtitle="كهرباء، أجور عمال، شحن، إلخ" backHref="/overhead" />
      <form onSubmit={onSubmit} className="card max-w-xl space-y-4">
        <Input label="التاريخ" type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} required />
        <Input label="البيان *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="مثال: كهرباء المصنع، أجور عمال أسبوع 3" required />
        <Input label="المبلغ *" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        <Textarea label="ملاحظات" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        {form.amount && <div className="bg-blue-50 p-3 rounded-lg text-sm">سيتم تسجيل الحركة تلقائياً في اليومية بـ <strong>{formatCurrency(Number(form.amount))}</strong></div>}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()}>إلغاء</Button>
          <Button type="submit" loading={saving}>حفظ</Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
