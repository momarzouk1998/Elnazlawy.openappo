"use client";
import { useState } from "react";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { formatEGP, formatDate } from "@/lib/format";
import Link from "next/link";

interface PurchaseInvoice {
  id: string; purchase_number: number; purchase_date: string; total_amount: number;
  paid_amount: number; status: string; notes: string | null;
  supplier?: { name: string } | null;
  creator?: { full_name: string } | null;
  _count?: { items: number };
}
interface ApiResponse { items: PurchaseInvoice[]; total: number; }

export default function PurchasesPage() {
  const { data, loading, refetch } = useApi<ApiResponse>("/api/purchases/invoices");
  const totalAmount = (data?.items || []).reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">📥 فواتير المشتريات</h1>
          <p className="text-sm text-gray-500">{data?.total ?? '...'} فاتورة • إجمالي: {formatEGP(totalAmount)} جنيه</p>
        </div>
        <Link href="/purchases/new" className="btn-primary">+ فاتورة شراء</Link>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">رقم</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">المورد</th>
                <th className="p-3 text-right">الأصناف</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-right">المدفوع</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(inv => (
                <tr key={inv.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold">#{inv.purchase_number}</td>
                  <td className="p-3 text-xs">{formatDate(inv.purchase_date)}</td>
                  <td className="p-3 font-semibold">{inv.supplier?.name || '—'}</td>
                  <td className="p-3 text-center">{inv._count?.items ?? 0}</td>
                  <td className="p-3 font-mono font-bold">{formatEGP(inv.total_amount)}</td>
                  <td className="p-3 font-mono text-green-700">{formatEGP(inv.paid_amount)}</td>
                  <td className="p-3"><span className="badge bg-green-100 text-green-800">{inv.status}</span></td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-gray-400">لا توجد فواتير مشتريات</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
