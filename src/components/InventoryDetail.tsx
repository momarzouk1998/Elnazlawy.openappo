"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDate } from "@/lib/format";

export default function InventoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState<"boards" | "accessories">("boards");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);
      // Try boards first, then accessories
      let found: any = null;
      let t: "boards" | "accessories" = "boards";
      const { data: b } = await supabase.from("mazaya_boards_inventory").select("*, mazaya_suppliers(name)").eq("id", params.id).maybeSingle();
      if (b) { found = b; t = "boards"; }
      else {
        const { data: a } = await supabase.from("mazaya_accessories_inventory").select("*, mazaya_suppliers(name)").eq("id", params.id).maybeSingle();
        if (a) { found = a; t = "accessories"; }
      }
      setItem(found); setTable(t); setLoading(false);
      // usage history
      if (found) {
        const col = t === "boards" ? "board_id" : "accessory_id";
        const { data: u } = await supabase.from("mazaya_order_materials").select("*, mazaya_orders(order_name, status, start_date)").eq(col, params.id).order("created_at", { ascending: false });
        setUsage(u ?? []);
      }
    })();
  }, [params.id, router]);

  if (!profile) return null;
  if (!item && !loading) return <DashboardLayout profile={profile}><div className="card">الصنف غير موجود</div></DashboardLayout>;

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title={item?.item_name ?? "..."}
        subtitle={`${item?.code ?? ""} • ${item?.mazaya_suppliers?.name ?? ""}`}
        backHref={`/${table}`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card"><div className="text-xs text-gray-500">سعر الوحدة</div><div className="text-xl font-bold">{formatCurrency(item?.unit_price)}</div></div>
        <div className="card"><div className="text-xs text-gray-500">الكمية المدخلة</div><div className="text-xl font-bold">{item?.quantity_in}</div></div>
        <div className="card"><div className="text-xs text-gray-500">المستخدم</div><div className="text-xl font-bold text-red-600">{item?.quantity_used ?? 0}</div></div>
        <div className="card"><div className="text-xs text-gray-500">المتبقي</div><div className="text-xl font-bold text-green-600">{item?.quantity_remaining ?? 0}</div></div>
      </div>

      <div className="card mb-4">
        <h3 className="font-bold mb-2">معلومات الصنف</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">الخامة/النوع:</span> <strong>{item?.material_type || item?.type || "-"}</strong></div>
          <div><span className="text-gray-500">تاريخ الإضافة:</span> <strong>{formatDate(item?.date_added)}</strong></div>
          <div className="col-span-2"><span className="text-gray-500">ملاحظات:</span> <strong>{item?.notes || "-"}</strong></div>
        </div>
      </div>

      <h3 className="font-bold text-lg mt-6 mb-3">📜 سجل الاستخدام في الأوردرات</h3>
      <DataTable
        rows={usage}
        emptyMessage="لم يُستخدم بعد في أي أوردر"
        columns={[
          { key: "created_at", label: "التاريخ", render: r => formatDate(r.created_at) },
          { key: "order", label: "الأوردر", render: r => r.mazaya_orders?.order_name ?? "-" },
          { key: "status", label: "الحالة", render: r => r.mazaya_orders?.status ?? "-" },
          { key: "quantity_used", label: "الكمية" },
          { key: "line_total", label: "القيمة", render: r => formatCurrency(r.line_total) },
        ]}
      />
    </DashboardLayout>
  );
}
