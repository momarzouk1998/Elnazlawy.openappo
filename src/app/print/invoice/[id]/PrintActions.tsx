"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PdfDownloadButton } from "@/components/PdfDownloadButton";
import CustomerPaymentModal from "@/components/CustomerPaymentModal";

export default function PrintActions({
  autoprint,
  backLink = "/sales",
  backLabel = "↩️ عودة",
  fileName = "مستند",
  targetId = "statement",
  invoiceId,
  customerId,
  customerName,
  isCancelled,
}: {
  autoprint?: boolean;
  backLink?: string;
  backLabel?: string;
  fileName?: string;
  targetId?: string;
  invoiceId?: string;
  customerId?: string;
  customerName?: string;
  isCancelled?: boolean;
}) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (autoprint) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [autoprint]);

  return (
    <>
      <div className="no-print max-w-[720px] mx-auto mb-4 p-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 justify-center items-center">
        {/* زر الطباعة */}
        <button
          onClick={() => window.print()}
          className="bg-nazlawy-600 hover:bg-nazlawy-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <span>🖨️</span>
          <span>طباعة</span>
        </button>

        {/* زر PDF */}
        <PdfDownloadButton targetId={targetId} fileName={fileName} label="📄 PDF" />

        {/* زر تحصيل */}
        {customerId && !isCancelled && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="تسجيل دفعة جديدة من العميل"
          >
            <span>💳</span>
            <span>تحصيل</span>
          </button>
        )}

        {/* زر عودة */}
        <Link
          href={backLink}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1 cursor-pointer"
        >
          {backLabel}
        </Link>
      </div>

      {showPaymentModal && customerId && (
        <CustomerPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          defaultCustomerId={customerId}
          defaultCustomerName={customerName}
          defaultInvoiceId={invoiceId}
          onSuccess={() => {
            setShowPaymentModal(false);
            // تحديث الصفحة تلقائياً لتنعكس بيانات التحصيل فوراً في الطباعة
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

