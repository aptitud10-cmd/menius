export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { normalizePairingCode, deviceSecretMatches } from '@/lib/device-pairing';
import { sessionIdFromAccessToken } from '@/lib/auth/device-session';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * The tablet polls this every ~2 s with { code, secret }.
 *   pending  → { status: 'pending' }
 *   expired  → { status: 'expired' }   (tablet asks for a new code)
 *   approved → the row is consumed, the session cookies are set on THIS response,
 *              and { status: 'connected', restaurantName } comes back. The tablet
 *              then navigates to /counter already signed in.
 *
 * The session is minted server-side (admin magic link → verifyOtp) so no token or
 * link ever appears in a response body — the tablet only receives the standard
 * @supabase/ssr auth cookies (not HttpOnly: same as any signed-in browser).
 */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  // ~30/min per tablet; leave headroom for several tablets on one restaurant router.
  const { allowed } = await checkRateLimitAsync(`pair-poll:${ip}`, { limit: 240, windowSec: 60 });
  if (!allowed) return NextResponse.json({ status: 'pending' }, { status: 429, headers: NO_STORE });

  const body = (await request.json().catch(() => null)) as { code?: unknown; secret?: unknown } | null;
  const code = normalizePairingCode(body?.code);
  if (!code || typeof body?.secret !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400, headers: NO_STORE });
  }

  const db = createAdminClient();
  const { data: row, error } = await db
    .from('device_pairings')
    .select('id, status, secret_hash, expires_at, restaurant_id, approved_by')
    .eq('code', code)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (error) {
    captureError(error, { route: '/api/devices/pair/poll' });
    return NextResponse.json({ status: 'pending' }, { status: 500, headers: NO_STORE });
  }

  // Wrong secret looks exactly like "no such code": the code alone reveals nothing.
  if (!row || !deviceSecretMatches(body.secret, row.secret_hash)) {
    return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });
  }
  if (row.status === 'pending' || !row.approved_by) {
    return NextResponse.json({ status: 'pending' }, { headers: NO_STORE });
  }

  // Approved → consume atomically. A second concurrent poll loses the race and
  // simply sees the row gone on its next tick.
  const { data: consumed } = await db
    .from('device_pairings')
    .update({ status: 'consumed', consumed_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle();
  if (!consumed) return NextResponse.json({ status: 'pending' }, { headers: NO_STORE });

  const { data: owner } = await db.auth.admin.getUserById(row.approved_by);
  const email = owner?.user?.email;
  if (!email) {
    captureError(new Error('pairing approver has no email'), { route: '/api/devices/pair/poll' });
    return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });
  }

  // generateLink does NOT send an email; we only use its hashed token, server-side.
  const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    captureError(linkErr ?? new Error('generateLink returned no hashed_token'), { route: '/api/devices/pair/poll' });
    return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });
  }

  // Cookie-bound client: verifyOtp writes the session cookies onto this response.
  const supabase = await createClient();
  const { data: otp, error: otpErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (otpErr) {
    captureError(otpErr, { route: '/api/devices/pair/poll' });
    return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });
  }

  // Mark this session as a tablet BEFORE handing it over: from here on the server
  // only lets it use the Counter. If we cannot mark it, it must not survive —
  // an unmarked session would be a full owner session on a shared device.
  const sessionId = sessionIdFromAccessToken(otp?.session?.access_token);
  const { error: markErr } = sessionId
    ? await db.from('device_sessions').insert({
        session_id: sessionId,
        restaurant_id: row.restaurant_id,
        user_id: row.approved_by,
        pairing_id: row.id,
      })
    : { error: new Error('verifyOtp returned no session_id') };
  if (markErr) {
    captureError(markErr, { route: '/api/devices/pair/poll' });
    // scope 'local' = only this new session; 'global' would also sign the owner out
    // of their own phone and computer.
    await supabase.auth.signOut({ scope: 'local' });
    return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });
  }

  let restaurantName: string | null = null;
  if (row.restaurant_id) {
    const { data: restaurant } = await db
      .from('restaurants')
      .select('name')
      .eq('id', row.restaurant_id)
      .maybeSingle();
    restaurantName = restaurant?.name ?? null;
  }

  return NextResponse.json({ status: 'connected', restaurantName }, { headers: NO_STORE });
}
