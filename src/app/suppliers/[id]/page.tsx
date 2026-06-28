"use client";
import { useParams } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { useApi } from "@/hooks/useApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from "@/lib/format";

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, initialized } = useUserStore();
  const { data: supplier, loading } = useApi<any>(`/api/suppliers/${id}`);
  const { data: boardsData } = useApi<{ items: any[] }>('/api/boards?limit=500&supplier_id=' + id);
  const { data: accData } = useApi<{ items: any[] }>('/api/accessories?limit=500&supplier_id=' + id);
  const { data: journalData } = useApi<{ entries: any[] }>('/api/journal?limit=500&party_type=supplier&party_id=' + id);

  const boards = boardsData?.items?.filter((b: any) => b.supplier_id === parseInt(id)) || [];
  const accessories = accData?.items?.filter((a: any) => a.supplier_id === parseInt(id)) || [];
  const purchases = journalData?.entries || [];

  if (!initialized) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full"></div></div>;
  if (!user) return null;
  if (!supplier && !loading) return <DashboardLayout profile={user}><div className="card">المورد غير موجود</div></DashboardLayout>;

  const totalPurchases = purchases.reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0);
  const totalItemsValue = [...boards, ...accessories].reduce((s: number, it: any) => s + (it.unit_price * it.quantity_remaining), 0);

  return (
    <DashboardLayout profile={user}>
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
          { key: "unit_price", label: "السعر", render: (r: any) => formatCurrency(r.unit_price) },
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
          { key: "material_type", label: "النوع" },
          { key: "unit_price", label: "السعر", render: (r: any) => formatCurrency(r.unit_price) },
          { key: "quantity_remaining", label: "المتبقي" },
        ]}
      />

      <h3 className="font-bold text-lg mt-6 mb-3 text-brand-black">💸 سجل المدفوعات</h3>
      <DataTable
        rows={purchases}
        emptyMessage="لا توجد مدفوعات"
        columns={[
          { key: "date", label: "التاريخ", render: (r: any) => formatDate(r.date) },
          { key: "description", label: "البيان" },
          { key: "amount", label: "المبلغ", render: (r: any) => <span className="font-bold text-red-600">{formatCurrency(r.amount)}</span> },
        ]}
      />
    </DashboardLayout>
  );
}
