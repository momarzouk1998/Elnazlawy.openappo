"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from "@/lib/format";

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [boards, setBoards] = useState<any[]>([]);
  const [accessories, setAccessories] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);

      const [{ data: s }, { data: b }, { data: a }, { data: j }] = await Promise.all([
        supabase.from("mazaya_suppliers").select("*").eq("id", id).single(),
        supabase.from("mazaya_boards_inventory").select("*").eq("supplier_id", id).order("item_name"),
        supabase.from("mazaya_accessories_inventory").select("*").eq("supplier_id", id).order("item_name"),
        supabase.from("mazaya_journal_entries").select("*").eq("supplier_id", id).eq("entry_type", "expense").order("entry_date", { ascending: false }),
      ]);
      setSupplier(s); setBoards(b ?? []); setAccessories(a ?? []); setPurchases(j ?? []);
      setLoading(false);
    })();
  }, [id, router]);

  if (!profile) return null;
  if (!supplier && !loading) return <DashboardLayout profile={profile}><div className="card">المورد غير موجود</div></DashboardLayout>;

  const totalPurchases = purchases.reduce((s, p) => s + p.amount, 0);
  const totalItemsValue = [...boards, ...accessories].reduce((s, it) => s + (it.unit_price * it.quantity_remaining), 0);

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title={supplier?.name ?? "..."}
        subtitle={`${boards.length + accessories.length} صنف • ${PAYMENT_METHOD_LABELS[supplier?.payment_type ?? "both"]}`}
        backHref="/suppliers"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-gray-500">إجمالي الأصناف</div>
          <div className="text-2xl font-extrabold text-brand-black">{boards.length + accessories.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">قيمة المخزون المتبقي</div>
          <div className="text-2xl font-extrabold text-brand-orange">{formatCurrency(totalItemsValue)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">إجمالي المدفوعات</div>
          <div className="text-2xl font-extrabold text-red-600">{formatCurrency(totalPurchases)}</div>
        </div>
      </div>

      {supplier?.phone && <div className="card mb-4">📞 <strong>التواصل:</strong> {supplier.phone}</div>}
      {supplier?.notes && <div className="card mb-4">📝 {supplier.notes}</div>}

      <h3 className="font-bold text-lg mt-6 mb-3 text-brand-black">📦 ألواح من هذا المورد</h3>
      <DataTable
        loading={loading}
        rows={boards}
        emptyMessage="لا توجد ألواح"
        columns={[
          { key: "item_name", label: "الاسم" },
          { key: "code", label: "الكود" },
          { key: "material_type", label: "النوع" },
          { key: "unit_price", label: "السعر", render: r => formatCurrency(r.unit_price) },
          { key: "quantity_remaining", label: "المتبقي" },
        ]}
      />

      <h3 className="font-bold text-lg mt-6 mb-3 text-brand-black">🔩 اكسسوارات من هذا المورد</h3>
      <DataTable
        rows={accessories}
        emptyMessage="لا توجد اكسسوارات"
        columns={[
          { key: "item_name", label: "الاسم" },
          { key: "code", label: "الكود" },
          { key: "type", label: "النوع" },
          { key: "unit_price", label: "السعر", render: r => formatCurrency(r.unit_price) },
          { key: "quantity_remaining", label: "المتبقي" },
        ]}
      />

      <h3 className="font-bold text-lg mt-6 mb-3 text-brand-black">💸 سجل المدفوعات</h3>
      <DataTable
        rows={purchases}
        emptyMessage="لا توجد مدفوعات"
        columns={[
          { key: "entry_date", label: "التاريخ", render: r => formatDate(r.entry_date) },
          { key: "description", label: "البيان" },
          { key: "amount", label: "المبلغ", render: r => <span className="font-bold text-red-600">{formatCurrency(r.amount)}</span> },
        ]}
      />
    </DashboardLayout>
  );
}
