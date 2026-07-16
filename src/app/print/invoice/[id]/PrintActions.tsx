"use client";
import Link from "next/link";

export default function PrintActions() {
  function closeWindow() {
    // حاول إغلاق التبويب — يشتغل لما يكون مفتوح بـ window.open()
    // لو فشل (المتصفح سمح للمستخدم يتنقل مباشرة للصفحة)، نرجّعه للصفحة الرئيسية
    try {
      window.close();
    } catch {}
    // Fallback بعد مهلة قصيرة: لو التبويب لسه مفتوح، ارجع للرئيسية
    setTimeout(() => {
      // لو لسه على نفس الصفحة (window.close ما اتنفذش)، نرجّعه
      window.location.href = "/";
    }, 200);
  }

  return (
    <div className="no-print max-w-[600px] mx-auto mb-4 flex flex-wrap gap-3 justify-center">
      <button onClick={() => window.print()} className="bg-button-orange text-white px-6 py-2.5 rounded-full font-bold">🖨️ طباعة</button>
      <Link href="/sales" className="bg-nazlawy-500 text-white px-6 py-2.5 rounded-full font-bold hover:bg-nazlawy-600">↩️ العودة للفواتير</Link>
      <button onClick={closeWindow} className="bg-button-gray text-white px-6 py-2.5 rounded-full font-bold">✕ إغلاق التبويب</button>
    </div>
  );
}
