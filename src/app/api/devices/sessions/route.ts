export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { isSameOriginJson } from '@/lib/device-pairing';

const NO_STORE = { 'Cache-Control': 'no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Owner only (a tablet session gets 401): the restaurant's connected tablets. */
export async function GET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await createAdminClient().rpc('list_device_sessions', {
    p_restaurant_id: tenant.restaurantId,
  });
  if (error) {
    captureError(error, { route: '/api/devices/sessions', restaurantId: tenant.restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }

  const tablets = ((data ?? []) as { session_id: string; created_at: string; last_active_at: string; user_agent: string | null }[])
    .map((d) => ({
      id: d.session_id,
      connectedAt: d.created_at,
      lastActiveAt: d.last_active_at,
      app: !!d.user_agent?.includes('MeniusCounterApp'),
    }));
  return NextResponse.json({ tablets }, { headers: NO_STORE });
}

/**
 * Disconnect one tablet: deletes that auth session (its refresh token dies with it
 * and the tablet falls back to the code screen). Only sessions that are tablets of
 * THIS restaurant can be touched — the SQL function checks both.
 */
export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { allowed } = await checkRateLimitAsync(`device-revoke:u:${tenant.userId}`, { limit: 20, windowSec: 300 });
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === 'string' && UUID.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { data, error } = await createAdminClient().rpc('revoke_device_session', {
    p_restaurant_id: tenant.restaurantId,
    p_session_id: id,
  });
  if (error) {
    captureError(error, { route: '/api/devices/sessions', restaurantId: tenant.restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
  if (data !== true) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
