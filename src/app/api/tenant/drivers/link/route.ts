export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { isSameOriginJson, normalizePairingCode, CLAIM_TTL_MS } from '@/lib/device-pairing';
import { UUID_RE } from '@/lib/constants';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * POST /api/tenant/drivers/link  { id: driverId, code: "K7M-4PX" }
 *
 * El dueño escribe, al lado del repartidor en Equipo, el código que muestra la app
 * del repartidor. Aprueba la fila de driver_pairings y la ata a ESE repartidor; la
 * app la reclama en /api/driver/pair/poll con su secreto y recibe la sesión.
 * Mismo patrón que las tablets del Counter (/api/devices/pair/approve).
 */
export async function POST(request: Request) {
  // Aprobar entrega una sesión: un POST cross-site nunca debe llegar acá.
  if (!isSameOriginJson(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  }
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });

  const ip = getClientIP(request);
  const [byUser, byIp] = await Promise.all([
    checkRateLimitAsync(`driver-link:u:${tenant.userId}`, { limit: 10, windowSec: 300 }),
    checkRateLimitAsync(`driver-link:ip:${ip}`, { limit: 20, windowSec: 300 }),
  ]);
  if (!byUser.allowed || !byIp.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: NO_STORE });
  }

  const body = (await request.json().catch(() => null)) as { id?: unknown; code?: unknown } | null;
  const driverId = typeof body?.id === 'string' && UUID_RE.test(body.id) ? body.id : null;
  const code = normalizePairingCode(body?.code);
  if (!driverId) return NextResponse.json({ error: 'invalid_id' }, { status: 400, headers: NO_STORE });
  if (!code) return NextResponse.json({ error: 'invalid_code' }, { status: 400, headers: NO_STORE });

  const db = createAdminClient();
  const { data: driver, error: driverErr } = await db
    .from('drivers')
    .select('id, name, is_active')
    .eq('id', driverId)
    .eq('restaurant_id', tenant.restaurantId)
    .maybeSingle();
  if (driverErr) {
    captureError(driverErr, { route: '/api/tenant/drivers/link' });
    return NextResponse.json({ error: 'unavailable' }, { status: 500, headers: NO_STORE });
  }
  if (!driver) return NextResponse.json({ error: 'driver_not_found' }, { status: 404, headers: NO_STORE });
  if (!driver.is_active) return NextResponse.json({ error: 'inactive' }, { status: 409, headers: NO_STORE });

  const now = new Date();
  // Atómico: solo una fila viva y pendiente cambia. Dos aprobaciones del mismo
  // código, o repetir después de aprobar, dan "no encontrado".
  const { data: row, error } = await db
    .from('driver_pairings')
    .update({
      status: 'approved',
      restaurant_id: tenant.restaurantId,
      driver_id: driver.id,
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
    captureError(error, { route: '/api/tenant/drivers/link', restaurantId: tenant.restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 500, headers: NO_STORE });
  }
  // Misma respuesta para "nunca existió" y "venció".
  if (!row) return NextResponse.json({ error: 'code_not_found' }, { status: 404, headers: NO_STORE });

  return NextResponse.json({ ok: true, driverName: driver.name }, { headers: NO_STORE });
}
