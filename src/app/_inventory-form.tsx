"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { useApi, useApiMutation } from "@/hooks/useApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PAYMENT_METHOD_LABELS } from "@/lib/format";

interface Props { category: "boards" | "accessories"; }

export default function NewInventoryForm({ category }: Props) {
  const router = useRouter();
  const { user: profile } = useUserStore();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [form, setForm] = useState({
    item_name: "", code: "", supplier_id: "",
    type: "", unit_price: "", quantity_in: "", notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/suppliers?limit=500').then(r => r.json()).then(d => {
      if (d.ok) setSuppliers(d.data.items ?? []);
    });
    const listKey = category === "boards" ? "board_material" : "accessory_type";
    fetch(`/api/material-types?list_key=${listKey}`).then(r => r.json()).then(d => {
      if (d.ok) setTypes((d.data.items ?? []).map((m: any) => m.value));
    });
  }, [category]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.item_name || !form.code || !form.unit_price || !form.quantity_in) {
      setError("املأ الحقول المطلوبة"); return;
    }
    setSaving(true);
    const payload: any = {
      item_name: form.item_name, code: form.code,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      unit_price: Number(form.unit_price), quantity_in: Number(form.quantity_in),
      notes: form.notes || null,
    };
    if (category === "boards") payload.material_type = form.type || null;
    else payload.type = form.type || null;

    const apiPath = category === "boards" ? "/api/boards" : "/api/accessories";
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) { setError(result?.error?.message || 'حدث خطأ'); return; }
    router.push(`/${category}`);
    router.refresh();
  }

  if (!profile) return null;
  const backHref = `/${category}`;
  const typeLabel = category === "boards" ? "خامة / نوع" : "نوع الاكسسوار";

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title={category === "boards" ? "لوح جديد" : "اكسسوار جديد"} backHref={backHref} />
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4">
        <Input label="اسم الصنف (البيان) *" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} required />
        <Input label="الكود *" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required hint="الكود فريد لكل مورد" />
        <Select
          label={typeLabel}
          value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value })}
          options={[{ value: "", label: "— اختر —" }, ...types.map(t => ({ value: t, label: t }))]}
        />
        <Select
          label="المورد"
          value={form.supplier_id}
          onChange={e => setForm({ ...form, supplier_id: e.target.value })}
          options={[{ value: "", label: "— بدون مورد —" }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="سعر الوحدة *" type="number" step="0.01" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} required />
          <Input label="الكمية *" type="number" value={form.quantity_in} onChange={e => setForm({ ...form, quantity_in: e.target.value })} required />
        </div>
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
