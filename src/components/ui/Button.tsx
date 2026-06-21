"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";
type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean;
}
const variantClass: Record<Variant, string> = {
  primary: "bg-brand-orange hover:bg-brand-orange-dark text-white shadow-sm hover:shadow-md",
  secondary: "bg-white hover:bg-gray-50 text-brand-black border border-gray-300",
  danger: "bg-red-500 hover:bg-red-600 text-white",
  ghost: "hover:bg-gray-100 text-gray-700",
};
const sizeClass: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-6 py-3",
};
export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", loading, className = "", children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" fill="none" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
