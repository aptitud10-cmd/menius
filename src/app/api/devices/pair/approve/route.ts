export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { normalizePairingCode, CLAIM_TTL_MS } from '@/lib/device-pairing';

/**
 * The owner, signed in on their own phone/computer, approves the code shown on a
 * tablet. Only restaurant OWNERS pass getTenant() — the tablet is signed in as the
 * approver, so approving must require the same authority as typing the password.
 */
export async function POST(request: Request) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ip = getClientIP(request);
  const [byUser, byIp] = await Promise.all([
    checkRateLimitAsync(`pair-approve:u:${tenant.userId}`, { limit: 10, windowSec: 300 }),
    checkRateLimitAsync(`pair-approve:ip:${ip}`, { limit: 20, windowSec: 300 }),
  ]);
  if (!byUser.allowed || !byIp.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const code = normalizePairingCode((body as { code?: unknown } | null)?.code);
  if (!code) return NextResponse.json({ error: 'invalid_code' }, { status: 400 });

  const db = createAdminClient();
  const now = new Date();

  // Atomic: only a live, still-pending row flips. Two owners racing the same code,
  // or a replay after approval, both get "not found" here.
  const { data: row, error } = await db
    .from('device_pairings')
    .update({
      status: 'approved',
      restaurant_id: tenant.restaurantId,
      approved_by: tenant.userId,
      approved_at: now.toISOString(),
      expires_at: new Date(now.getTime() + CLAIM_TTL_MS).toISOString(),
    })
    .eq('code', code)
    .eq('status', 'pending')
    .gt('expires_at', now.toISOString())
    .select('id')
    .maybeSingle();

  if (error) {
    captureError(error, { route: '/api/devices/pair/approve', restaurantId: tenant.restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
  // Same answer for "never existed" and "expired": nothing to learn from probing.
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: restaurant } = await db
    .from('restaurants')
    .select('name')
    .eq('id', tenant.restaurantId)
    .maybeSingle();

  return NextResponse.json({ ok: true, restaurantName: restaurant?.name ?? null });
}
