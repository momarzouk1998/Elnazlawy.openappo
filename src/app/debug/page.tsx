"use client";
import { useEffect, useState } from "react";

// صفحة تشخيصية (مش محمية) — تعرض حالة Supabase env vars من جهة الـ client
export default function DebugPage() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    const status = {
      NEXT_PUBLIC_SUPABASE_URL: {
        set: !!url,
        value_preview: url ? `${url.substring(0, 40)}...` : "(empty)",
        ends_with_supabase_co: url.endsWith(".supabase.co"),
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        set: !!key,
        value_preview: key ? `${key.substring(0, 30)}...` : "(empty)",
        looks_like_jwt: key.startsWith("eyJ"),
        length: key.length,
      },
    };

    // Try to actually connect
    fetch("/api/auth/debug")
      .then(r => r.json())
      .then(serverInfo => setInfo({ client_env: status, server_info: serverInfo }))
      .catch(e => setInfo({ client_env: status, error: String(e) }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🔧 تشخيص Supabase</h1>

        {!info ? (
          <p>جاري التحميل...</p>
        ) : (
          <div className="space-y-4">
            <div className="card">
              <h2 className="font-bold mb-2">1. Environment Variables (من الـ Client)</h2>
              <pre className="bg-gray-900 text-green-300 p-4 rounded text-xs overflow-x-auto" dir="ltr">
                {JSON.stringify(info.client_env, null, 2)}
              </pre>
              {(!info.client_env.NEXT_PUBLIC_SUPABASE_URL.set || !info.client_env.NEXT_PUBLIC_SUPABASE_ANON_KEY.set) && (
                <div className="mt-3 bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm">
                  ⚠️ <strong>المتغيرات مش ظاهرة في الـ client bundle</strong>. ده معناه إن الـ env vars اتحطت بعد آخر build. لازم تعمل Redeploy في Vercel.
                </div>
              )}
            </div>

            {info.server_info && (
              <div className="card">
                <h2 className="font-bold mb-2">2. Server Info (من API)</h2>
                <pre className="bg-gray-900 text-green-300 p-4 rounded text-xs overflow-x-auto" dir="ltr">
                  {JSON.stringify(info.server_info, null, 2)}
                </pre>
              </div>
            )}

            {info.error && (
              <div className="card bg-red-50 border-red-300">
                <h2 className="font-bold mb-2 text-red-800">3. Error</h2>
                <pre className="text-xs text-red-700">{info.error}</pre>
              </div>
            )}

            <div className="card bg-blue-50 border-blue-300">
              <h2 className="font-bold mb-2">📋 خطوات الحل</h2>
              <ol className="list-decimal list-inside text-sm space-y-2">
                <li>روح <strong>Vercel Dashboard</strong> → اختار المشروع → <strong>Settings</strong> → <strong>Environment Variables</strong></li>
                <li>تأكد إن الـ 3 متغيرات موجودين: <code className="bg-white px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> + <code className="bg-white px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> + <code className="bg-white px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code></li>
                <li>تأكد إن كل متغير موجود في <strong>Production</strong> + <strong>Preview</strong> + <strong>Development</strong></li>
                <li>روح <strong>Deployments</strong> → اختار آخر deployment → اضغط ⋯ → <strong>Redeploy</strong></li>
                <li>استنى يخلص الـ build، حدّث الصفحة دي</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
