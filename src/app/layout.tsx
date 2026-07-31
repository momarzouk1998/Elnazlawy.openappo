import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Cairo } from "next/font/google";
import { COOKIE_NAME, verifySession } from "@/lib/db/auth";
import prisma from "@/lib/db/prisma";
import type { CurrentProfile, UserRole } from "@/lib/auth";
import "./globals.css";

// خط Cairo محمّل ذاتياً بواسطة Next (يستخدم display: swap فلا يحجب الرسم)
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-cairo",
  preload: true,
  fallback: ["Segoe UI", "Tahoma", "sans-serif"],
});

export const metadata: Metadata = {
  title: "معرض النزلاوي - نظام الإدارة",
  description: "نظام إدارة معرض النزلاوي للأجهزة الكهربائية والإضاءة - الفيوم. إدارة المخزون، المبيعات، الخزائن، والشيكات.",
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
  maximumScale: 1,
  userScalable: false,
};

async function getInitialUser(): Promise<CurrentProfile | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifySession(token);
    if (!payload) return null;
    const user = await prisma.users.findFirst({
      where: { id: payload.sub, is_active: true },
      select: { id: true, username: true, full_name: true, role: true, can_see_cost: true, is_active: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role as UserRole,
      can_see_cost: user.can_see_cost,
      is_active: user.is_active,
    };
  } catch {
    return null;
  }
}

async function checkSubscription(): Promise<{ active: boolean; status?: string; daysLeft?: number; graceDaysLeft?: number; message?: string }> {
  try {
    const adminUrl = process.env.ADMIN_API_URL;
    const systemName = process.env.SYSTEM_NAME;
    if (!adminUrl || !systemName) return { active: true }; // Fallback if not configured

    const res = await fetch(`${adminUrl}/api/subscription/verify?system=${systemName}`, {
      next: { revalidate: 60 }, // Cache for 1 minute for faster updates
    });
    
    if (!res.ok) return { active: true };
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Subscription check failed:", error);
    return { active: true }; // Do not block if admin server is unreachable
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const subStatus = await checkSubscription();

  if (!subStatus.active) {
    return (
      <html lang="ar" dir="rtl" className={cairo.variable}>
        <head>
          <title>System Blocked</title>
        </head>
        <body className="min-h-screen font-[var(--font-cairo)] bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">انتهت صلاحية الاشتراك</h1>
            <p className="text-gray-600 mb-6">
              {subStatus.message || "عفواً، لقد انتهت صلاحية اشتراك هذا النظام. يرجى التواصل مع الإدارة لتجديد الاشتراك واستعادة الوصول."}
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" type="image/x-icon" />
      </head>
      <body className="min-h-screen font-[var(--font-cairo)] flex flex-col">
        {subStatus.status === "expiring_soon" && (
          <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-bold w-full shadow-sm">
            {subStatus.message}
          </div>
        )}
        {subStatus.status === "grace_period" && (
          <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-bold w-full shadow-sm">
            {subStatus.message}
          </div>
        )}
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
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
