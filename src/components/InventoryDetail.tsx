"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { useApi } from "@/hooks/useApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDate } from "@/lib/format";

export default function InventoryDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useUserStore();
  const [table, setTable] = useState<"boards" | "accessories">("boards");

  // Try boards first
  const { data: boardItem, loading: boardLoading } = useApi<any>(`/api/boards/${params.id}`);
  const { data: accItem, loading: accLoading } = useApi<any>(`/api/accessories/${params.id}`);

  // Determine which table has the item
  useEffect(() => {
    if (boardItem && !accItem?.id) setTable("boards");
    else if (accItem && !boardItem?.id) setTable("accessories");
  }, [boardItem, accItem]);

  const item = boardItem?.id ? { ...boardItem, supplier_name: boardItem.supplier_name } : accItem?.id ? { ...accItem, supplier_name: accItem.supplier_name } : null;
  const loading = boardLoading || accLoading;

  // Fetch usage history
  const { data: usage } = useApi<any[]>(
    item ? `/api/orders/${table === "boards" ? "" : ""}` : null
  );

  // We need order_materials data — fetch directly
  const [usageData, setUsageData] = useState<any[]>([]);
  useEffect(() => {
    if (!item || !params.id) return;
    const col = table === "boards" ? "board_id" : "accessory_id";
    fetch(`/api/orders?limit=500`)
      .then(r => r.json())
      .then(async (json) => {
        if (!json.ok) return;
        const orders = json.data.items || [];
        // Get materials for all orders and filter for this item
        const mats: any[] = [];
        for (const order of orders) {
          const mRes = await fetch(`/api/orders/${order.id}/materials`);
          const mJson = await mRes.json();
          if (mJson.ok) {
            for (const m of mJson.data) {
              if (m.item_id === parseInt(params.id)) {
                mats.push({ ...m, order_name: order.order_name, status: order.status });
              }
            }
          }
        }
        setUsageData(mats);
      })
      .catch(() => {});
  }, [item, params.id, table]);

  if (!user) return null;
  if (!item && !loading) return <DashboardLayout profile={user}><div className="card">الصنف غير موجود</div></DashboardLayout>;

  return (
    <DashboardLayout profile={user}>
      <PageHeader
        title={item?.item_name ?? "..."}
        subtitle={`${item?.code ?? ""} • ${item?.supplier_name ?? ""}`}
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
        rows={usageData}
        emptyMessage="لم يُستخدم بعد في أي أوردر"
        columns={[
          { key: "created_at", label: "التاريخ", render: (r: any) => formatDate(r.created_at) },
          { key: "order_name", label: "الأوردر" },
          { key: "quantity_used", label: "الكمية" },
          { key: "line_total", label: "القيمة", render: (r: any) => formatCurrency(r.line_total) },
        ]}
      />
    </DashboardLayout>
  );
}
