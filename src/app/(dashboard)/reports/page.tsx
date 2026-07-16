"use client";
import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { formatEGP } from "@/lib/format";

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stats, setStats] = useState<{
    customerDebt: number; supplierDebt: number; totalSales: number;
    totalProfit: number; totalCollections: number; totalPayments: number; totalExpenses: number;
    netCash: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setErrors([]);
    try {
      const qs = from && to ? `?from=${from}&to=${to}` : "";
      const responses = await Promise.allSettled([
        fetch("/api/customers?limit=9999").then(r => { if (!r.ok) throw new Error(`Customers API: ${r.status}`); return r.json(); }),
        fetch("/api/suppliers?limit=9999").then(r => { if (!r.ok) throw new Error(`Suppliers API: ${r.status}`); return r.json(); }),
        fetch(`/api/payments/customers${qs}&limit=9999`).then(r => { if (!r.ok) throw new Error(`Customer Payments API: ${r.status}`); return r.json(); }),
        fetch(`/api/payments/suppliers${qs}&limit=9999`).then(r => { if (!r.ok) throw new Error(`Supplier Payments API: ${r.status}`); return r.json(); }),
        fetch(`/api/expenses${qs}&limit=9999`).then(r => { if (!r.ok) throw new Error(`Expenses API: ${r.status}`); return r.json(); }),
        fetch(`/api/sales/invoices?status=مكتملة&limit=9999`).then(r => { if (!r.ok) throw new Error(`Sales API: ${r.status}`); return r.json(); }),
      ]);

      const errs: string[] = [];
      const getData = (idx: number, defaultVal: any = { data: { items: [] } }) => {
        const r = responses[idx];
        if (r.status === 'fulfilled') return r.value;
        errs.push(r.reason?.message || 'خطأ غير معروف');
        return defaultVal;
      };

      const cust = getData(0);
      const sup = getData(1);
      const cp = getData(2);
      const sp = getData(3);
      const ex = getData(4);
      const sales = getData(5);

      const customerDebt = (cust?.data?.items || []).reduce((s: number, c: any) => s + Number(c.balance), 0);
      const supplierDebt = (sup?.data?.items || []).reduce((s: number, c: any) => s + Number(c.balance), 0);
      const totalCollections = (cp?.data?.items || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const totalPayments = (sp?.data?.items || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const totalExpenses = (ex?.data?.items || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const totalSales = (sales?.data?.items || []).reduce((s: number, i: any) => s + Number(i.total), 0);
      const totalProfit = (sales?.data?.items || []).reduce((s: number, i: any) => s + Number(i.net_profit), 0);

      setStats({
        customerDebt,
        supplierDebt,
        totalSales,
        totalProfit,
        totalCollections,
        totalPayments,
        totalExpenses,
        netCash: totalCollections - totalPayments - totalExpenses,
      });
      setErrors(errs);
    } catch (e: any) {
      setErrors([e?.message || "حدث خطأ في تحميل البيانات"]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
        {(from || to) && <button onClick={() => { setFrom(""); setTo(""); setTimeout(load, 0); }} className="btn-secondary">مسح الفلتر</button>}
      </div>

      {errors.length > 0 && (
        <div className="card p-4 text-amber-700 bg-amber-50 border border-amber-200">
          <p className="font-bold mb-1">⚠️ لم نتمكن من تحميل بعض البيانات:</p>
          <ul className="text-sm list-disc list-inside space-y-0.5">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
          <p className="text-xs mt-2 text-amber-600">الأرقام قد تكون غير مكتملة. حاول التحديث لاحقاً.</p>
        </div>
      )}

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
