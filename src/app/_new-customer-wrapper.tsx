"use client";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import NewEntityForm from "@/app/_new-entity-form";

export default function NewCustomerWrapper() {
  const router = useRouter();
  const { data: branchesData } = useApi<{ items: any[] }>('/api/branches?limit=500');
  const branches = (branchesData?.items ?? []).map((x: any) => ({ value: String(x.id), label: x.name }));
  return (
    <NewEntityForm
      title="عميل جديد"
      backHref="/customers"
      table="mazaya_customers"
      fields={[
        { name: "name", label: "اسم العميل", required: true },
        { name: "branch_id", label: "المعرض التابع له", select: branches },
        { name: "phone", label: "رقم التواصل" },
        { name: "address", label: "العنوان" },
        { name: "notes", label: "ملاحظات", rows: 3 },
      ]}
    />
  );
}
