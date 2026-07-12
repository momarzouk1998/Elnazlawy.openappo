"use client";
import { useApi } from "@/hooks/useApi";
import { formatEGP } from "@/lib/format";

interface Treasury { id: string; name: string; type: string; current_balance: number; opening_balance: number; assigned_user: { full_name: string } | null; }

export default function TreasuryPage() {
  const { data, loading } = useApi<Treasury[]>('/api/treasury');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-650">🏦 الخزائن</h1>

      {loading ? <div className="card text-center py-12 text-gray-500">⏳ جاري التحميل...</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.map(t => (
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
        </div>
      )}
    </div>
  );
}
