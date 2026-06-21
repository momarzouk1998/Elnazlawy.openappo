// API route للتحقق من إعدادات Supabase (للتشخيص فقط)
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Build preview info WITHOUT leaking the keys themselves
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
      NEXT_PUBLIC_SUPABASE_URL: {
        set: !!url,
        valid_format: url_valid,
        preview: url_preview,
        length: url?.length ?? 0,
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        set: !!anonKey,
        valid_format: key_valid,
        preview: key_preview,
        length: anonKey?.length ?? 0,
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        set: !!serviceKey,
        preview: skey_preview,
        length: serviceKey?.length ?? 0,
      },
    },
    supabase_reachable: false,
    tests: [] as any[],
  };

  if (!url || !anonKey) {
    info.error = "Missing env vars — Redeploy after adding them!";
    return NextResponse.json(info, { status: 500 });
  }
  if (!url_valid) {
    info.error = `URL doesn't look right: ${url_preview}. Should be https://xxxxx.supabase.co`;
    return NextResponse.json(info, { status: 500 });
  }
  if (!key_valid) {
    info.error = `Anon key doesn't look like a JWT (should start with eyJ, length > 100)`;
    return NextResponse.json(info, { status: 500 });
  }

  try {
    const supabase = await createClient();

    // Test 1: connection
    const t1 = await supabase.from("mazaya_suppliers").select("*", { count: "exact", head: true });
    info.tests.push({ name: "SELECT from mazaya_suppliers", ok: !t1.error, error: t1.error?.message, count: t1.count });
    if (!t1.error) info.supabase_reachable = true;

    // Test 2: list auth users (using service role)
    if (serviceKey) {
      const adminClient = createAdminClient();
      const { data: users, error: uErr } = await adminClient.auth.admin.listUsers({ perPage: 10 });
      info.tests.push({
        name: "Auth admin.listUsers",
        ok: !uErr,
        error: uErr?.message,
        users_count: users?.users?.length ?? 0,
        user_emails: users?.users?.map((u: any) => u.email) ?? [],
      });
    }
  } catch (e: any) {
    info.error = e?.message || String(e);
  }

  return NextResponse.json(info);
}
