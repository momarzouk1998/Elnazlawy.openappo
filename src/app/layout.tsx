import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مصنع مزايا للأثاث - نظام الإدارة",
  description: "نظام إدارة مصنع مزايا للأثاث - دمياط. إدارة المخزون، الأوردرات، اليومية المالية، والمعارض.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Mazaya Furniture", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};
export const viewport: Viewport = {
  themeColor: "#F2994A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen">
        {children}
        <script dangerouslySetInnerHTML={{__html:`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(()=>{});
            });
          }
        `}} />
      </body>
    </html>
  );
}
