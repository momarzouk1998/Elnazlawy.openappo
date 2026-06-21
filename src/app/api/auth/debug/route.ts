// API route للتحقق من إعدادات Supabase (للتشخيص فقط)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const info: any = {
    url_set: !!url,
    url_value: url ? `${url.substring(0, 30)}...` : null,
    anon_key_set: !!anonKey,
    anon_key_prefix: anonKey ? `${anonKey.substring(0, 20)}...` : null,
    supabase_reachable: false,
    error: null,
  };

  if (!url || !anonKey) {
    info.error = "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing";
    return NextResponse.json(info, { status: 500 });
  }

  try {
    const supabase = await createClient();
    // اختبار بسيط: نحاول قراءة من جدول موجود
    const { error, count } = await supabase.from("mazaya_suppliers").select("*", { count: "exact", head: true });
    if (error) {
      info.error = error.message;
    } else {
      info.supabase_reachable = true;
      info.suppliers_count = count;
    }
  } catch (e: any) {
    info.error = e?.message || String(e);
  }

  return NextResponse.json(info);
}
