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
import { exportToExcel } from "@/lib/excel";
import { formatCurrency } from "@/lib/format";
import RowEditor, { type FieldDef } from "@/components/ui/RowEditor";

const contractorFields: FieldDef[] = [
  { name: "name", label: "اسم المقاول", required: true },
  { name: "type", label: "النوع" },
  { name: "phone", label: "رقم التواصل" },
  { name: "notes", label: "ملاحظات", rows: 2 },
];

export default function ContractorsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      if (!prof.visible_modules.includes("contractors")) { router.push("/dashboard"); return; }
      setProfile(prof);
      const [{ data: c }, { data: ow }] = await Promise.all([
        supabase.from("mazaya_contractors").select("*").order("name"),
        supabase.from("mazaya_order_external_work").select("contractor_id, amount"),
      ]);
      const totals: Record<number, number> = {};
      (ow ?? []).forEach((w: any) => { if (w.contractor_id) totals[w.contractor_id] = (totals[w.contractor_id] || 0) + (w.amount || 0); });
      setRows((c ?? []).map((x: any) => ({ ...x, total_work: totals[x.id] || 0 })));
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => rows.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || c.type === typeFilter)
  ), [rows, search, typeFilter]);
  const allTypes = [...new Set(rows.map(r => r.type).filter(Boolean))];

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="المقاولون الخارجيون"
        subtitle="ورش الألوميتال والتنجيد وغيرها"
        helpTitle="المقاولون"
        helpDescription="الورش اللي المصنع بيشتغل معاها بره: ألوميتال، تنجيد، نقل. المبالغ هنا بتتسجل للتتبع بس ومش بتدخل في تكلفة الأوردر لأن المعرض بيحول للمقاول مباشرة."
        backHref="/dashboard"
        actions={<>
          <Button variant="secondary" onClick={() => exportToExcel(filtered, "contractors")}>📥 تصدير</Button>
          <Button onClick={() => router.push("/contractors/new")}>+ مقاول جديد</Button>
        </>}
      />

      <div className="card mb-4">
        <FilterBar>
          <div className="flex-1"><SearchBox value={search} onChange={setSearch} placeholder="ابحث بالاسم..." /></div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white">
            <option value="">كل الأنواع</option>
            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="text-sm text-gray-500 mr-auto">النتائج: <strong>{filtered.length}</strong></div>
        </FilterBar>
      </div>

      <DataTable
        loading={loading}
        rows={filtered}
        emptyMessage="لا يوجد مقاولون"
        columns={[
          { key: "name", label: "الاسم", render: r => <Link href={`/contractors/${r.id}`} className="font-semibold text-brand-orange hover:underline">{r.name}</Link> },
          { key: "type", label: "النوع" },
          { key: "phone", label: "رقم التواصل" },
          { key: "total_work", label: "إجمالي الأعمال", render: r => formatCurrency(r.total_work) },
          { key: "notes", label: "ملاحظات" },
          { key: "_actions", label: "إجراءات", render: r => <RowEditor row={r} table="mazaya_contractors" fields={contractorFields} entityLabel="المقاول" deleteHint="لا يمكن حذف هذا المقاول لوجود أعمال خارجية مسندة إليه" /> },
        ]}
      />
    </DashboardLayout>
  );
}
