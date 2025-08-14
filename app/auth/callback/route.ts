// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // This reads code+state from the URL and sets the session cookies
    await supabase.auth.exchangeCodeForSession(request.url);
  } catch (e) {
    // swallow, we still redirect home
    console.error('exchangeCodeForSession error:', e);
  }

  const url = new URL(request.url);
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL || url.origin || '/';
  return NextResponse.redirect(redirectTo);
}