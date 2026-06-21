"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { exportToExcel } from "@/lib/excel";
import { formatCurrency } from "@/lib/format";

type ReportType = "inventory" | "orders" | "cashflow" | "suppliers" | "overhead";

export default function ReportsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [type, setType] = useState<ReportType>("inventory");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: prof } = await supabase.from("mazaya_users").select("*").eq("auth_id", user.id).single();
      setProfile(prof);
    })();
  }, [router]);

  async function generate() {
    setLoading(true);
    const supabase = createClient();
    let result: any[] = [];
    if (type === "inventory") {
      const [{ data: b }, { data: a }] = await Promise.all([
        supabase.from("mazaya_boards_inventory").select("*, mazaya_suppliers(name)"),
        supabase.from("mazaya_accessories_inventory").select("*, mazaya_suppliers(name)"),
      ]);
      result = [
        ...((b ?? []).map((x: any) => ({ الفئة: "لوح", الاسم: x.item_name, الكود: x.code, المورد: x.mazaya_suppliers?.name ?? "", "سعر الوحدة": x.unit_price, الداخل: x.quantity_in, المستخدم: x.quantity_used, المتبقي: x.quantity_remaining, "قيمة المتبقي": x.unit_price * x.quantity_remaining }))),
        ...((a ?? []).map((x: any) => ({ الفئة: "اكسسوار", الاسم: x.item_name, الكود: x.code, المورد: x.mazaya_suppliers?.name ?? "", "سعر الوحدة": x.unit_price, الداخل: x.quantity_in, المستخدم: x.quantity_used, المتبقي: x.quantity_remaining, "قيمة المتبقي": x.unit_price * x.quantity_remaining }))),
      ];
    } else if (type === "orders") {
      let q = supabase.from("mazaya_orders").select("*, mazaya_customers(name), mazaya_branches(name), mazaya_order_costs(*)").order("start_date", { ascending: false });
      if (fromDate) q = q.gte("start_date", fromDate);
      if (toDate) q = q.lte("start_date", toDate);
      const { data: o } = await q;
      result = (o ?? []).map((x: any) => ({
        "اسم الأوردر": x.order_name, العميل: x.mazaya_customers?.name ?? "", المعرض: x.mazaya_branches?.name ?? "",
        الحالة: x.status, "تاريخ البدء": x.start_date, "تاريخ الانتهاء": x.end_date, المدة: x.duration_days,
        "تكلفة ألواح": x.mazaya_order_costs?.[0]?.boards_cost ?? 0,
        "تكلفة اكسسوارات": x.mazaya_order_costs?.[0]?.accessories_cost ?? 0,
        تركيبات: x.mazaya_order_costs?.[0]?.installation_cost ?? 0,
        "نقل داخلي": x.mazaya_order_costs?.[0]?.internal_transport_cost ?? 0,
        "نقل خارجي": x.mazaya_order_costs?.[0]?.external_transport_cost ?? 0,
        "عمولة المصنع": x.mazaya_order_costs?.[0]?.factory_commission ?? 0,
        الإجمالي: x.mazaya_order_costs?.[0]?.order_total ?? 0,
      }));
    } else if (type === "cashflow") {
      let q = supabase.from("mazaya_journal_entries").select("*, mazaya_suppliers(name), mazaya_branches(name)").order("entry_date", { ascending: false });
      if (fromDate) q = q.gte("entry_date", fromDate);
      if (toDate) q = q.lte("entry_date", toDate);
      const { data: j } = await q;
      result = (j ?? []).map((x: any) => ({
        التاريخ: x.entry_date, النوع: x.entry_type, البيان: x.description,
        "طريقة الدفع": x.payment_method, المورد: x.mazaya_suppliers?.name ?? "",
        المعرض: x.mazaya_branches?.name ?? "", تمريري: x.is_passthrough ? "نعم" : "لا",
        المبلغ: x.amount,
      }));
    } else if (type === "suppliers") {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("mazaya_suppliers").select("*"),
        supabase.from("mazaya_journal_entries").select("supplier_id, amount").eq("entry_type", "purchase"),
      ]);
      const totals: Record<number, number> = {};
      (p ?? []).forEach((x: any) => { if (x.supplier_id) totals[x.supplier_id] = (totals[x.supplier_id] || 0) + x.amount; });
      result = (s ?? []).map((x: any) => ({ الاسم: x.name, "نوع التعامل": x.payment_type, الهاتف: x.phone ?? "", "إجمالي المشتريات": totals[x.id] || 0 }));
    } else if (type === "overhead") {
      let q = supabase.from("mazaya_overhead_expenses").select("*").order("expense_date", { ascending: false });
      if (fromDate) q = q.gte("expense_date", fromDate);
      if (toDate) q = q.lte("expense_date", toDate);
      const { data: o } = await q;
      result = (o ?? []).map((x: any) => ({ التاريخ: x.expense_date, البيان: x.description, المبلغ: x.amount, ملاحظات: x.notes ?? "" }));
    }
    setData(result);
    setLoading(false);
  }

  if (!profile) return null;

  const total = type === "cashflow" || type === "suppliers" || type === "orders" || type === "overhead"
    ? data.reduce((s, r) => s + (Number(r["المبلغ"] ?? r["الإجمالي"] ?? r["إجمالي المشتريات"] ?? 0)), 0)
    : data.reduce((s, r) => s + (Number(r["قيمة المتبقي"] ?? 0)), 0);

  return (
    <DashboardLayout profile={profile}>
      <PageHeader
        title="التقارير"
        subtitle="استخراج بيانات تفصيلية وتصديرها Excel"
        helpTitle="التقارير"
        helpDescription="اختار نوع التقرير، حدد الفترة (لو التقرير بيحتاج تاريخ)، اضغط 'توليد'، ثم 'تصدير Excel' لتحميله."
        backHref="/dashboard"
      />

      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <select value={type} onChange={e => setType(e.target.value as ReportType)} className="px-3 py-2.5 border rounded-lg bg-white font-medium">
            <option value="inventory">📦 تقرير المخزون</option>
            <option value="orders">📋 تقرير الأوردرات</option>
            <option value="cashflow">💸 التدفق النقدي</option>
            <option value="suppliers">🏭 تقرير الموردين</option>
            <option value="overhead">📄 تقرير النثريات</option>
          </select>
          {type !== "inventory" && (
            <>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2.5 border rounded-lg" placeholder="من" />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2.5 border rounded-lg" placeholder="إلى" />
            </>
          )}
          <Button onClick={generate} loading={loading}>🔍 توليد التقرير</Button>
        </div>
        {data.length > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="text-sm">
              عدد السجلات: <strong>{data.length}</strong>
              <span className="mx-3">|</span>
              الإجمالي: <strong className="text-brand-orange">{formatCurrency(total)}</strong>
            </div>
            <Button variant="secondary" onClick={() => exportToExcel(data, `report_${type}_${new Date().toISOString().slice(0, 10)}`)}>📥 تصدير Excel</Button>
          </div>
        )}
      </div>

      {data.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                {Object.keys(data[0]).map(k => <th key={k} className="px-3 py-2 text-right font-semibold text-xs uppercase">{k}</th>)}
              </tr></thead>
              <tbody className="divide-y">
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.entries(row).map(([k, v]) => (
                      <td key={k} className="px-3 py-2">
                        {typeof v === "number" ? (k.includes("قيمة") || k.includes("إجمالي") || k.includes("المبلغ") || k.includes("تكلفة") || k.includes("تركيبات") || k.includes("نقل") || k.includes("عمولة") ? formatCurrency(v) : v) : String(v ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length > 100 && <div className="p-3 text-center text-gray-400 text-sm bg-gray-50">... و{data.length - 100} سجل آخر. صدّر Excel لعرض الكل.</div>}
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="card text-center text-gray-400 py-12">
          <div className="text-5xl mb-3">📊</div>
          <div>اختر نوع التقرير واضغط "توليد"</div>
        </div>
      )}
    </DashboardLayout>
  );
}
