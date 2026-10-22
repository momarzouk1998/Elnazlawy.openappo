"use client";

import { useState } from "react";

// دالة تحويل أي لون oklch إلى rgb باستخدام الـ canvas الأصلي للمتصفح
function convertOklchToRgb(str: string, ctx: CanvasRenderingContext2D | null): string {
  if (!str || typeof str !== "string" || !str.includes("oklch")) return str;
  if (!ctx) return str.replace(/oklch\([^)]+\)/gi, "rgb(0,0,0)");
  return str.replace(/oklch\([^)]+\)/gi, (match) => {
    try {
      ctx.fillStyle = "#000000";
      ctx.fillStyle = match;
      return ctx.fillStyle; // المتصفح يحول oklch تلقائياً لـ rgb/hex
    } catch {
      return "rgb(0,0,0)";
    }
  });
}

export function PdfDownloadButton({
  targetId = "statement",
  fileName = "كشف حساب",
  orientation = "portrait",
  label = "📄 PDF",
}: {
  targetId?: string;
  fileName?: string;
  orientation?: "portrait" | "landscape";
  label?: string;
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

      // انتظار اكتمال تحميل الخطوط العربية قبل تصوير الـ Canvas لمنع شقلبة أو تقطيع الحروف
      if (typeof document !== "undefined" && (document as any).fonts?.ready) {
        try {
          await (document as any).fonts.ready;
        } catch {}
      }

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // حساب نقاط الفصل الآمنة (نهايات صفوف الجداول والبلوكات) نسبةً إلى أعلى العنصر
      // عشان لما الفاتورة أو الكشف يتقسم على أكتر من صفحة A4، السكينة متقطعش سطر في النص
      const rootRect = statementElement.getBoundingClientRect();
      const safeBreakRatios: number[] = [];
      if (rootRect.height > 0) {
        const breakables = statementElement.querySelectorAll(
          "tbody tr, tfoot tr, thead, .no-split-block"
        );
        breakables.forEach((el) => {
          const r = el.getBoundingClientRect();
          const topRatio = (r.top - rootRect.top) / rootRect.height;
          const bottomRatio = (r.bottom - rootRect.top) / rootRect.height;
          if (topRatio > 0 && topRatio < 1) safeBreakRatios.push(topRatio);
          if (bottomRatio > 0 && bottomRatio < 1) safeBreakRatios.push(bottomRatio);
        });
        safeBreakRatios.sort((a, b) => a - b);
      }

      const canvas = await html2canvas(statementElement, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc, clonedElement) => {
          const tempCanvas = clonedDoc.createElement("canvas");
          const ctx = tempCanvas.getContext("2d");

          // تثبيت الاتجاه وخصائص النص العربي على الجذر المستنسخ لمنع شقلبة الكلمات في html2canvas
          clonedElement.style.direction = "rtl";
          clonedElement.style.letterSpacing = "0px";
          clonedElement.style.fontVariantLigatures = "normal";

          // 1. تنظيف جميع وسوم <style> في الصفحة المستنسخة من أي oklch
          const styleTags = clonedDoc.querySelectorAll("style");
          styleTags.forEach((styleTag) => {
            if (styleTag.textContent && styleTag.textContent.includes("oklch")) {
              styleTag.textContent = convertOklchToRgb(styleTag.textContent, ctx);
            }
          });

          // 1.1. تأمين رؤوس الجداول (th) من التكسير، وتأمين التفاف النصوص في خلايا البيانات (td)
          const clonedHeaders = clonedDoc.querySelectorAll("th");
          clonedHeaders.forEach((th: any) => {
            th.style.whiteSpace = "nowrap";
            th.style.wordBreak = "keep-all";
            th.style.overflowWrap = "normal";
            th.style.direction = "rtl";
            th.style.letterSpacing = "0px";
          });

          const clonedCells = clonedDoc.querySelectorAll("td");
          clonedCells.forEach((cell: any) => {
            cell.style.direction = "rtl";
            cell.style.letterSpacing = "0px";
            if (cell.classList.contains("nowrap")) {
              cell.style.whiteSpace = "nowrap";
              cell.style.wordBreak = "keep-all";
            } else {
              cell.style.whiteSpace = "normal";
              cell.style.wordBreak = "break-word";
              cell.style.overflowWrap = "break-word";
            }
          });

          // 2. فحص جميع عناصر المستند المستنسخ وتحويل ألوانها المحسوبة إلى RGB صريح
          const origAll = [
            statementElement,
            ...Array.from(statementElement.querySelectorAll("*")),
          ] as HTMLElement[];
          const clonedAll = [
            clonedElement,
            ...Array.from(clonedElement.querySelectorAll("*")),
          ] as HTMLElement[];

          const COLOR_PROPS = [
            "color",
            "backgroundColor",
            "borderColor",
            "borderTopColor",
            "borderBottomColor",
            "borderLeftColor",
            "borderRightColor",
            "outlineColor",
            "boxShadow",
            "textShadow",
          ];

          for (let i = 0; i < origAll.length; i++) {
            const orig = origAll[i];
            const clone = clonedAll[i];
            if (!orig || !clone) continue;

            // تنظيف أي inline styles بها oklch
            if (clone.style) {
              for (let s = 0; s < clone.style.length; s++) {
                const prop = clone.style[s];
                const val = clone.style.getPropertyValue(prop);
                if (val && val.includes("oklch")) {
                  clone.style.setProperty(prop, convertOklchToRgb(val, ctx));
                }
              }
            }

            // قراءة الألوان المحسوبة من العنصر الأصلي وتحويلها لـ RGB على المستنسخ
            try {
              const computed = window.getComputedStyle(orig);
              for (const prop of COLOR_PROPS) {
                const val = (computed as any)[prop];
                if (val && typeof val === "string" && val.includes("oklch")) {
                  const rgbVal = convertOklchToRgb(val, ctx);
                  const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
                  clone.style.setProperty(cssProp, rgbVal, "important");
                }
              }
            } catch {}
          }
        },
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        alert("❌ حدث خطأ أثناء إنشاء ملف PDF");
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

      // إذا كان المحتوى يتسع في صفحة واحدة
      if (imgHeight <= printableHeight) {
        const x = (pdfWidth - imgWidth) / 2;
        const y = margin;
        pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
      } else {
        // الفواتير الطويلة وكشوفات الحساب الكبيرة تتوزع تلقائياً على صفحات متعددة A4
        // مع احترام حدود الأسطر (safeBreakRatios) لمنع شطر أي سطر أو رقم بين صفحتين
        const pageCanvasHeight = (canvas.width * printableHeight) / printableWidth;
        const safeBreakY = safeBreakRatios.map((r) => Math.round(r * canvas.height));
        let positionY = 0;
        let pageCount = 0;

        while (positionY < canvas.height - 2) {
          let targetEnd = positionY + pageCanvasHeight;
          let sliceHeight: number;

          if (targetEnd >= canvas.height - 2) {
            sliceHeight = canvas.height - positionY;
          } else {
            // نبحث عن أقرب نقطة فصل آمنة قبل نهاية الصفحة (بحيث لا تقل الصفحة عن 55% من ارتفاعها)
            const minAcceptableY = positionY + pageCanvasHeight * 0.55;
            let bestBreak = -1;
            for (const by of safeBreakY) {
              if (by > minAcceptableY && by <= targetEnd) {
                bestBreak = by;
              } else if (by > targetEnd) {
                break;
              }
            }
            sliceHeight = bestBreak !== -1 ? bestBreak - positionY : Math.min(pageCanvasHeight, canvas.height - positionY);
          }

          if (sliceHeight <= 0) {
            sliceHeight = Math.min(pageCanvasHeight, canvas.height - positionY);
          }

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;

          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              positionY,
              canvas.width,
              sliceHeight,
              0,
              0,
              canvas.width,
              sliceHeight
            );
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
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("❌ فشل إنشاء ملف PDF، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownloadPdf}
      disabled={loading}
      className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
          <span>جاري التحميل...</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
