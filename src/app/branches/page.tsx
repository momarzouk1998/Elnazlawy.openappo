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

const branchFields: FieldDef[] = [
  { name: "name", label: "اسم المعرض", required: true },
  { name: "location", label: "الموقع" },
  { name: "phone", label: "رقم التواصل" },
  { name: "notes", label: "ملاحظات", rows: 2 },
];

export default function BranchesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      if (!prof.visible_modules.includes("branches")) { router.push("/dashboard"); return; }
      setProfile(prof);

      const [{ data: b }, { data: cust }, { data: orders }, { data: j }] = await Promise.all([
        supabase.from("mazaya_branches").select("*").order("name"),
        supabase.from("mazaya_customers").select("id, branch_id"),
        supabase.from("mazaya_orders").select("branch_id, status"),
        supabase.from("mazaya_journal_entries").select("branch_id, amount, entry_type, is_passthrough").eq("entry_type", "income"),
      ]);
      const enriched = (b ?? []).map((br: any) => {
        const customers = (cust ?? []).filter((c: any) => c.branch_id === br.id).length;
        const ordersCount = (orders ?? []).filter((o: any) => o.branch_id === br.id).length;
        const totalIncome = (j ?? []).filter((x: any) => x.branch_id === br.id && !x.is_passthrough).reduce((s: number, x: any) => s + x.amount, 0);
        return { ...br, customers_count: customers, orders_count: ordersCount, total_income: totalIncome };
      });
      setRows(enriched);
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => rows.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()) || (b.location ?? "").toLowerCase().includes(search.toLowerCase())), [rows, search]);

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="المعارض / الفروع"
        subtitle="النقاط اللي بتبيع للعميل النهائي"
        helpTitle="المعارض"
        helpDescription="هنا الـ 4 معارض بتاعة المصنع. كل معرض له عملاء وأوردرات. المعرض بيحول للمصنع قيمة الأوردرات اللي بيوصلها."
        backHref="/dashboard"
        actions={<Button variant="secondary" onClick={() => exportToExcel(filtered, "branches")}>📥 تصدير</Button>}
      />

      <div className="card mb-4">
        <FilterBar>
          <div className="flex-1"><SearchBox value={search} onChange={setSearch} placeholder="ابحث باسم المعرض أو الموقع..." /></div>
          <div className="text-sm text-gray-500 mr-auto">النتائج: <strong>{filtered.length}</strong></div>
        </FilterBar>
      </div>

      <DataTable
        loading={loading}
        rows={filtered}
        columns={[
          { key: "name", label: "اسم المعرض", render: r => <Link href={`/branches/${r.id}`} className="font-semibold text-brand-orange hover:underline">{r.name}</Link> },
          { key: "location", label: "الموقع" },
          { key: "phone", label: "التواصل" },
          { key: "customers_count", label: "عدد العملاء" },
          { key: "orders_count", label: "عدد الأوردرات" },
          { key: "total_income", label: "إجمالي التحويلات", render: r => <span className="font-bold text-green-600">{formatCurrency(r.total_income)}</span> },
          { key: "_actions", label: "إجراءات", render: r => <RowEditor row={r} table="mazaya_branches" fields={branchFields} entityLabel="المعرض" deleteHint="لا يمكن حذف هذا المعرض لوجود عملاء أو أوردرات أو تحويلات مرتبطة به" /> },
        ]}
      />
    </DashboardLayout>
  );
}
