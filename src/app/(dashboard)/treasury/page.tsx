"use client";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { formatEGP } from "@/lib/format";

interface Treasury { id: string; name: string; type: string; current_balance: number; opening_balance: number; assigned_user: { full_name: string } | null; }

export default function TreasuryPage() {
  const [search, setSearch] = useState("");
  const { data, loading } = useApi<Treasury[]>('/api/treasury');

  const filtered = (data || []).filter(t => t.name.includes(search));
  const totalBalance = filtered.reduce((s, t) => s + Number(t.current_balance), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">🏦 الخزائن</h1>
      </div>

      <div className="card">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث باسم الخزينة..." className="input-field" autoFocus />
      </div>

      {/* كاردات إجماليات */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-gray-500">عدد الخزائن</div>
          <div className="text-2xl font-extrabold text-slate-650">{filtered.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">إجمالي الأرصدة</div>
          <div className="text-2xl font-extrabold text-nazlawy-600">{formatEGP(totalBalance)} ج</div>
        </div>
      </div>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(t => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500">{t.type}</div>
                  <div className="font-bold text-lg">{t.name}</div>
                  {t.assigned_user && <div className="text-xs text-gray-600 mt-1">👤 {t.assigned_user.full_name}</div>}
                </div>
                <div className="text-3xl">🏦</div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-500">الرصيد الحالي</div>
                <div className="text-2xl font-extrabold text-nazlawy-600 font-mono">{formatEGP(t.current_balance)} ج</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="card text-center text-gray-400 py-12 col-span-full">لا توجد خزائن</div>}
        </div>
      )}
    </div>
  );
}
