"use client";

import { useState } from "react";

// تحويل الصور للـ base64 عبر canvas لتجنب مشاكل CORS
async function inlineImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img")) as HTMLImageElement[];
  await Promise.all(images.map((img) => new Promise<void>((resolve) => {
    if (!img.src || img.src.startsWith("data:")) { resolve(); return; }
    const tempImg = new Image();
    tempImg.crossOrigin = "anonymous";
    tempImg.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = tempImg.naturalWidth || tempImg.width || 80;
        c.height = tempImg.naturalHeight || tempImg.height || 80;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(tempImg, 0, 0);
          img.src = c.toDataURL("image/png");
        }
      } catch {
        img.style.visibility = "hidden";
      }
      resolve();
    };
    tempImg.onerror = () => { img.style.visibility = "hidden"; resolve(); };
    tempImg.src = img.src + (img.src.includes("?") ? "&" : "?") + "_nocache=" + Date.now();
  })));
}

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
        (targetId ? document.getElementById(targetId) : null) ||
        document.getElementById("statement") ||
        document.getElementById("inventory-report") ||
        document.querySelector(".print-page") ||
        document.querySelector(".printable-statement-content") ||
        document.querySelector("[id*='statement']")
      ) as HTMLElement | null;

      if (!statementElement) {
        alert("❌ تعذر العثور على محتوى المستند للتحميل");
        return;
      }

      // استنساخ العنصر لتعديله دون التأثير على الصفحة
      const cloned = statementElement.cloneNode(true) as HTMLElement;
      cloned.style.position = "absolute";
      cloned.style.left = "-9999px";
      cloned.style.top = "0";
      cloned.style.width = statementElement.scrollWidth + "px";
      document.body.appendChild(cloned);

      try {
        // تحويل جميع الصور لـ base64
        await inlineImages(cloned);

        const html2canvas = (await import("html2canvas")).default;
        const { jsPDF } = await import("jspdf");

        const canvas = await html2canvas(cloned, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          logging: false,
          backgroundColor: "#ffffff",
          width: cloned.scrollWidth,
          height: cloned.scrollHeight,
          scrollX: 0,
          scrollY: 0,
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          alert("❌ حدث خطأ أثناء تجهيز الصفحات للتحميل");
          return;
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pdf = new jsPDF(orientation === "landscape" ? "l" : "p", "mm", "a4");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const printableWidth = pdfWidth - margin * 2;
        const printableHeight = pdfHeight - margin * 2;

        const imgWidth = printableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight <= printableHeight) {
          pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
        } else {
          const pageCanvasHeight = (canvas.width * printableHeight) / printableWidth;
          let positionY = 0;
          let pageCount = 0;

          while (positionY < canvas.height) {
            const sliceHeight = Math.min(pageCanvasHeight, canvas.height - positionY);
            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;

            const ctx = pageCanvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
              ctx.drawImage(canvas, 0, positionY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
            }

            const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.92);
            const pageImgHeight = (sliceHeight * printableWidth) / canvas.width;

            if (pageCount > 0) pdf.addPage();
            pdf.addImage(pageImgData, "JPEG", margin, margin, printableWidth, pageImgHeight);

            positionY += sliceHeight;
            pageCount++;
          }
        }

        pdf.save(`${fileName}.pdf`);
      } finally {
        document.body.removeChild(cloned);
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      // محاولة أخيرة بدون الصور
      try {
        const el = (
          (targetId ? document.getElementById(targetId) : null) ||
          document.getElementById("statement") ||
          document.getElementById("inventory-report") ||
          document.querySelector(".print-page")
        ) as HTMLElement | null;

        if (el) {
          const html2canvas = (await import("html2canvas")).default;
          const { jsPDF } = await import("jspdf");
          const canvas = await html2canvas(el, {
            scale: 2,
            logging: false,
            backgroundColor: "#ffffff",
            useCORS: false,
            allowTaint: true,
            ignoreElements: (el) => el.tagName === "IMG",
          });
          const pdf = new jsPDF(orientation === "landscape" ? "l" : "p", "mm", "a4");
          const margin = 8;
          const printableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
          const imgHeight = (canvas.height * printableWidth) / canvas.width;
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", margin, margin, printableWidth, imgHeight);
          pdf.save(`${fileName}.pdf`);
        }
      } catch {
        window.print();
      }
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
