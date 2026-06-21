import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Debug-friendly error to surface during development
    throw new Error(
      "Missing Supabase env vars. تأكد من:\n" +
      "  NEXT_PUBLIC_SUPABASE_URL: " + (url ? "✓ set" : "✗ MISSING") + "\n" +
      "  NEXT_PUBLIC_SUPABASE_ANON_KEY: " + (key ? "✓ set" : "✗ MISSING") + "\n\n" +
      "روح Vercel → Project → Settings → Environment Variables\n" +
      "وبعدين Redeploy (مهم جداً — Env vars بتتـ embed في الـ build)."
    );
  }
  return createBrowserClient(url, key);
}
