"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { SearchBox, FilterBar } from "@/components/SearchFilter";
import { Button } from "@/components/ui/Button";
import { exportToExcel } from "@/lib/excel";
import { PAYMENT_METHOD_LABELS } from "@/lib/format";
import { MODULE_KEYS } from "@/lib/auth";

interface Supplier { id: number; name: string; payment_type: string; phone: string | null; notes: string | null; items_count?: number; }

export default function SuppliersPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      if (!prof.visible_modules.includes("suppliers")) { router.push("/dashboard"); return; }
      setProfile(prof);

      const [{ data: suppliers }, { data: boards }, { data: accs }] = await Promise.all([
        supabase.from("mazaya_suppliers").select("*").order("name"),
        supabase.from("mazaya_boards_inventory").select("supplier_id"),
        supabase.from("mazaya_accessories_inventory").select("supplier_id"),
      ]);
      const counts: Record<number, number> = {};
      [...(boards ?? []), ...(accs ?? [])].forEach((r: any) => {
        if (r.supplier_id) counts[r.supplier_id] = (counts[r.supplier_id] || 0) + 1;
      });
      setRows((suppliers ?? []).map(s => ({ ...s, items_count: counts[s.id] || 0 })));
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => rows.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone ?? "").includes(search);
    const matchPay = !paymentFilter || s.payment_type === paymentFilter;
    return matchSearch && matchPay;
  }), [rows, search, paymentFilter]);

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="الموردون"
        subtitle="إدارة شركات توريد الخامات"
        helpTitle="الموردون"
        helpDescription="هنا بتسجل الـ 7 شركات اللي بتشتري منهم ألواح واكسسوارات. كل مورد له كوداته الخاصة (~80 كود) اللي بتيجي من عنده. الأعمدة التلقائية بتعرض عدد الأكواد المسجلة لكل مورد."
        backHref="/dashboard"
        actions={<>
          <Button variant="secondary" onClick={() => exportToExcel(filtered, "suppliers")}>📥 تصدير Excel</Button>
          <Button onClick={() => router.push("/suppliers/new")}>+ مورد جديد</Button>
        </>}
      />

      <div className="card mb-4">
        <FilterBar>
          <div className="flex-1 min-w-[200px]">
            <SearchBox value={search} onChange={setSearch} placeholder="ابحث بالاسم أو رقم الهاتف..." />
          </div>
          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/30">
            <option value="">كل أنواع التعامل</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="text-sm text-gray-500 mr-auto">النتائج: <strong>{filtered.length}</strong></div>
        </FilterBar>
      </div>

      <DataTable
        loading={loading}
        rows={filtered}
        emptyMessage="لا يوجد موردون. ابدأ بإضافة مورد جديد."
        columns={[
          { key: "name", label: "اسم الشركة", render: r => <Link href={`/suppliers/${r.id}`} className="font-semibold text-brand-orange hover:underline">{r.name}</Link> },
          { key: "payment_type", label: "نوع التعامل", render: r => PAYMENT_METHOD_LABELS[r.payment_type] || r.payment_type },
          { key: "phone", label: "رقم التواصل", render: r => r.phone || "-" },
          { key: "items_count", label: "عدد الأكواد" },
          { key: "notes", label: "ملاحظات", render: r => <span className="text-gray-500 text-xs">{r.notes || "-"}</span> },
        ]}
      />
    </DashboardLayout>
  );
}
