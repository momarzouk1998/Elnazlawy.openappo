import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // ضغط ردود API: gzip/brotli عبر Next
  compress: true,
  // توليد صفحات ثابتة (RSC) أسرع
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // staleTimes: التحكم في كم من الوقت تظل البيانات "طازجة" قبل الحاجة لإعادة التحقق
    staleTimes: {
      dynamic: 30,        // الصفحات الديناميكية: 30 ثانية
      static: 300,        // الصفحات الثابتة: 5 دقائق
    },
  },
  async headers() {
    return [
      // Security headers + cache hints
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Service Worker
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // Static assets — cache long (1 year)
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // الصور — cache يوم
      {
        source: "/(icons|images|.*\\.(?:png|jpg|jpeg|svg|webp|ico))",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
