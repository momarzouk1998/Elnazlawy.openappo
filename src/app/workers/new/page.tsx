"use client";
import NewEntityForm from "@/app/_new-entity-form";

export default function NewWorkerPage() {
  return (
    <NewEntityForm
      title="عامل جديد"
      backHref="/workers"
      table="mazaya_workers"
      fields={[
        { name: "name", label: "اسم العامل", required: true },
        { name: "phone", label: "رقم التواصل" },
        { name: "notes", label: "ملاحظات", rows: 3 },
      ]}
    />
  );
}
