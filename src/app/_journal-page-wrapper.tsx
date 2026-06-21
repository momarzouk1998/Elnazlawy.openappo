"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { SearchBox, FilterBar } from "@/components/SearchFilter";
import { Button } from "@/components/ui/Button";
import { exportToExcel } from "@/lib/excel";
import { formatCurrency, formatDate, ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS, PAYMENT_METHOD_LABELS } from "@/lib/format";
import { canSeeModule } from "@/lib/auth";

export default function JournalPageWrapper({ showSummary = false }: { showSummary?: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);
      const { data } = await supabase.from("mazaya_journal_entries").select("*, mazaya_suppliers(name), mazaya_branches(name), mazaya_orders(order_name)").order("entry_date", { ascending: false }).limit(500);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => rows.filter(r => {
    const matchSearch = !search || r.description.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || r.entry_type === typeFilter;
    const matchPay = !payFilter || r.payment_method === payFilter;
    const matchDate = (!fromDate || r.entry_date >= fromDate) && (!toDate || r.entry_date <= toDate);
    return matchSearch && matchType && matchPay && matchDate;
  }), [rows, search, typeFilter, payFilter, fromDate, toDate]);

  // Weekly summary
  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
  const weekRows = filtered.filter(r => new Date(r.entry_date) >= weekStart);
  const weekIncome = weekRows.filter(r => r.entry_type === "income" && !r.is_passthrough).reduce((s, r) => s + r.amount, 0);
  const weekExpense = weekRows.filter(r => ["expense", "purchase", "overhead"].includes(r.entry_type)).reduce((s, r) => s + r.amount, 0);
  const totalIncome = filtered.filter(r => r.entry_type === "income" && !r.is_passthrough).reduce((s, r) => s + r.amount, 0);
  const totalExpense = filtered.filter(r => ["expense", "purchase", "overhead"].includes(r.entry_type)).reduce((s, r) => s + r.amount, 0);

  if (!profile) return null;
  const canSee = canSeeModule(profile, "journal");

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title={showSummary ? "ملخص اليومية" : "اليومية المالية"}
        subtitle={showSummary ? "صندوق الرصيد + ملخص الأسبوع" : `آخر ${filtered.length} حركة`}
        helpTitle={showSummary ? "ملخص اليومية" : "اليومية المالية"}
        helpDescription={showSummary
          ? "ده ملخص أسبوعي وشامل لكل الحركات المالية: الوارد، المصروف، الرصيد. اضغط 'اليومية' للتفاصيل الكاملة."
          : "كل الحركات المالية بتسجل هنا تلقائياً. الإضافات اليدوية (مثل دفعة من معرض) من '+ حركة يومية'."
        }
        backHref="/dashboard"
        actions={canSee ? (
          <>
            <Link href="/journal"><Button variant="secondary">📋 كل الحركات</Button></Link>
            <Link href="/journal/summary"><Button variant="secondary">📊 الملخص</Button></Link>
            <Button onClick={() => router.push("/journal/new")}>+ حركة يومية</Button>
          </>
        ) : null}
      />

      {!canSee ? (
        <div className="card text-center text-gray-500 py-12">🔒 هذه الصفحة للمصنع فقط.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
            <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white"><div className="text-xs opacity-90">الرصيد (الوارد التراكمي)</div><div className="text-xl font-extrabold">{formatCurrency(totalIncome)}</div></div>
            <div className="card bg-gradient-to-br from-red-500 to-orange-600 text-white"><div className="text-xs opacity-90">المصروف التراكمي</div><div className="text-xl font-extrabold">{formatCurrency(totalExpense)}</div></div>
            <div className="card bg-gradient-to-br from-blue-500 to-blue-700 text-white"><div className="text-xs opacity-90">الباقي</div><div className="text-xl font-extrabold">{formatCurrency(totalIncome - totalExpense)}</div></div>
            <div className="card bg-gradient-to-br from-purple-500 to-purple-700 text-white"><div className="text-xs opacity-90">صافي الأسبوع</div><div className="text-xl font-extrabold">{formatCurrency(weekIncome - weekExpense)}</div></div>
          </div>

          <div className="card mb-4">
            <FilterBar>
              <div className="flex-1"><SearchBox value={search} onChange={setSearch} placeholder="ابحث في البيان..." /></div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 border rounded-lg bg-white">
                <option value="">كل الأنواع</option>
                {Object.entries(ENTRY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={payFilter} onChange={e => setPayFilter(e.target.value)} className="px-3 py-2.5 border rounded-lg bg-white">
                <option value="">كل طرق الدفع</option>
                {Object.entries(PAYMENT_METHOD_LABELS).filter(([k]) => k !== "both").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2.5 border rounded-lg" title="من" />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2.5 border rounded-lg" title="إلى" />
              <Button variant="secondary" onClick={() => exportToExcel(filtered as any, "journal")}>📥 تصدير</Button>
            </FilterBar>
          </div>

          {!showSummary && (
            <DataTable
              loading={loading}
              rows={filtered}
              emptyMessage="لا توجد حركات مالية"
              columns={[
                { key: "entry_date", label: "التاريخ", render: r => formatDate(r.entry_date) },
                { key: "entry_type", label: "النوع", render: r => <span className={`badge ${ENTRY_TYPE_COLORS[r.entry_type]}`}>{ENTRY_TYPE_LABELS[r.entry_type]}</span> },
                { key: "description", label: "البيان" },
                { key: "party", label: "الجهة", render: r => r.mazaya_suppliers?.name || r.mazaya_branches?.name || "-" },
                { key: "payment_method", label: "الطريقة", render: r => PAYMENT_METHOD_LABELS[r.payment_method] || "-" },
                { key: "amount", label: "المبلغ", render: r => <span className={`font-bold ${r.entry_type === "income" ? "text-green-600" : "text-red-600"}`}>{formatCurrency(r.amount)}</span> },
              ]}
            />
          )}

          {showSummary && (
            <div className="card overflow-hidden">
              <h3 className="font-bold text-lg mb-3">📅 ملخص آخر 7 أيام</h3>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-100">
                  <th className="p-3 text-right">اليوم</th>
                  <th className="p-3 text-right">الوارد</th>
                  <th className="p-3 text-right">المصروف</th>
                  <th className="p-3 text-right">الصافي</th>
                </tr></thead>
                <tbody>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date(); d.setDate(d.getDate() - (6 - i));
                    const key = d.toISOString().slice(0, 10);
                    const dayRows = weekRows.filter(r => r.entry_date === key);
                    const inc = dayRows.filter(r => r.entry_type === "income" && !r.is_passthrough).reduce((s, r) => s + r.amount, 0);
                    const exp = dayRows.filter(r => ["expense", "purchase", "overhead"].includes(r.entry_type)).reduce((s, r) => s + r.amount, 0);
                    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
                    return (
                      <tr key={key} className="border-b">
                        <td className="p-3">{dayNames[d.getDay()]} <span className="text-gray-400 text-xs">({formatDate(key)})</span></td>
                        <td className="p-3 text-green-700 font-bold">{formatCurrency(inc)}</td>
                        <td className="p-3 text-red-700 font-bold">{formatCurrency(exp)}</td>
                        <td className={`p-3 font-bold ${inc - exp >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(inc - exp)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gradient-to-l from-brand-orange-light to-white font-bold border-t-2 border-brand-orange">
                    <td className="p-3">الإجمالي</td>
                    <td className="p-3 text-green-700">{formatCurrency(weekIncome)}</td>
                    <td className="p-3 text-red-700">{formatCurrency(weekExpense)}</td>
                    <td className={`p-3 ${weekIncome - weekExpense >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(weekIncome - weekExpense)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
