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

export default function CustomersPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      if (!prof.visible_modules.includes("customers")) { router.push("/dashboard"); return; }
      setProfile(prof);
      const [{ data: c }, { data: b }, { data: o }] = await Promise.all([
        supabase.from("mazaya_customers").select("*, mazaya_branches(name)").order("name"),
        supabase.from("mazaya_branches").select("id, name").order("name"),
        supabase.from("mazaya_orders").select("id, customer_id"),
      ]);
      const counts: Record<number, number> = {};
      (o ?? []).forEach((x: any) => { if (x.customer_id) counts[x.customer_id] = (counts[x.customer_id] || 0) + 1; });
      setBranches(b ?? []);
      setRows((c ?? []).map((x: any) => ({ ...x, branch_name: x.mazaya_branches?.name, orders_count: counts[x.id] || 0 })));
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => rows.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search)) &&
    (!branchFilter || String(c.branch_id) === branchFilter)
  ), [rows, search, branchFilter]);

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="العملاء"
        subtitle="عملاء المصنع عبر المعارض"
        helpTitle="العملاء"
        helpDescription="هنا بتسجل العملاء بتوع المعارض. كل عميل مرتبط بمعرض محدد. صفحة العميل بتعرض كل أوردراته — بما فيها أوردرات الصيانة اللاحقة — في مكان واحد."
        backHref="/dashboard"
        actions={<>
          <Button variant="secondary" onClick={() => exportToExcel(filtered, "customers")}>📥 تصدير</Button>
          <Button onClick={() => router.push("/customers/new")}>+ عميل جديد</Button>
        </>}
      />

      <div className="card mb-4">
        <FilterBar>
          <div className="flex-1"><SearchBox value={search} onChange={setSearch} placeholder="ابحث بالاسم أو رقم الهاتف..." /></div>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white">
            <option value="">كل المعارض</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="text-sm text-gray-500 mr-auto">النتائج: <strong>{filtered.length}</strong></div>
        </FilterBar>
      </div>

      <DataTable
        loading={loading}
        rows={filtered}
        emptyMessage="لا يوجد عملاء. ابدأ بإضافة عميل جديد."
        columns={[
          { key: "name", label: "اسم العميل", render: r => <Link href={`/customers/${r.id}`} className="font-semibold text-brand-orange hover:underline">{r.name}</Link> },
          { key: "branch_name", label: "المعرض" },
          { key: "phone", label: "رقم التواصل" },
          { key: "orders_count", label: "عدد الأوردرات" },
          { key: "address", label: "العنوان" },
        ]}
      />
    </DashboardLayout>
  );
}
