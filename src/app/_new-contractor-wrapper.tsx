"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NewEntityForm from "@/app/_new-entity-form";

export default function NewContractorWrapper() {
  const router = useRouter();
  const [types, setTypes] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: ml } = await supabase.from("mazaya_lookup_lists").select("value").eq("list_key", "external_work_type").eq("is_active", true).order("sort_order");
      setTypes((ml ?? []).map((m: any) => ({ value: m.value, label: m.value })));
    })();
  }, [router]);
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
