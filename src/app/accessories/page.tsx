"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { SearchBox, FilterBar } from "@/components/SearchFilter";
import { Button } from "@/components/ui/Button";
import { exportToExcel, importFromExcel } from "@/lib/excel";
import { formatCurrency } from "@/lib/format";
import RowEditor, { type FieldDef } from "@/components/ui/RowEditor";

const accessoryFields: FieldDef[] = [
  { name: "item_name", label: "اسم الصنف", required: true },
  { name: "code", label: "الكود", required: true },
  { name: "type", label: "النوع" },
  { name: "unit_price", label: "سعر الوحدة", type: "number" },
  { name: "quantity_in", label: "الكمية المدخلة", type: "number" },
  { name: "notes", label: "ملاحظات", rows: 2 },
];

interface Accessory {
  id: number; item_name: string; type: string | null; code: string;
  supplier_id: number | null; supplier_name?: string;
  unit_price: number; quantity_in: number; total_price: number;
  quantity_used: number; quantity_remaining: number;
  date_added: string; notes: string | null;
}

export default function AccessoriesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<Accessory[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      if (!prof.visible_modules.includes("accessories_inventory")) { router.push("/dashboard"); return; }
      setProfile(prof);

      const [{ data: a }, { data: s }, { data: ml }] = await Promise.all([
        supabase.from("mazaya_accessories_inventory").select("*, mazaya_suppliers(name)").order("id", { ascending: false }),
        supabase.from("mazaya_suppliers").select("id, name").order("name"),
        supabase.from("mazaya_lookup_lists").select("value").eq("list_key", "accessory_type").eq("is_active", true).order("sort_order"),
      ]);
      setSuppliers(s ?? []);
      setTypes((ml ?? []).map(m => m.value));
      setRows((a ?? []).map((x: any) => ({ ...x, supplier_name: x.mazaya_suppliers?.name })));
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => rows.filter(a => {
    const matchSearch = !search || a.item_name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase());
    const matchSup = !supplierFilter || String(a.supplier_id) === supplierFilter;
    const matchType = !typeFilter || a.type === typeFilter;
    const matchAvail = !availableOnly || a.quantity_remaining > 0;
    return matchSearch && matchSup && matchType && matchAvail;
  }), [rows, search, supplierFilter, typeFilter, availableOnly]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    try {
      const data = await importFromExcel<any>(file);
      const supabase = createClient();
      let ok = 0, fail = 0;
      for (const r of data) {
        const supplierName = String(r["الشركة"] || r["المورد"] || "").trim();
        const supplier = suppliers.find(s => s.name === supplierName);
        const payload = {
          item_name: String(r["البيان"] || r["item_name"] || "").trim(),
          code: String(r["الكود"] || r["code"] || "").trim(),
          type: String(r["النوع"] || r["type"] || "").trim(),
          supplier_id: supplier?.id ?? null,
          unit_price: Number(r["السعر"] || r["unit_price"] || 0),
          quantity_in: Number(r["العدد"] || r["quantity_in"] || 0),
          notes: String(r["ملاحظات"] || r["notes"] || "").trim() || null,
        };
        if (!payload.item_name || !payload.code) { fail++; continue; }
        const { error } = await supabase.from("mazaya_accessories_inventory").insert([payload]);
        if (error) fail++; else ok++;
      }
      alert(`تم استيراد ${ok} بنجاح${fail ? `، فشل ${fail}` : ""}`);
      location.reload();
    } finally { setImporting(false); e.target.value = ""; }
  }

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="مخزون الاكسسوارات"
        subtitle={`${rows.length} صنف إجمالي`}
        helpTitle="مخزون الاكسسوارات"
        helpDescription="إدارة مفصلات، سكك دُرج، مجاري، كاوتش، إلخ. نفس فكرة الألواح: ابحث أولاً، لو الصنف موجود زوّد الكمية، لو مش موجود أنشئ صنف جديد. الكود فريد لكل مورد."
        backHref="/dashboard"
        actions={<>
          <label className="btn-secondary cursor-pointer">
            {importing ? "جاري..." : "📤 استيراد Excel"}
            <input type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />
          </label>
          <Button variant="secondary" onClick={() => exportToExcel(filtered.map(({ id, supplier_name, total_price, ...rest }) => rest as any), "accessories_inventory")}>📥 تصدير</Button>
          <Button onClick={() => router.push("/accessories/new")}>+ اكسسوار جديد</Button>
        </>}
      />

      <div className="card mb-4">
        <FilterBar>
          <div className="flex-1 min-w-[200px]"><SearchBox value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الكود..." /></div>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white">
            <option value="">كل الموردين</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white">
            <option value="">كل الأنواع</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} className="accent-brand-orange" />
            المتوفر فقط
          </label>
          <div className="text-sm text-gray-500 mr-auto">النتائج: <strong>{filtered.length}</strong></div>
        </FilterBar>
      </div>

      <DataTable
        loading={loading}
        rows={filtered}
        emptyMessage="لا توجد اكسسوارات."
        columns={[
          { key: "item_name", label: "البيان", render: r => <Link href={`/accessories/${r.id}`} className="text-brand-orange hover:underline font-medium">{r.item_name}</Link> },
          { key: "code", label: "الكود", render: r => <code className="text-xs bg-gray-100 px-2 py-1 rounded">{r.code}</code> },
          { key: "type", label: "النوع" },
          { key: "supplier_name", label: "المورد" },
          { key: "unit_price", label: "السعر", render: r => formatCurrency(r.unit_price) },
          { key: "quantity_in", label: "الداخل" },
          { key: "quantity_used", label: "المستخدم" },
          { key: "quantity_remaining", label: "المتبقي", render: r => <span className={r.quantity_remaining > 0 ? "font-bold text-green-600" : "text-gray-400"}>{r.quantity_remaining}</span> },
          { key: "total_price", label: "الإجمالي", render: r => <span className="font-bold">{formatCurrency(r.total_price)}</span> },
          { key: "_actions", label: "إجراءات", render: r => <RowEditor row={r} table="mazaya_accessories_inventory" fields={accessoryFields} entityLabel="الاكسسوار" deleteHint="لا يمكن حذف هذا الصنف لأنه مُستخدم في أوردرات أو مُسجّل في اليومية" /> },
        ]}
      />
    </DashboardLayout>
  );
}
