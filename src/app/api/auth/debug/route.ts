// API route للتحقق من إعدادات Supabase (للتشخيص فقط)
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const url_preview = url ? `${url.substring(0, 30)}...${url.substring(url.length - 10)}` : null;
  const key_preview = anonKey ? `${anonKey.substring(0, 25)}...${anonKey.substring(anonKey.length - 8)}` : null;
  const skey_preview = serviceKey ? `${serviceKey.substring(0, 25)}...${serviceKey.substring(serviceKey.length - 8)}` : null;

  const url_valid = !!url && (url.startsWith("https://") && url.includes(".supabase.co"));
  const key_valid = !!anonKey && anonKey.startsWith("eyJ") && anonKey.length > 100;

  const info: any = {
    timestamp: new Date().toISOString(),
    deployment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    vercel_url: process.env.VERCEL_URL || null,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: { set: !!url, valid_format: url_valid, preview: url_preview, length: url?.length ?? 0 },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: { set: !!anonKey, valid_format: key_valid, preview: key_preview, length: anonKey?.length ?? 0 },
      SUPABASE_SERVICE_ROLE_KEY: { set: !!serviceKey, preview: skey_preview, length: serviceKey?.length ?? 0 },
    },
    supabase_reachable: false,
    tests: [] as any[],
  };

  if (!url || !anonKey) {
    info.error = "Missing env vars";
    return NextResponse.json(info, { status: 500 });
  }

  try {
    const supabase = await createClient();

    // Test 1: query each known table to see which ones exist
    const tables = [
      "mazaya_suppliers", "mazaya_branches", "mazaya_customers", "mazaya_orders",
      "mazaya_boards_inventory", "mazaya_accessories_inventory", "mazaya_order_materials",
      "mazaya_order_costs", "mazaya_contractors", "mazaya_order_external_work",
      "mazaya_journal_entries", "mazaya_overhead_expenses", "mazaya_users",
      "mazaya_lookup_lists"
    ];
    for (const t of tables) {
      const r = await supabase.from(t).select("*", { count: "exact", head: true });
      info.tests.push({ table: t, exists: !r.error || !r.error.message.includes("does not exist"), error: r.error?.message, count: r.count });
    }
    info.supabase_reachable = true;

    // Test 2: list users
    if (serviceKey) {
      const adminClient = createAdminClient();
      const { data: users, error: uErr } = await adminClient.auth.admin.listUsers({ perPage: 20 });
      info.auth_users = { ok: !uErr, error: uErr?.message, count: users?.users?.length ?? 0, emails: users?.users?.map((u: any) => u.email) ?? [] };
    }

    // Test 3: try to find the admin profile
    const { data: profiles, error: pErr } = await supabase.from("mazaya_users").select("id, username, email_or_phone, role, auth_id").limit(10);
    info.profiles = { ok: !pErr, error: pErr?.message, count: profiles?.length ?? 0, data: profiles };
  } catch (e: any) {
    info.error = e?.message || String(e);
  }

  return NextResponse.json(info);
}
