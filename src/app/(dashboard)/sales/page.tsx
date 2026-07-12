"use client";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { formatEGP, formatDate, statusColor } from "@/lib/format";
import Link from "next/link";

interface Invoice {
  id: string;
  invoice_number: number;
  invoice_date: string;
  invoice_type: string;
  status: string;
  total: number;
  customer: { name: string } | null;
  store: { name: string } | null;
  _count: { items: number };
}

export default function SalesListPage() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (status) params.set('status', status);
  const { data, loading } = useApi<{ items: Invoice[]; total: number }>(`/api/sales/invoices?${params.toString()}&limit=100`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">🛒 فواتير المبيعات</h1>
        <Link href="/sales/new" className="btn-primary">+ فاتورة جديدة</Link>
      </div>

      <div className="card flex flex-wrap gap-2">
        <select className="input-field text-sm w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">كل الأنواع</option>
          <option value="عادية">عادية</option>
          <option value="ضريبية">ضريبية</option>
          <option value="عرض سعر">عرض سعر</option>
        </select>
        <select className="input-field text-sm w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="مكتملة">مكتملة</option>
          <option value="قيد التنفيذ">قيد التنفيذ</option>
          <option value="ملغاة">ملغاة</option>
        </select>
        <div className="text-sm text-gray-500 mr-auto">{data?.total} فاتورة</div>
      </div>

      {loading ? (
        <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">رقم</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">المخزن</th>
                <th className="p-3 text-right">الأصناف</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(inv => (
                <tr key={inv.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold">#{inv.invoice_number}</td>
                  <td className="p-3 text-xs">{formatDate(inv.invoice_date)}</td>
                  <td className="p-3 text-xs">{inv.invoice_type}</td>
                  <td className="p-3">{inv.customer?.name || '—'}</td>
                  <td className="p-3 text-xs">{inv.store?.name || '—'}</td>
                  <td className="p-3 text-center">{inv._count.items}</td>
                  <td className="p-3 font-bold text-nazlawy-600">{formatEGP(inv.total)}</td>
                  <td className="p-3"><span className={`badge ${statusColor(inv.status)}`}>{inv.status}</span></td>
                  <td className="p-3"><Link href={`/print/invoice/${inv.id}`} className="text-nazlawy-600 underline text-xs">🖨️ طباعة</Link></td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={9} className="p-12 text-center text-gray-400">لا توجد فواتير</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
