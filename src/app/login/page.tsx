"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("mazaya_identifier");
    if (saved) { setIdentifier(saved); setRemember(true); }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("من فضلك أدخل اسم المستخدم أو البريد/الهاتف وكلمة السر");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      // لو المُدخل مش email (مثلاً username أو phone) بنضيف @mazaya.local
      const isEmail = identifier.includes("@");
      const email = isEmail ? identifier : `${identifier}@mazaya.local`;

      console.log("[login] attempting signInWithPassword for:", email);
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      console.log("[login] result:", { hasUser: !!data?.user, error: err?.message });

      if (err) {
        if (err.message.includes("Invalid login credentials")) {
          setError("❌ البريد/الهاتف أو كلمة السر غير صحيحة");
        } else {
          setError(`❌ ${err.message}`);
        }
        return;
      }
      if (!data?.user) {
        setError("❌ فشل تسجيل الدخول — لا توجد جلسة. حاول مرة أخرى.");
        return;
      }
      if (remember) localStorage.setItem("mazaya_identifier", identifier);
      else localStorage.removeItem("mazaya_identifier");
      router.push("/dashboard");
    } catch (e: any) {
      console.error("[login] unexpected error:", e);
      setError(`❌ خطأ غير متوقع: ${e?.message || "حاول مرة أخرى"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/10 via-white to-brand-orange/5 -z-10" />

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg mb-4">
            <Image src="/logo.png" alt="Mazaya Furniture" width={64} height={64} className="rounded-xl" priority />
          </div>
          <h1 className="text-2xl font-extrabold text-brand-black">مصنع مزايا للأثاث</h1>
          <p className="text-sm text-brand-orange-dark font-medium mt-1">Mazaya Furniture</p>
          <p className="text-gray-600 mt-3 text-sm">مرحباً بك في نظام إدارة المصنع</p>
        </div>

        <div className="bg-white rounded-2xl shadow-elevated p-8 border border-gray-100">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                اسم المستخدم أو البريد أو رقم الهاتف
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="admin أو email@example.com أو 0123456789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
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
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-4 h-4 rounded accent-brand-orange" />
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
              className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (<><span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> جاري الدخول...</>) : "دخول"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              هذا النظام خاص بـ مصنع مزايا فقط.
              <br />استخدم بيانات دخولك ولا تشاركها مع أحد.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Mazaya Furniture © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
