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
import { formatCurrency, formatDate } from "@/lib/format";

interface Board {
  id: number; item_name: string; material_type: string | null; code: string;
  supplier_id: number | null; supplier_name?: string;
  unit_price: number; quantity_in: number; total_price: number;
  quantity_used: number; quantity_remaining: number;
  date_added: string; notes: string | null;
}

export default function BoardsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<Board[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      if (!prof.visible_modules.includes("boards_inventory")) { router.push("/dashboard"); return; }
      setProfile(prof);

      const [{ data: b }, { data: s }, { data: ml }] = await Promise.all([
        supabase.from("mazaya_boards_inventory").select("*, mazaya_suppliers(name)").order("id", { ascending: false }),
        supabase.from("mazaya_suppliers").select("id, name").order("name"),
        supabase.from("mazaya_lookup_lists").select("value").eq("list_key", "board_material").eq("is_active", true).order("sort_order"),
      ]);
      setSuppliers(s ?? []);
      setMaterialTypes((ml ?? []).map(m => m.value));
      setRows((b ?? []).map((x: any) => ({ ...x, supplier_name: x.mazaya_suppliers?.name })));
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => rows.filter(b => {
    const matchSearch = !search || b.item_name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase());
    const matchSup = !supplierFilter || String(b.supplier_id) === supplierFilter;
    const matchMat = !materialFilter || b.material_type === materialFilter;
    const matchAvail = !availableOnly || b.quantity_remaining > 0;
    return matchSearch && matchSup && matchMat && matchAvail;
  }), [rows, search, supplierFilter, materialFilter, availableOnly]);

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
          material_type: String(r["خامة"] || r["material_type"] || "").trim(),
          supplier_id: supplier?.id ?? null,
          unit_price: Number(r["السعر"] || r["unit_price"] || 0),
          quantity_in: Number(r["العدد"] || r["quantity_in"] || 0),
          notes: String(r["ملاحظات"] || r["notes"] || "").trim() || null,
        };
        if (!payload.item_name || !payload.code) { fail++; continue; }
        const { error } = await supabase.from("mazaya_boards_inventory").insert([payload]);
        if (error) fail++; else ok++;
      }
      alert(`تم استيراد ${ok} صنف بنجاح${fail ? `، فشل ${fail}` : ""}`);
      location.reload();
    } finally { setImporting(false); e.target.value = ""; }
  }

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="مخزون الألواح"
        subtitle={`${rows.length} صنف إجمالي`}
        helpTitle="مخزون الألواح"
        helpDescription="من هنا بتدير ألواح المصنع: تضيف شراء جديد، تبحث بالاسم/الكود، تفلتر بالمورد أو الخامة. المتبقي بيتخصم تلقائي عند استخدام الصنف في أوردر."
        backHref="/dashboard"
        actions={<>
          <label className="btn-secondary cursor-pointer">
            {importing ? "جاري الاستيراد..." : "📤 استيراد Excel"}
            <input type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />
          </label>
          <Button variant="secondary" onClick={() => exportToExcel(filtered.map(({ id, supplier_name, total_price, ...rest }) => rest as any), "boards_inventory")}>📥 تصدير</Button>
          <Button onClick={() => router.push("/boards/new")}>+ صنف جديد</Button>
        </>}
      />

      <div className="card mb-4">
        <FilterBar>
          <div className="flex-1 min-w-[200px]"><SearchBox value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الكود..." /></div>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white">
            <option value="">كل الموردين</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white">
            <option value="">كل الخامات</option>
            {materialTypes.map(m => <option key={m} value={m}>{m}</option>)}
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
        emptyMessage="لا توجد ألواح. ابدأ بإضافة صنف أو استيراد Excel."
        columns={[
          { key: "item_name", label: "البيان", render: r => <Link href={`/boards/${r.id}`} className="text-brand-orange hover:underline font-medium">{r.item_name}</Link> },
          { key: "code", label: "الكود", render: r => <code className="text-xs bg-gray-100 px-2 py-1 rounded">{r.code}</code> },
          { key: "material_type", label: "الخامة" },
          { key: "supplier_name", label: "المورد" },
          { key: "unit_price", label: "السعر", render: r => formatCurrency(r.unit_price) },
          { key: "quantity_in", label: "الداخل" },
          { key: "quantity_used", label: "المستخدم" },
          { key: "quantity_remaining", label: "المتبقي", render: r => <span className={r.quantity_remaining > 0 ? "font-bold text-green-600" : "text-gray-400"}>{r.quantity_remaining}</span> },
          { key: "total_price", label: "الإجمالي", render: r => <span className="font-bold">{formatCurrency(r.total_price)}</span> },
        ]}
      />
    </DashboardLayout>
  );
}
