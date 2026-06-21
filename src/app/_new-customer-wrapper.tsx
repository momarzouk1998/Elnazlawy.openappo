"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NewEntityForm from "@/app/_new-entity-form";

export default function NewCustomerWrapper() {
  const router = useRouter();
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: b } = await supabase.from("mazaya_branches").select("id, name").order("name");
      setBranches((b ?? []).map(x => ({ value: String(x.id), label: x.name })));
    })();
  }, [router]);
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
