"use client";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { formatEGP } from "@/lib/format";

interface Customer { balance: number; }
interface Supplier { balance: number; }
interface CustomerPayment { amount: number; }
interface SupplierPayment { amount: number; }
interface Expense { amount: number; }
interface SalesInvoice { total: number; net_profit: number; }

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stats, setStats] = useState<{
    customerDebt: number; supplierDebt: number; totalSales: number;
    totalProfit: number; totalCollections: number; totalPayments: number; totalExpenses: number;
    netCash: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const qs = from && to ? `?from=${from}&to=${to}` : "";
      const [cust, sup, cp, sp, ex, sales] = await Promise.all([
        fetch("/api/customers?limit=9999").then(r => r.json()),
        fetch("/api/suppliers?limit=9999").then(r => r.json()),
        fetch(`/api/payments/customers${qs}&limit=9999`).then(r => r.json()),
        fetch(`/api/payments/suppliers${qs}&limit=9999`).then(r => r.json()),
        fetch(`/api/expenses${qs}&limit=9999`).then(r => r.json()),
        fetch(`/api/sales/invoices?status=مكتملة&limit=9999`).then(r => r.json()),
      ]);

      const customerDebt = (cust.data?.items || []).reduce((s: number, c: Customer) => s + Number(c.balance), 0);
      const supplierDebt = (sup.data?.items || []).reduce((s: number, c: Supplier) => s + Number(c.balance), 0);
      const totalCollections = (cp.data?.items || []).reduce((s: number, p: CustomerPayment) => s + Number(p.amount), 0);
      const totalPayments = (sp.data?.items || []).reduce((s: number, p: SupplierPayment) => s + Number(p.amount), 0);
      const totalExpenses = (ex.data?.items || []).reduce((s: number, e: Expense) => s + Number(e.amount), 0);
      const totalSales = (sales.data?.items || []).reduce((s: number, i: SalesInvoice) => s + Number(i.total), 0);
      const totalProfit = (sales.data?.items || []).reduce((s: number, i: SalesInvoice) => s + Number(i.net_profit), 0);

      setStats({
        customerDebt, supplierDebt, totalSales, totalProfit,
        totalCollections, totalPayments, totalExpenses,
        netCash: totalCollections - totalPayments - totalExpenses,
      });
    } catch (e: any) {
      setError(e?.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  useState(() => { load(); });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">📈 التقارير</h1>
        <p className="text-sm text-gray-500">ملخص مالي شامل</p>
      </div>

      {/* Date filter */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">من تاريخ</label>
          <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">إلى تاريخ</label>
          <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} disabled={loading} className="btn-primary">{loading ? "⏳" : "🔄 تحديث"}</button>
        {(from || to) && <button onClick={() => { setFrom(""); setTo(""); }} className="btn-secondary">مسح الفلتر</button>}
      </div>

      {error && <div className="card p-4 text-red-700 bg-red-50">❌ {error}</div>}

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحليل...</div> : stats && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="💰 إجمالي المبيعات" value={stats.totalSales} color="text-blue-700" />
            <StatCard label="📈 صافي الأرباح" value={stats.totalProfit} color="text-green-700" />
            <StatCard label="💵 تحصيلات العملاء" value={stats.totalCollections} color="text-green-700" />
            <StatCard label="💸 مدفوعات الموردين" value={stats.totalPayments} color="text-red-700" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="📉 المصروفات" value={stats.totalExpenses} color="text-red-700" />
            <StatCard label="🏦 صافي التدفق النقدي" value={stats.netCash} color={stats.netCash >= 0 ? "text-green-700" : "text-red-700"} />
            <StatCard label="👥 ديون العملاء (علينا)" value={stats.customerDebt} color="text-orange-700" />
            <StatCard label="🏭 مستحقات الموردين" value={stats.supplierDebt} color="text-orange-700" />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{formatEGP(value)}</div>
      <div className="text-xs text-gray-400 mt-1">جنيه</div>
    </div>
  );
}
