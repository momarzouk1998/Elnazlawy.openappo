import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, verifySession } from '@/lib/jwt';
import { checkSubscription } from '@/lib/subscription-check';

const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // استثناء فوري لمسارات فحص النسخة وتسجيل أخطاء العميل لتفادي أي حجب
  if (pathname === '/api/version' || pathname === '/api/client-error') {
    return NextResponse.next();
  }

  // فحص الاشتراك المركزي أولاً وقبل أي مسار
  const blocked = await checkSubscription(pathname);
  if (blocked) return blocked;

  // السماح بالمسارات العامة
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // السماح بمسارات الـ API (كل مسار يفحص الجلسة داخلياً)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // التحقق من توكن الجلسة للصفحات المحمية
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifySession(token);
  if (!payload) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', String(payload.sub || ''));
  requestHeaders.set('x-user-role', payload.role || '');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|elnazlawy-logo\\.webp|icons|manifest\\.json|sw\\.js).*)',
  ],
};
