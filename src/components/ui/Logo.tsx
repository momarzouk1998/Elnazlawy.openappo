"use client";
import Image from "next/image";
export default function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Mazaya Furniture"
        width={size}
        height={size}
        className="rounded-lg"
        priority
      />
      {withText && (
        <div className="leading-tight">
          <div className="font-extrabold text-brand-black text-base">مصنع مزايا</div>
          <div className="text-xs text-brand-orange-dark font-medium">Mazaya Furniture</div>
        </div>
      )}
    </div>
  );
}
