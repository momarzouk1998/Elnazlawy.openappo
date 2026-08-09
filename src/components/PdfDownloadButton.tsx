"use client";

import { useState } from "react";

export function PdfDownloadButton({
  targetId = "statement",
  fileName = "كشف حساب",
  orientation = "portrait",
}: {
  targetId?: string;
  fileName?: string;
  orientation?: "portrait" | "landscape";
}) {
  const [loading, setLoading] = useState(false);

  const handleDownloadPdf = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const statementElement = (
        document.getElementById(targetId) ||
        document.getElementById("statement") ||
        document.querySelector(".printable-statement-content")
      ) as HTMLElement | null;

      if (!statementElement) {
        window.print();
        return;
      }

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(statementElement, {
        useCORS: true,
        scale: 1.8,
        logging: false,
        backgroundColor: "#ffffff",
        width: statementElement.scrollWidth,
        height: statementElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        window.print();
        return;
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.90);
      const pdf = new jsPDF(orientation === "landscape" ? "l" : "p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;

      let imgWidth = pdfWidth - 12;
      let imgHeight = imgWidth / ratio;

      if (imgHeight > pdfHeight - 12) {
        imgHeight = pdfHeight - 12;
        imgWidth = imgHeight * ratio;
      }

      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      window.print();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownloadPdf}
      disabled={loading}
      style={{
        background: loading ? '#999' : 'linear-gradient(135deg, #f56226, #d9531e)',
        border: 'none',
        color: 'white',
        fontWeight: 700,
        fontSize: '0.95rem',
        padding: '0.6rem 1.8rem',
        borderRadius: '40px',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: '0 4px 12px rgba(245, 98, 38, 0.3)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'inherit',
        transition: 'all 0.3s ease',
      }}
    >
      {loading ? (
        <>
          <span style={{
            border: '3px solid rgba(255,255,255,0.3)',
            borderRadius: '50%',
            borderTop: '3px solid white',
            width: '18px',
            height: '18px',
            animation: 'spin 1s linear infinite',
            display: 'inline-block',
          }} />
          جاري التحميل...
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" style={{ verticalAlign: 'middle' }}>
            <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1m-1 4v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 11.293V7.5a.5.5 0 0 1 1 0"/>
          </svg>
          تحميل PDF
        </>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
