"use client";
import { useState, useMemo } from "react";
import { useUserStore } from "@/store/user-store";
import { useApi } from "@/hooks/useApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { formatCurrency } from "@/lib/format";

export default function BudgetPage() {
  const { user: profile } = useUserStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const { data, loading } = useApi<any>(`/api/budget?month=${monthStr}`);
  const b = data?.ok ? data.data : null;

  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];

  const years = useMemo(() => {
    const y: number[] = [];
    for (let i = now.getFullYear() - 2; i <= now.getFullYear() + 1; i++) y.push(i);
    return y;
  }, []);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  if (!profile) return null;

  const n = (v: number | undefined) => Number(v ?? 0);

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="الميزانية"
        subtitle="ملخص مالي شامل للشهر — الوارد، المصروف، الأوردرات، المخزون"
        helpTitle="الميزانية"
        helpDescription="هنا تشوف ميزانية الشهر بالكامل: دخل إيه، صرف إيه (مشتريات + نثريات + دفعات موردين)، أوردرات طلعت بقيمتها، والمخزن الحالي. اختار الشهر من الأعلى."
        backHref="/journal"
      />

      {/* ===== اختيار الشهر ===== */}
      <div className="card mb-4">
        <div className="flex items-center justify-center gap-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-xl">➡️</button>
          <div className="flex items-center gap-3">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 border rounded-lg bg-white font-bold">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-2 border rounded-lg bg-white font-bold">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-xl">⬅️</button>
        </div>
        {b && <div className="text-center text-sm text-gray-500 mt-2">{b.monthLabel}</div>}
      </div>

      {loading && !b && (
        <div className="card text-center text-gray-400 py-12">⏳ جاري تحميل بيانات الميزانية...</div>
      )}

      {b && (
        <>
          {/* ===== ملخص الدخل والمصروف (الكاردات الكبيرة) ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <div className="text-xs opacity-90">📥 إجمالي الوارد</div>
              <div className="text-2xl font-extrabold">{formatCurrency(n(b.income))}</div>
              <div className="text-[10px] opacity-70 mt-1">تحويلات من المعارض</div>
            </div>
            <div className="card bg-gradient-to-br from-red-400 to-red-600 text-white">
              <div className="text-xs opacity-90">📤 إجمالي المصروف</div>
              <div className="text-2xl font-extrabold">{formatCurrency(n(b.purchases))}</div>
              <div className="text-[10px] opacity-70 mt-1">مشتريات + نثريات</div>
            </div>
            <div className="card bg-gradient-to-br from-orange-400 to-orange-600 text-white">
              <div className="text-xs opacity-90">💸 دفوع للموردين</div>
              <div className="text-2xl font-extrabold">{formatCurrency(n(b.payouts))}</div>
              <div className="text-[10px] opacity-70 mt-1">تحويلات صادرة</div>
            </div>
            <div className={`card bg-gradient-to-br ${n(b.netCash) >= 0 ? "from-blue-500 to-blue-700" : "from-red-500 to-red-700"} text-white`}>
              <div className="text-xs opacity-90">💰 صافي الشهر (نقدي)</div>
              <div className="text-2xl font-extrabold">{formatCurrency(n(b.netCash))}</div>
              <div className="text-[10px] opacity-70 mt-1">الوارد − المصروف − الدفوع</div>
            </div>
          </div>

          {/* ===== تفصيل المصروفات ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="card border-2 border-red-200">
              <h3 className="font-bold text-red-700 mb-3 text-sm">📤 تفصيل المصروفات</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-700">🪵 مشتريات ألواح وإكسسوارات</span>
                  <span className="font-bold text-red-600">{formatCurrency(n(b.boardsPurchases))}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-700">💵 نثريات (أجور، كهرباء، شحن...)</span>
                  <span className="font-bold text-red-600">{formatCurrency(n(b.overheadOnly))}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                  <span className="text-sm text-gray-700">🏭 دفوع للموردين</span>
                  <span className="font-bold text-orange-600">{formatCurrency(n(b.payouts))}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-100 rounded-lg border-t">
                  <span className="font-bold text-gray-800">إجمالي المصروفات</span>
                  <span className="font-extrabold text-red-700 text-lg">{formatCurrency(n(b.purchases) + n(b.payouts))}</span>
                </div>
              </div>
            </div>

            {/* ===== الأوردرات ===== */}
            <div className="card border-2 border-blue-200">
              <h3 className="font-bold text-blue-700 mb-3 text-sm">📦 الأوردرات ({b.totalOrders} أوردر في الشهر)</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-700">✅ أوردرات مكتملة</span>
                  <span className="font-bold text-blue-600">{b.completedOrdersCount}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-yellow-50 rounded-lg">
                  <span className="text-sm text-gray-700">⏳ أوردرات مفتوحة / قيد التنفيذ</span>
                  <span className="font-bold text-yellow-600">{b.openOrdersCount}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-700">💰 إجمالي قيمة الأوردرات المكتملة</span>
                  <span className="font-bold text-green-600">{formatCurrency(n(b.completedOrderTotal))}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-100 rounded-lg">
                  <span className="text-sm text-gray-700">💰 قيمة الأوردرات المفتوحة</span>
                  <span className="font-bold text-gray-600">{formatCurrency(n(b.openOrderTotal))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== تكلفة الأوردرات المكتملة ===== */}
          <div className="card border-2 border-amber-200 mb-6">
            <h3 className="font-bold text-amber-700 mb-3 text-sm">🔧 تفصيل تكلفة الأوردرات المكتملة (ما صرفه المصنع فعلاً)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500">تكلفة الألواح</div>
                <div className="font-bold text-amber-700">{formatCurrency(n(b.completedBoardsCost))}</div>
              </div>
              <div className="bg-violet-50 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500">تكلفة الإكسسوارات</div>
                <div className="font-bold text-violet-700">{formatCurrency(n(b.completedAccessoriesCost))}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500">تركيب + نقل داخلي</div>
                <div className="font-bold text-blue-700">{formatCurrency(n(b.completedInstallCost) + n(b.completedIntTransport))}</div>
              </div>
              <div className="bg-pink-50 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500">نقل خارجي + عمولة</div>
                <div className="font-bold text-pink-700">{formatCurrency(n(b.completedExtTransport) + n(b.completedCommission))}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-gray-100 rounded-lg p-3 text-center border">
                <div className="text-xs text-gray-500">إجمالي تكلفة الأوردرات المكتملة</div>
                <div className="font-extrabold text-red-700 text-lg">{formatCurrency(n(b.totalOrderCost))}</div>
              </div>
              <div className={`rounded-lg p-3 text-center border-2 ${n(b.grossProfit) >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                <div className={`text-xs ${n(b.grossProfit) >= 0 ? "text-green-600" : "text-red-600"}`}>ربح الأوردرات المكتملة (إجمالي − تكلفة)</div>
                <div className={`font-extrabold text-lg ${n(b.grossProfit) >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(n(b.grossProfit))}</div>
              </div>
            </div>
          </div>

          {/* ===== المخزون الحالي ===== */}
          <div className="card border-2 border-purple-200 mb-6">
            <h3 className="font-bold text-purple-700 mb-3 text-sm">📦 المخزون الحالي</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500">قيمة المخزون</div>
                <div className="font-extrabold text-purple-700 text-lg">{formatCurrency(n(b.inventoryValue))}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500">عدد الأصناف</div>
                <div className="font-bold text-purple-700 text-lg">{b.totalItems}</div>
              </div>
              <div className={`rounded-lg p-3 text-center border-2 ${n(b.overallNet) >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                <div className={`text-xs ${n(b.overallNet) >= 0 ? "text-green-600" : "text-red-600"}`}>📊 صافي الشهر الإجمالي</div>
                <div className={`font-extrabold text-lg ${n(b.overallNet) >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(n(b.overallNet))}</div>
                <div className="text-[10px] text-gray-400">الوارد − كل المصروفات</div>
              </div>
            </div>
          </div>

          {/* ===== ملخص نهائي ===== */}
          <div className="card border-2 border-brand-orange/30">
            <h3 className="font-bold text-brand-orange mb-3">📋 ملخص ميزانية الشهر</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-right">البند</th>
                    <th className="px-4 py-2 text-right">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="bg-green-50">
                    <td className="px-4 py-3 font-medium">📥 إجمالي الوارد (تحويلات من المعارض)</td>
                    <td className="px-4 py-3 font-bold text-green-700">{formatCurrency(n(b.income))}</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-4 py-3 font-medium">📤 مشتريات ألواح وإكسسوارات</td>
                    <td className="px-4 py-3 font-bold text-red-600">− {formatCurrency(n(b.boardsPurchases))}</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-4 py-3 font-medium">💵 نثريات (أجور، كهرباء، شحن...)</td>
                    <td className="px-4 py-3 font-bold text-red-600">− {formatCurrency(n(b.overheadOnly))}</td>
                  </tr>
                  <tr className="bg-orange-50">
                    <td className="px-4 py-3 font-medium">🏭 دفوع للموردين</td>
                    <td className="px-4 py-3 font-bold text-orange-600">− {formatCurrency(n(b.payouts))}</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3">💰 صافي الشهر (نقدي)</td>
                    <td className={`px-4 py-3 text-lg ${n(b.netCash) >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(n(b.netCash))}</td>
                  </tr>
                  <tr className="border-t-2 border-dashed">
                    <td className="px-4 py-3 text-gray-500" colSpan={2}></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">📦 أوردرات مكتملة: {b.completedOrdersCount}</td>
                    <td className="px-4 py-2 font-bold">{formatCurrency(n(b.completedOrderTotal))}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-gray-600 text-xs">→ تكلفة المصنع (ألواح + إكسسوارات + تركيب + نقل)</td>
                    <td className="px-4 py-2 font-medium text-red-500 text-xs">− {formatCurrency(n(b.totalOrderCost))}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">🔧 ربح الأوردرات المكتملة</td>
                    <td className={`px-4 py-2 font-bold ${n(b.grossProfit) >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(n(b.grossProfit))}</td>
                  </tr>
                  <tr className="border-t-2 border-dashed">
                    <td className="px-4 py-2 text-gray-500" colSpan={2}></td>
                  </tr>
                  <tr className="bg-purple-50">
                    <td className="px-4 py-3 font-medium">📦 قيمة المخزون الحالي</td>
                    <td className="px-4 py-3 font-bold text-purple-700">{formatCurrency(n(b.inventoryValue))}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-gray-500 text-xs">عدد الأصناف</td>
                    <td className="px-4 py-2 text-xs">{b.totalItems} صنف</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
