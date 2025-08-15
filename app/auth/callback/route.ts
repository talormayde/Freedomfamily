// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  // IMPORTANT: pass a string URL, not URLSearchParams
  await supabase.auth.exchangeCodeForSession(request.url);

  // Prefer the caller’s ?next=… if present, else go home
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/';
  return NextResponse.redirect(new URL(next, url.origin));
}