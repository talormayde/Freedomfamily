// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/office', '/library', '/living', '/kitchen', '/calendar'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (!needsAuth) return NextResponse.next();

  // Supabase auth cookies (names used by @supabase/ssr)
  const hasAccess =
    req.cookies.get('sb-access-token') ||
    req.cookies.get('supabase-auth-token') || // older helper fallback
    req.cookies.get('sb:token');              // extra fallback

  if (hasAccess) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/office/:path*', '/library/:path*', '/living/:path*', '/kitchen/:path*', '/calendar/:path*'],
};
