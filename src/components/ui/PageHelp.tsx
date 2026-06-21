"use client";
import { useState } from "react";

interface Props { title: string; description: string; }
export default function PageHelp({ title, description }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-orange-light text-brand-orange-dark hover:bg-brand-orange hover:text-white transition-all shadow-sm"
        aria-label="مساعدة"
      >
        <span className="text-lg font-bold">؟</span>
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center text-white font-bold flex-shrink-0">؟</div>
              <h3 className="text-lg font-bold text-brand-black flex-1 pt-1">{title}</h3>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">{description}</p>
            <button onClick={() => setOpen(false)} className="btn-primary w-full">فهمت</button>
          </div>
        </div>
      )}
    </>
  );
}
