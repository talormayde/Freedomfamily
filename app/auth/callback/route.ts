import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  // Supabase’s helper will read the code + set auth cookies for us:
  await supabase.auth.exchangeCodeForSession(new URL(request.url).searchParams);
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL || '/';
  return NextResponse.redirect(redirectTo);
}
