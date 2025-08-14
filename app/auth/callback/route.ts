import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  // ✅ Pass the full URL string, not searchParams
  await supabase.auth.exchangeCodeForSession(request.url);

  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL || '/';
  return NextResponse.redirect(redirectTo);
}
