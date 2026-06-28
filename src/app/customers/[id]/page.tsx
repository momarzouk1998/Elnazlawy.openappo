"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUserStore } from "@/store/user-store";
import { useApi } from "@/hooks/useApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, ORDER_TYPE_LABELS } from "@/lib/format";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: profile } = useUserStore();
  const { data: customerData, loading } = useApi<any>(`/api/customers/${id}`);
  const customer = customerData?.data ?? customerData;
  const { data: ordersRes } = useApi<{ items: any[] }>(`/api/orders?limit=500&customer_id=${id}`);
  const orders = ordersRes?.items ?? [];

  if (!profile) return null;
  if (!customer && !loading) return <DashboardLayout profile={profile}><div className="card">العميل غير موجود</div></DashboardLayout>;

  const totalSpend = orders.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title={customer?.name ?? "..."} subtitle={customer?.branch_name ?? ""} backHref="/customers" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card"><div className="text-sm text-gray-500">رقم التواصل</div><div className="text-lg font-bold">{customer?.phone || "-"}</div></div>
        <div className="card"><div className="text-sm text-gray-500">إجمالي الأوردرات</div><div className="text-2xl font-bold text-brand-orange">{orders.length}</div></div>
        <div className="card"><div className="text-sm text-gray-500">إجمالي المبلغ</div><div className="text-2xl font-bold text-green-600">{formatCurrency(totalSpend)}</div></div>
      </div>

      {customer?.address && <div className="card mb-4">📍 {customer.address}</div>}
      {customer?.notes && <div className="card mb-4">📝 {customer.notes}</div>}

      <h3 className="font-bold text-lg mt-6 mb-3">📦 كل أوردرات العميل (تصنيع + صيانة)</h3>
      <DataTable
        rows={orders}
        emptyMessage="لا توجد أوردرات لهذا العميل بعد"
        columns={[
          { key: "order_name", label: "اسم الأوردر", render: r => <Link href={`/orders/${r.id}`} className="text-brand-orange hover:underline">{r.order_name}</Link> },
          { key: "order_type", label: "النوع", render: r => ORDER_TYPE_LABELS[r.order_type] || r.order_type },
          { key: "status", label: "الحالة", render: r => <span className={`badge ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status] || r.status}</span> },
          { key: "start_date", label: "تاريخ البدء", render: r => formatDate(r.start_date) },
          { key: "end_date", label: "تاريخ الانتهاء", render: r => formatDate(r.end_date) },
          { key: "duration", label: "المدة", render: r => r.duration_days != null ? `${r.duration_days} يوم` : "-" },
          { key: "total", label: "الإجمالي", render: r => <span className="font-bold">{formatCurrency(r.total)}</span> },
        ]}
      />
    </DashboardLayout>
  );
}
