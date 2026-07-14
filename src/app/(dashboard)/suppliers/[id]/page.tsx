"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatEGP } from "@/lib/format";

interface SupplierDetail {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  opening_balance: number;
  balance: number;
  notes: string | null;
}

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/suppliers/${params.id}`);
        const json = await res.json();
        setSupplier(json?.data ?? null);
      } catch {
        setSupplier(null);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return <div className="card py-12 text-center text-gray-500">⏳ جاري التحميل...</div>;
  }

  if (!supplier) {
    return <div className="space-y-4">
      <button onClick={() => router.back()} className="btn-secondary">↩️ العودة</button>
      <div className="card py-12 text-center text-gray-500">لا توجد بيانات لهذا المورد</div>
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-650">🏭 {supplier.name}</h1>
          <p className="text-sm text-gray-500">تفاصيل المورد</p>
        </div>
        <button onClick={() => router.back()} className="btn-secondary">↩️ العودة</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div>
            <p className="text-sm text-gray-500">الهاتف</p>
            <p className="font-semibold">{supplier.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">العنوان</p>
            <p className="font-semibold">{supplier.address || '—'}</p>
          </div>
        </div>

        <div className="card space-y-3">
          <div>
            <p className="text-sm text-gray-500">الرصيد الافتتاحي</p>
            <p className="font-semibold">{formatEGP(supplier.opening_balance)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">الرصيد الحالي</p>
            <p className="font-semibold">{formatEGP(supplier.balance)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">الملاحظات</p>
            <p className="font-semibold">{supplier.notes || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
