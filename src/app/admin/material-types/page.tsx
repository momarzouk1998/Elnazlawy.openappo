"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";

export default function MaterialTypesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ list_key: "board_material", value: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
    setProfile(prof);
    const { data } = await supabase.from("mazaya_lookup_lists").select("*").order("list_key").order("sort_order");
    setRows(data ?? []); setLoading(false);
  }

  async function addItem() {
    if (!newItem.value.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("mazaya_lookup_lists").insert([{ ...newItem, is_active: true, sort_order: 99 }]);
    setNewItem({ ...newItem, value: "" });
    await load();
    setSaving(false);
  }

  async function toggleActive(r: any) {
    const supabase = createClient();
    await supabase.from("mazaya_lookup_lists").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  }

  const filtered = filter === "all" ? rows : rows.filter(r => r.list_key === filter);
  const listKeys = [...new Set(rows.map(r => r.list_key))];

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="قوائم الاختيارات"
        subtitle="خامات، أنواع اكسسوارات، طرق دفع..."
        helpTitle="قوائم الاختيارات"
        helpDescription="من هنا بتتحكم في القوائم اللي بتظهر في dropdowns في كل النظام: خامات الألواح، أنواع الاكسسوارات، أنواع الحركات، إلخ. الإضافة تظهر فوراً في الصفحات اللي بتستخدم القائمة."
        backHref="/dashboard"
      />

      <div className="card mb-4 flex flex-wrap gap-2 items-end">
        <Select label="القائمة" value={filter} onChange={e => setFilter(e.target.value)} options={[{ value: "all", label: "الكل" }, ...listKeys.map(k => ({ value: k, label: k }))]} />
        <div className="flex-1 min-w-[200px]">
          <Input label="إضافة قيمة جديدة" value={newItem.value} onChange={e => setNewItem({ ...newItem, value: e.target.value })} placeholder="مثال: لوح خشب طبيعي" />
        </div>
        <Select label="للقائمة" value={newItem.list_key} onChange={e => setNewItem({ ...newItem, list_key: e.target.value })} options={listKeys.map(k => ({ value: k, label: k }))} />
        <Button onClick={addItem} loading={saving}>+ إضافة</Button>
      </div>

      <DataTable
        loading={loading}
        rows={filtered}
        emptyMessage="لا توجد قيم"
        columns={[
          { key: "list_key", label: "القائمة", render: r => <code className="text-xs bg-gray-100 px-2 py-1 rounded">{r.list_key}</code> },
          { key: "value", label: "القيمة", render: r => <span className="font-medium">{r.value}</span> },
          { key: "sort_order", label: "الترتيب" },
          { key: "is_active", label: "الحالة", render: r => <button onClick={() => toggleActive(r)} className={`badge cursor-pointer ${r.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{r.is_active ? "نشط" : "معطل"}</button> },
        ]}
      />
    </DashboardLayout>
  );
}
