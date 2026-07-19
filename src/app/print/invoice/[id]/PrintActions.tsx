"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function PrintActions({ autoprint }: { autoprint?: boolean }) {
  useEffect(() => {
    if (autoprint) {
      // انتظر تحميل الصفحة كامل ثم اطبع
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [autoprint]);

  function closeWindow() {
    try { window.close(); } catch {}
    setTimeout(() => { window.location.href = "/"; }, 200);
  }

  return (
    <div className="no-print max-w-[720px] mx-auto mb-4 flex flex-wrap gap-3 justify-center">
      <button onClick={() => window.print()} className="bg-button-orange text-white px-6 py-2.5 rounded-full font-bold">🖨️ طباعة</button>
      <Link href="/sales" className="bg-nazlawy-500 text-white px-6 py-2.5 rounded-full font-bold hover:bg-nazlawy-600">↩️ العودة للفواتير</Link>
      <button onClick={closeWindow} className="bg-button-gray text-white px-6 py-2.5 rounded-full font-bold">✕ إغلاق التبويب</button>
    </div>
  );
}
