// Edge-safe middleware — بدون Supabase (اللي بيستخدم process.version مش شغال في Edge)
// يتحقق من وجود session cookie فقط. التحقق الفعلي من المستخدم بيحصل في الـ Server Components.
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Supabase SSR يخزن الـ session في cookies متعدد (sb-*-auth-token).
  // بنبحث عن أي cookie فيها "auth-token" وبنتأكد إنها مش فاضية.
  const hasSession = Object.keys(request.cookies.getAll()).some(name =>
    name.includes("auth-token") && request.cookies.get(name)?.value
  );

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/login" ||
    path.startsWith("/auth/") ||
    path === "/manifest.json" ||
    path === "/sw.js" ||
    path.startsWith("/icons/") ||
    path === "/favicon.ico" ||
    path === "/logo.png" ||
    path === "/api/auth/debug" ||
    path === "/debug";

  // بدون session → redirect لـ /login
  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  // مع session وهو في /login → redirect لـ /dashboard
  if (hasSession && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request });
}
