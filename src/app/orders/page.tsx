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
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, ORDER_TYPE_LABELS } from "@/lib/format";

interface Order {
  id: number; order_name: string; status: string; order_type: string;
  customer_id: number | null; branch_id: number | null;
  start_date: string | null; end_date: string | null; duration_days: number | null;
  total: number; customer_name?: string; branch_name?: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<Order[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);
      setBranches([]); // populated below
      const [{ data: b }, { data: o }] = await Promise.all([
        supabase.from("mazaya_branches").select("*").order("name"),
        supabase.from("mazaya_orders").select("*, mazaya_customers(name), mazaya_branches(name), mazaya_order_costs(order_total)").order("start_date", { ascending: false }),
      ]);
      setBranches(b ?? []);
      const enriched: Order[] = (o ?? []).map((x: any) => ({
        id: x.id, order_name: x.order_name, status: x.status, order_type: x.order_type,
        customer_id: x.customer_id, branch_id: x.branch_id,
        start_date: x.start_date, end_date: x.end_date, duration_days: x.duration_days,
        total: x.mazaya_order_costs?.[0]?.order_total || 0,
        customer_name: x.mazaya_customers?.name, branch_name: x.mazaya_branches?.name,
      }));
      setRows(enriched);
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => {
    return rows.filter(o => {
      const matchSearch = !search || o.order_name.toLowerCase().includes(search.toLowerCase()) || (o.customer_name ?? "").includes(search);
      const matchBranch = !branchFilter || String(o.branch_id) === branchFilter;
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchType = !typeFilter || o.order_type === typeFilter;
      const matchDate = (!fromDate || (o.start_date && o.start_date >= fromDate)) && (!toDate || (o.start_date && o.start_date <= toDate));
      return matchSearch && matchBranch && matchStatus && matchType && matchDate;
    });
  }, [rows, search, branchFilter, statusFilter, typeFilter, fromDate, toDate]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="الأوردرات"
        subtitle={`${filtered.length} أوردر مطابق للفلاتر`}
        helpTitle="الأوردرات"
        helpDescription="هنا كل أوردرات المصنع. ابحث بالاسم أو العميل، فلتر بالمعرض أو الحالة أو التاريخ. الإجمالي بيتحسب تلقائياً من تكلفة المواد + التكاليف اليدوية."
        backHref="/dashboard"
        actions={<Button onClick={() => router.push("/orders/new")}>+ أوردر جديد</Button>}
      />

      <div className="card mb-4">
        <FilterBar>
          <div className="flex-1 min-w-[200px]"><SearchBox value={search} onChange={setSearch} placeholder="ابحث باسم الأوردر أو العميل..." /></div>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="px-3 py-2.5 border rounded-lg bg-white">
            <option value="">كل المعارض</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border rounded-lg bg-white">
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 border rounded-lg bg-white">
            <option value="">كل الأنواع</option>
            {Object.entries(ORDER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2.5 border rounded-lg" title="من تاريخ" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2.5 border rounded-lg" title="إلى تاريخ" />
          <Button variant="secondary" onClick={() => exportToExcel(filtered as any, "orders")}>📥 تصدير</Button>
        </FilterBar>
      </div>

      <DataTable
        loading={loading}
        rows={paged}
        emptyMessage="لا توجد أوردرات"
        columns={[
          { key: "order_name", label: "اسم الأوردر", render: r => <Link href={`/orders/${r.id}`} className="font-semibold text-brand-orange hover:underline">{r.order_name}</Link> },
          { key: "type", label: "النوع", render: r => ORDER_TYPE_LABELS[r.order_type] || r.order_type },
          { key: "customer_name", label: "العميل" },
          { key: "branch_name", label: "المعرض" },
          { key: "status", label: "الحالة", render: r => <span className={`badge ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span> },
          { key: "start_date", label: "البدء", render: r => formatDate(r.start_date) },
          { key: "duration", label: "المدة", render: r => r.duration_days != null ? `${r.duration_days} يوم` : "-" },
          { key: "total", label: "الإجمالي", render: r => <span className="font-bold">{formatCurrency(r.total)}</span> },
        ]}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← السابق</Button>
          <span className="text-sm text-gray-600">صفحة {page} من {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>التالي →</Button>
        </div>
      )}
    </DashboardLayout>
  );
}
