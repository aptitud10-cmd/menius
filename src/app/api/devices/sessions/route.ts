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

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('list_device_sessions', {
    p_restaurant_id: tenant.restaurantId,
  });
  if (error) {
    captureError(error, { route: '/api/devices/sessions', restaurantId: tenant.restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }

  const rows = (data ?? []) as { session_id: string; created_at: string; last_active_at: string }[];

  // App vs navegador: el user_agent de la sesión NO sirve — la crea el servidor al
  // aprobar el código en /link (siempre "node"). El dato real es el de la tablet
  // cuando pidió el código: device_pairings.from_counter_app.
  const fromApp = new Set<string>();
  if (rows.length > 0) {
    const { data: origins, error: originError } = await admin
      .from('device_sessions')
      .select('session_id, device_pairings(from_counter_app)')
      .eq('restaurant_id', tenant.restaurantId)
      .in('session_id', rows.map((r) => r.session_id));
    if (originError) {
      // Solo afecta la etiqueta: se listan igual, como "navegador".
      captureError(originError, { route: '/api/devices/sessions', restaurantId: tenant.restaurantId });
    }
    for (const o of (origins ?? []) as unknown as { session_id: string; device_pairings: { from_counter_app: boolean } | null }[]) {
      if (o.device_pairings?.from_counter_app) fromApp.add(o.session_id);
    }
  }

  const tablets = rows.map((d) => ({
    id: d.session_id,
    connectedAt: d.created_at,
    lastActiveAt: d.last_active_at,
    app: fromApp.has(d.session_id),
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
