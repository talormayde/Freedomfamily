// app/api/invite/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, sponsor_id } = body || {};
  if (!email || !sponsor_id) {
    return NextResponse.json({ error: 'email and sponsor_id required' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) {
    return NextResponse.json({ error: 'Server env not configured' }, { status: 500 });
  }

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  // Create invite (sends email)
  const { data: invite, error } = await admin.auth.admin.inviteUserByEmail(email, {
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ensure profile row exists
  await admin.from('ibo_profiles').upsert({ user_id: invite.user?.id }, { onConflict: 'user_id' });

  // Set sponsor & lineage (RPC)
  await admin.rpc('set_sponsor_and_update_lineage', {
    p_user: invite.user?.id,
    p_sponsor: sponsor_id,
  });

  return NextResponse.json({ ok: true, user_id: invite.user?.id });
}
