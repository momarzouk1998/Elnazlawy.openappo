"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDate } from "@/lib/format";

export default function ContractorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);
      const [{ data: c }, { data: w }] = await Promise.all([
        supabase.from("mazaya_contractors").select("*").eq("id", id).single(),
        supabase.from("mazaya_order_external_work").select("*, mazaya_orders(order_name, status)").eq("contractor_id", id).order("created_at", { ascending: false }),
      ]);
      setContractor(c); setWorks(w ?? []); setLoading(false);
    })();
  }, [id, router]);

  if (!profile) return null;
  if (!contractor && !loading) return <DashboardLayout profile={profile}><div className="card">المقاول غير موجود</div></DashboardLayout>;

  const total = works.reduce((s, w) => s + (w.amount || 0), 0);

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title={contractor?.name ?? "..."} subtitle={contractor?.type ?? ""} backHref="/contractors" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card"><div className="text-sm text-gray-500">النوع</div><div className="text-xl font-bold">{contractor?.type ?? "-"}</div></div>
        <div className="card"><div className="text-sm text-gray-500">التواصل</div><div className="text-xl font-bold">{contractor?.phone ?? "-"}</div></div>
        <div className="card"><div className="text-sm text-gray-500">إجمالي الأعمال</div><div className="text-xl font-bold text-brand-orange">{formatCurrency(total)}</div></div>
      </div>

      {contractor?.notes && <div className="card mb-4">📝 {contractor.notes}</div>}

      <h3 className="font-bold text-lg mt-6 mb-3">🔨 الأعمال المسندة</h3>
      <DataTable
        rows={works}
        emptyMessage="لا توجد أعمال مسجلة"
        columns={[
          { key: "created_at", label: "تاريخ التسجيل", render: r => formatDate(r.created_at) },
          { key: "work_type", label: "نوع الشغل" },
          { key: "order", label: "الأوردر", render: r => r.mazaya_orders ? <Link href={`/orders/${r.mazaya_orders.id}`} className="text-brand-orange hover:underline">{r.mazaya_orders.order_name}</Link> : "-" },
          { key: "amount", label: "القيمة", render: r => formatCurrency(r.amount) },
          { key: "notes", label: "ملاحظات" },
        ]}
      />
    </DashboardLayout>
  );
}
