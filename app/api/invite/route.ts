// app/api/invite/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ensure these are set in your env:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY  (service key, NOT anon key)
const admin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

// Prefer an explicit site URL, then Vercel URL in prod, then localhost for dev
function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.endsWith('/') ? explicit : `${explicit}/`;

  const vercelUrl = process.env.VERCEL_URL?.trim(); // e.g. myapp.vercel.app
  if (vercelUrl) return `https://${vercelUrl}/`;

  return 'http://localhost:3000/';
}

export const dynamic = 'force-dynamic'; // don’t cache
export const revalidate = 0;

type Body = {
  email?: string;
  name?: string;
  iboNumber?: string;
  sponsorId?: string; // optional: your user id who’s sending the invite
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const redirectTo = getSiteUrl(); // where the invite link should land after email click

    // 1) Send the Supabase invite email
    const { data: invite, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo, // ✅ correct key for supabase-js v2
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2) (Optional) Seed profile row so onboarding can pick up metadata immediately
    //    Safe to run best-effort; ignore conflict errors.
    const userId = invite?.user?.id;
    if (userId) {
      const meta = {
        id: userId,
        email,
        name: body.name ?? null,
        ibo_number: body.iboNumber ?? null,
        sponsor_id: body.sponsorId ?? null,
        // add other default fields your app expects…
      };

      // If you have a `profiles` table, try to upsert it. Ignore failures.
      try {
        // @ts-ignore – this depends on your schema; remove or adapt if you don’t use profiles
        await admin.from('profiles').upsert(meta, { onConflict: 'id' });
      } catch {
        // no-op
      }
    }

    return NextResponse.json(
      {
        ok: true,
        redirectTo,
        invited: !!invite?.user?.email,
        userId: invite?.user?.id ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
