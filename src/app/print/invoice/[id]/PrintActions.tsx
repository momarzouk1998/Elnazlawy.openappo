"use client";
export default function PrintActions() {
  return (
    <div className="no-print max-w-[600px] mx-auto mb-4 flex flex-wrap gap-3 justify-center">
      <button onClick={() => window.print()} className="bg-button-orange text-white px-6 py-2.5 rounded-full font-bold">🖨️ طباعة</button>
      <button onClick={() => window.close()} className="bg-button-gray text-white px-6 py-2.5 rounded-full font-bold">✕ إغلاق</button>
    </div>
  );
}
