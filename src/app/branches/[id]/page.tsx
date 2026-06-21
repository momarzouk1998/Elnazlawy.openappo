"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDate } from "@/lib/format";

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [branch, setBranch] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);
      const [{ data: b }, { data: c }, { data: o }, { data: j }] = await Promise.all([
        supabase.from("mazaya_branches").select("*").eq("id", id).single(),
        supabase.from("mazaya_customers").select("*").eq("branch_id", id).order("name"),
        supabase.from("mazaya_orders").select("*, mazaya_customers(name)").eq("branch_id", id).order("start_date", { ascending: false }),
        supabase.from("mazaya_journal_entries").select("*").eq("branch_id", id).eq("entry_type", "income").order("entry_date", { ascending: false }),
      ]);
      setBranch(b); setCustomers(c ?? []); setOrders(o ?? []); setIncomes(j ?? []);
      setLoading(false);
    })();
  }, [id, router]);

  if (!profile) return null;
  if (!branch) return <DashboardLayout profile={profile}><div className="card">المعرض غير موجود</div></DashboardLayout>;
  const totalIncome = incomes.reduce((s, i) => s + (i.is_passthrough ? 0 : i.amount), 0);

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title={branch.name} subtitle={branch.location ?? ""} backHref="/branches" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card"><div className="text-sm text-gray-500">عدد العملاء</div><div className="text-2xl font-extrabold">{customers.length}</div></div>
        <div className="card"><div className="text-sm text-gray-500">عدد الأوردرات</div><div className="text-2xl font-extrabold">{orders.length}</div></div>
        <div className="card"><div className="text-sm text-gray-500">إجمالي التحويلات</div><div className="text-2xl font-extrabold text-green-600">{formatCurrency(totalIncome)}</div></div>
      </div>

      <h3 className="font-bold text-lg mt-6 mb-3">👥 العملاء</h3>
      <DataTable
        rows={customers}
        emptyMessage="لا يوجد عملاء لهذا المعرض"
        columns={[
          { key: "name", label: "الاسم", render: r => <Link href={`/customers/${r.id}`} className="text-brand-orange hover:underline">{r.name}</Link> },
          { key: "phone", label: "رقم التواصل" },
          { key: "address", label: "العنوان" },
        ]}
      />

      <h3 className="font-bold text-lg mt-6 mb-3">📦 أوردرات المعرض</h3>
      <DataTable
        rows={orders}
        emptyMessage="لا توجد أوردرات"
        columns={[
          { key: "order_name", label: "اسم الأوردر", render: r => <Link href={`/orders/${r.id}`} className="text-brand-orange hover:underline">{r.order_name}</Link> },
          { key: "customer", label: "العميل", render: r => r.mazaya_customers?.name ?? "-" },
          { key: "status", label: "الحالة" },
          { key: "start_date", label: "البدء", render: r => formatDate(r.start_date) },
        ]}
      />

      <h3 className="font-bold text-lg mt-6 mb-3">💰 التحويلات المستلمة</h3>
      <DataTable
        rows={incomes}
        emptyMessage="لم يستلم تحويلات بعد"
        columns={[
          { key: "entry_date", label: "التاريخ", render: r => formatDate(r.entry_date) },
          { key: "description", label: "البيان" },
          { key: "payment_method", label: "طريقة الدفع" },
          { key: "amount", label: "المبلغ", render: r => <span className="font-bold text-green-600">{formatCurrency(r.amount)}</span> },
        ]}
      />
    </DashboardLayout>
  );
}
