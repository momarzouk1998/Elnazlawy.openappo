"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatEGP } from "@/lib/format";

interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  opening_balance: number;
  balance: number;
  notes: string | null;
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/customers/${params.id}`);
        const json = await res.json();
        setCustomer(json?.data ?? null);
      } catch {
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return <div className="card py-12 text-center text-gray-500">⏳ جاري التحميل...</div>;
  }

  if (!customer) {
    return <div className="space-y-4">
      <button onClick={() => router.back()} className="btn-secondary">↩️ العودة</button>
      <div className="card py-12 text-center text-gray-500">لا توجد بيانات لهذا العميل</div>
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-650">👤 {customer.name}</h1>
          <p className="text-sm text-gray-500">تفاصيل العميل</p>
        </div>
        <button onClick={() => router.back()} className="btn-secondary">↩️ العودة</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div>
            <p className="text-sm text-gray-500">الهاتف</p>
            <p className="font-semibold">{customer.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">واتساب</p>
            <p className="font-semibold">{customer.whatsapp || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">العنوان</p>
            <p className="font-semibold">{customer.address || '—'}</p>
          </div>
        </div>

        <div className="card space-y-3">
          <div>
            <p className="text-sm text-gray-500">الرصيد الافتتاحي</p>
            <p className="font-semibold">{formatEGP(customer.opening_balance)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">الرصيد الحالي</p>
            <p className="font-semibold">{formatEGP(customer.balance)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">الملاحظات</p>
            <p className="font-semibold">{customer.notes || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
