import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/db/auth";
import prisma from "@/lib/db/prisma";
import type { CurrentProfile, UserRole } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "معرض النزلاوي - نظام الإدارة",
  description: "نظام إدارة معرض النزلاوي للأجهزة الكهربائية والإضاءة - الفيوم. إدارة المخزون، المبيعات، الخزائن، والشيكات.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "النزلاوي", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
