"use client";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import NewEntityForm from "@/app/_new-entity-form";

export default function NewContractorWrapper() {
  const router = useRouter();
  const { data: typesData } = useApi<{ items: any[] }>('/api/material-types?list_key=external_work_type');
  const types = (typesData?.items ?? []).map((m: any) => ({ value: m.value, label: m.value }));
  return (
    <NewEntityForm
      title="مقاول خارجي جديد"
      backHref="/contractors"
      table="mazaya_contractors"
      fields={[
        { name: "name", label: "اسم المقاول / الورشة", required: true },
        { name: "type", label: "النوع", select: types },
        { name: "phone", label: "رقم التواصل" },
        { name: "notes", label: "ملاحظات", rows: 3 },
      ]}
    />
  );
}
