"use client";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { formatEGP, formatDate } from "@/lib/format";

interface Customer { id: string; name: string; balance: number; }
interface Supplier { id: string; name: string; balance: number; }
interface CustomerPayment { id: string; payment_date: string; amount: number; payment_method: string; notes: string | null; }
interface SupplierPayment { id: string; payment_date: string; amount: number; payment_method: string; notes: string | null; }

export default function StatementsPage() {
  const [type, setType] = useState<"customer" | "supplier">("customer");
  const [partyId, setPartyId] = useState("");

  const partiesApi = useApi<{ items: (Customer | Supplier)[] }>(type === "customer" ? "/api/customers?limit=9999" : "/api/suppliers?limit=9999");

  const parties = partiesApi.data?.items || [];
  const selected = parties.find(p => p.id === partyId) as (Customer | Supplier) | undefined;

  // payments للطرف المحدد
  const paymentsApi = useApi<{ items: (CustomerPayment | SupplierPayment)[] }>(
    partyId ? (type === "customer" ? `/api/payments/customers?customer_id=${partyId}&limit=9999` : `/api/payments/suppliers?supplier_id=${partyId}&limit=9999`) : null
  );

  const payments = paymentsApi.data?.items || [];
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">📋 كشوف الحسابات</h1>
        <p className="text-sm text-gray-500">كشف حساب عميل أو مورد</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={() => { setType("customer"); setPartyId(""); }} className={`flex-1 py-2 rounded-lg font-semibold ${type === "customer" ? "bg-nazlawy-500 text-white" : "bg-gray-100"}`}>👥 عميل</button>
          <button onClick={() => { setType("supplier"); setPartyId(""); }} className={`flex-1 py-2 rounded-lg font-semibold ${type === "supplier" ? "bg-nazlawy-500 text-white" : "bg-gray-100"}`}>🏭 مورد</button>
        </div>
        <select className="input-field" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
          <option value="">اختر {type === "customer" ? "عميل" : "مورد"}...</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name} — رصيد: {formatEGP(p.balance)}</option>)}
        </select>
      </div>

      {selected && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-sm text-gray-500">{type === "customer" ? "رصيد مدين (له علينا)" : "مستحقات (لنا عليه)"}</div>
              <div className={`text-2xl font-bold ${Number(selected.balance) > 0 ? "text-red-700" : "text-green-700"}`}>{formatEGP(selected.balance)}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-gray-500">إجمالي المدفوعات</div>
              <div className="text-2xl font-bold text-blue-700">{formatEGP(totalPaid)}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-gray-500">عدد الحركات</div>
              <div className="text-2xl font-bold text-slate-650">{payments.length}</div>
            </div>
          </div>

          {/* Statement table */}
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">التاريخ</th>
                  <th className="p-3 text-right">البيان</th>
                  <th className="p-3 text-right">طريقة الدفع</th>
                  <th className="p-3 text-right">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-xs">{formatDate(p.payment_date)}</td>
                    <td className="p-3">{p.notes || (type === "customer" ? "تحصيل من عميل" : "سداد لمورد")}</td>
                    <td className="p-3 text-xs">{p.payment_method}</td>
                    <td className="p-3 font-mono font-bold text-green-700">{formatEGP(p.amount)}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-gray-400">لا توجد حركات</td></tr>}
              </tbody>
              {payments.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={3} className="p-3 text-left">الإجمالي:</td>
                    <td className="p-3 font-mono">{formatEGP(totalPaid)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
