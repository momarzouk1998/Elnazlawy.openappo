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
        // 🟧 اللون الرئيسي — النزلاوي (Brand: Orange #f56226)
        nazlawy: {
          50:  "#fef3ee",
          100: "#fde2d4",
          200: "#fac1a8",
          300: "#f59a73",
          400: "#f07546",
          500: "#f56226",  // ← PRIMARY
          600: "#d9531e",
          700: "#b53f17",
          800: "#8a3013",
          900: "#5c1f0c",
        },
        // ⬛ رمادي الهيدر (Header Dark)
        slate: {
          650: "#677077",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "header-gradient": "linear-gradient(135deg, #677077, #5c646b)",
        "button-orange":  "linear-gradient(135deg, #f56226, #d9531e)",
        "button-gray":    "linear-gradient(135deg, #6c757d, #5a6268)",
        "button-green":   "linear-gradient(135deg, #28a745, #20c997)",
      },
    },
  },
  plugins: [],
};

export default config;
