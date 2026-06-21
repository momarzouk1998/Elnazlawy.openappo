"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/format";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const [{ data: o }, { data: m }, { data: c }, { data: e }] = await Promise.all([
        supabase.from("mazaya_orders").select("*, mazaya_customers(name, phone, address), mazaya_branches(name)").eq("id", id).single(),
        supabase.from("mazaya_order_materials").select("*, mazaya_boards_inventory(item_name, code), mazaya_accessories_inventory(item_name, code)").eq("order_id", id),
        supabase.from("mazaya_order_costs").select("*").eq("order_id", id).maybeSingle(),
        supabase.from("mazaya_order_external_work").select("*, mazaya_contractors(name)").eq("order_id", id),
      ]);
      setData({ order: o, materials: m, costs: c, external: e });
      setLoading(false);
    })();
  }, [id, router]);

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!data?.order) return <div className="p-8 text-center">الأوردر غير موجود</div>;

  const { order, materials, costs, external } = data;
  const boardsCost = materials?.filter((m: any) => m.board_id).reduce((s: number, m: any) => s + m.line_total, 0) || 0;
  const accCost = materials?.filter((m: any) => m.accessory_id).reduce((s: number, m: any) => s + m.line_total, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white">
      <div className="max-w-3xl mx-auto bg-white shadow-lg print:shadow-none rounded-2xl p-8 print:p-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-brand-orange pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-black">مصنع مزايا</h1>
            <p className="text-sm text-gray-500">Mazaya Furniture Factory</p>
            <p className="text-xs text-gray-400 mt-1">دمياط - مصر</p>
          </div>
          <div className="text-left">
            <div className="text-2xl font-bold text-brand-orange">فاتورة أوردر</div>
            <div className="text-sm text-gray-500 mt-1">رقم: #{order.id}</div>
            <div className="text-sm text-gray-500">{formatDate(order.start_date)}</div>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-xs text-gray-500 uppercase">العميل</div>
            <div className="font-bold">{order.mazaya_customers?.name || "—"}</div>
            {order.mazaya_customers?.phone && <div className="text-sm text-gray-600">📞 {order.mazaya_customers.phone}</div>}
            {order.mazaya_customers?.address && <div className="text-sm text-gray-600">📍 {order.mazaya_customers.address}</div>}
          </div>
          <div className="text-left">
            <div className="text-xs text-gray-500 uppercase">المعرض</div>
            <div className="font-bold">{order.mazaya_branches?.name || "—"}</div>
            <div className="text-sm text-gray-600 mt-2">{ORDER_TYPE_LABELS[order.order_type]} • {STATUS_LABELS[order.status]}</div>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-xl font-extrabold text-brand-black">أوردر: {order.order_name}</div>
          {order.notes && <div className="text-sm text-gray-500 mt-2">{order.notes}</div>}
        </div>

        {/* Materials */}
        <h3 className="font-bold text-lg mb-3 border-b pb-2">المواد المستخدمة</h3>
        <table className="w-full text-sm mb-6">
          <thead><tr className="bg-gray-100">
            <th className="p-2 text-right">الصنف</th>
            <th className="p-2 text-right">الكود</th>
            <th className="p-2 text-center">الكمية</th>
            <th className="p-2 text-left">السعر</th>
            <th className="p-2 text-left">الإجمالي</th>
          </tr></thead>
          <tbody>
            {(materials ?? []).map((m: any) => (
              <tr key={m.id} className="border-b">
                <td className="p-2">{m.mazaya_boards_inventory?.item_name || m.mazaya_accessories_inventory?.item_name}</td>
                <td className="p-2"><code className="text-xs">{m.mazaya_boards_inventory?.code || m.mazaya_accessories_inventory?.code}</code></td>
                <td className="p-2 text-center">{m.quantity_used}</td>
                <td className="p-2 text-left">{formatCurrency(m.unit_price_snapshot)}</td>
                <td className="p-2 text-left font-bold">{formatCurrency(m.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Costs */}
        <h3 className="font-bold text-lg mb-3 border-b pb-2">التكاليف</h3>
        <div className="space-y-2 text-sm mb-6">
          <div className="flex justify-between"><span>تكلفة الألواح:</span><strong>{formatCurrency(boardsCost)}</strong></div>
          <div className="flex justify-between"><span>تكلفة الاكسسوارات:</span><strong>{formatCurrency(accCost)}</strong></div>
          <div className="flex justify-between"><span>تكلفة التركيبات:</span><strong>{formatCurrency(costs?.installation_cost)}</strong></div>
          {costs?.installation_travel_days > 0 && <div className="flex justify-between text-gray-500"><span>أيام سفر التركيب:</span><span>{costs.installation_travel_days} يوم</span></div>}
          <div className="flex justify-between"><span>نقل داخلي:</span><strong>{formatCurrency(costs?.internal_transport_cost)}</strong></div>
          <div className="flex justify-between"><span>نقل خارجي:</span><strong>{formatCurrency(costs?.external_transport_cost)}</strong></div>
          <div className="flex justify-between"><span>عمولة المصنع:</span><strong>{formatCurrency(costs?.factory_commission)}</strong></div>
        </div>

        <div className="bg-gradient-to-l from-brand-orange to-brand-orange-dark text-white p-4 rounded-xl flex items-center justify-between">
          <span className="font-bold">الإجمالي الكلي</span>
          <span className="text-2xl font-extrabold">{formatCurrency(costs?.order_total)}</span>
        </div>

        {external && external.length > 0 && (
          <>
            <h3 className="font-bold text-lg mt-6 mb-3 border-b pb-2">أعمال خارجية (تتبع فقط)</h3>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-100">
                <th className="p-2 text-right">النوع</th>
                <th className="p-2 text-right">المقاول</th>
                <th className="p-2 text-left">القيمة</th>
              </tr></thead>
              <tbody>
                {external.map((e: any) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-2">{e.work_type}</td>
                    <td className="p-2">{e.mazaya_contractors?.name}</td>
                    <td className="p-2 text-left">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
          <p>مصنع مزايا للأثاث - Mazaya Furniture Factory</p>
          <p>تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}</p>
        </div>

        <div className="mt-6 flex gap-2 justify-center print:hidden">
          <button onClick={() => window.print()} className="btn-primary">🖨️ طباعة</button>
          <button onClick={() => router.back()} className="btn-secondary">رجوع</button>
        </div>
      </div>
    </div>
  );
}
