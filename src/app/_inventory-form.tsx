"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PAYMENT_METHOD_LABELS } from "@/lib/format";

interface Props { category: "boards" | "accessories"; }

export default function NewInventoryForm({ category }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [form, setForm] = useState({
    item_name: "", code: "", supplier_id: "",
    type: "", unit_price: "", quantity_in: "", notes: "",
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
      const { data: s } = await supabase.from("mazaya_suppliers").select("id, name").order("name");
      setSuppliers(s ?? []);
      const listKey = category === "boards" ? "board_material" : "accessory_type";
      const { data: ml } = await supabase.from("mazaya_lookup_lists").select("value").eq("list_key", listKey).eq("is_active", true).order("sort_order");
      setTypes((ml ?? []).map((m: any) => m.value));
    })();
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.item_name || !form.code || !form.unit_price || !form.quantity_in) {
      setError("املأ الحقول المطلوبة"); return;
    }
    setSaving(true);
    const supabase = createClient();
    const table = category === "boards" ? "mazaya_boards_inventory" : "mazaya_accessories_inventory";
    const payload: any = {
      item_name: form.item_name, code: form.code,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      unit_price: Number(form.unit_price), quantity_in: Number(form.quantity_in),
      notes: form.notes || null,
    };
    if (category === "boards") payload.material_type = form.type || null;
    else payload.type = form.type || null;

    const { error } = await supabase.from(table).insert([payload]);
    setSaving(false);
    if (error) { setError(error.message); return; }
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
