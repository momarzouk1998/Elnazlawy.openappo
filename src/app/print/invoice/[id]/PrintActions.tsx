"use client";
import { useEffect } from "react";
import Link from "next/link";
import { PdfDownloadButton } from "@/components/PdfDownloadButton";

export default function PrintActions({
  autoprint,
  backLink = "/sales",
  backLabel = "↩️ العودة للفواتير",
  fileName = "مستند",
  targetId = "statement",
}: {
  autoprint?: boolean;
  backLink?: string;
  backLabel?: string;
  fileName?: string;
  targetId?: string;
}) {
  useEffect(() => {
    if (autoprint) {
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
      <PdfDownloadButton targetId={targetId} fileName={fileName} />
      <Link href={backLink} className="bg-nazlawy-500 text-white px-6 py-2.5 rounded-full font-bold hover:bg-nazlawy-600">{backLabel}</Link>
      <button onClick={closeWindow} className="bg-button-gray text-white px-6 py-2.5 rounded-full font-bold">✕ إغلاق التبويب</button>
    </div>
  );
}
