"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PAYMENT_METHOD_LABELS } from "@/lib/format";

export default function NewSupplierPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: "", payment_type: "both", phone: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useState(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);
    })();
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("اسم الشركة مطلوب"); return; }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("mazaya_suppliers").insert([form]);
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push("/suppliers");
    router.refresh();
  }

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title="مورد جديد" backHref="/suppliers" />
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4">
        <Input label="اسم الشركة *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <Select
          label="نوع التعامل"
          value={form.payment_type}
          onChange={e => setForm({ ...form, payment_type: e.target.value })}
          options={Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />
        <Input label="رقم التواصل" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <Textarea label="ملاحظات" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()}>إلغاء</Button>
          <Button type="submit" loading={saving}>حفظ</Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
