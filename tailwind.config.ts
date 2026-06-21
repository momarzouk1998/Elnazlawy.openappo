import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#1A1A1A",
          orange: "#F2994A",
          "orange-dark": "#D87C2E",
          "orange-light": "#FFF3E6",
          cream: "#FAFAF7",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
      direction: "rtl",
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px 0 rgba(0,0,0,0.04)",
        elevated: "0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #F2994A 0%, #D87C2E 100%)",
        "dark-gradient": "linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        pulse_slow: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
