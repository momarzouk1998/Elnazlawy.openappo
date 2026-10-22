import type { Metadata, Viewport } from "next";
import "./globals.css";
import UpdateBanner from '@/components/UpdateBanner';
import ErrorReporter from '@/components/ErrorReporter';

export const metadata: Metadata = {
  title: "النزلاوي لتجارة وتوزيع الأدوات الكهربائية - نظام الإدارة",
  description: "نظام إدارة النزلاوي لتجارة وتوزيع الأدوات الكهربائية والإضاءة - الفيوم. إدارة المخزون، المبيعات، الخزائن، والشيكات.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "النزلاوي", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico?v=2"],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f56226",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" type="image/x-icon" />
      </head>
      <body className="min-h-screen font-sans flex flex-col">
        <UpdateBanner />
        <ErrorReporter />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                let deferredPrompt;
                window.addEventListener('beforeinstallprompt', (e) => {
                  e.preventDefault();
                  deferredPrompt = e;
                  window.deferredPrompt = deferredPrompt;
                });

                // Unregister any old Service Worker and wipe cache
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (const reg of registrations) {
                      reg.unregister();
                    }
                  });
                }
                if (typeof window !== 'undefined' && 'caches' in window) {
                  caches.keys().then((names) => {
                    for (const name of names) {
                      caches.delete(name);
                    }
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
