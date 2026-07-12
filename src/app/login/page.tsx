"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("elnazlawy_identifier");
    if (saved) { setIdentifier(saved); setRemember(true); }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("من فضلك أدخل اسم المستخدم وكلمة السر");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(`❌ ${json?.error?.message || "بيانات الدخول غير صحيحة"}`);
        return;
      }
      if (remember) localStorage.setItem("elnazlawy_identifier", identifier);
      else localStorage.removeItem("elnazlawy_identifier");
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
      router.refresh();
    } catch (e: any) {
      setError(`❌ ${e?.message || "حدث خطأ"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid">
      <div className="absolute inset-0 bg-gradient-to-br from-nazlawy-500/10 via-white to-nazlawy-500/5 -z-10" />

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white shadow-lg mb-4 border-2 border-nazlawy-500 p-2">
            <Image src="/elnazlawy-logo.png" alt="النزلاوي" width={88} height={88} className="rounded-xl" priority />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-650">معرض النزلاوي</h1>
          <p className="text-sm text-nazlawy-600 font-medium mt-1">ElNazlawy Showroom</p>
          <p className="text-gray-600 mt-3 text-sm">لتجارة وتوزيع الأجهزة الكهربائية والإضاءة الحديثة</p>
        </div>

        <div className="bg-white rounded-2xl shadow-elevated p-8 border border-gray-100">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                اسم المستخدم أو رقم الهاتف
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="admin أو 01006172668"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nazlawy-500/30 focus:border-nazlawy-500"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة السر</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-nazlawy-500/30 focus:border-nazlawy-500"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-4 h-4 rounded accent-nazlawy-500" />
              <span className="text-sm text-gray-700">تذكر بياناتي</span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-nazlawy-500 hover:bg-nazlawy-600 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (<><span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> جاري الدخول...</>) : "دخول"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              هذا النظام خاص بـ معرض النزلاوي فقط.
              <br />استخدم بيانات دخولك ولا تشاركها مع أحد.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          📍 الفيوم - دلة - {new Date().getFullYear()} ©
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">⏳ جاري التحميل...</div>}>
      <LoginForm />
    </Suspense>
  );
}
