// middleware.ts
import { NextResponse } from 'next/server';
export function middleware() {
  return NextResponse.next();
}
export const config = {
  matcher: [
    '/((?!_next/|icons/|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)).*)',
  ],
};