export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { isSameOriginJson } from '@/lib/device-pairing';
import { UUID_RE } from '@/lib/constants';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * POST /api/tenant/drivers/link  { id: driverId }
 *
 * El dueño genera el QR con el que un repartidor entra a la app nativa, sin SMS.
 * Mismo mecanismo que la vinculación de tablets (/api/devices/pair/poll): el
 * servidor genera un magic link SIN enviar email y solo usa su hashed_token.
 * La app lo canjea con verifyOtp({ token_hash, type: 'magiclink' }). El token
 * sirve una sola vez y vence según la expiración de OTP de Supabase Auth.
 *
 * Cada repartidor tiene su propia cuenta de Auth con un email interno que no
 * existe (driver-<id>@drivers.menius.app): nunca recibe correo y no puede entrar
 * al panel — getTenant() no le encuentra tienda. Lo único que habilita es
 * /api/driver/me|orders y el RLS driver_read_own_row / driver_read_assigned_orders.
 */
export async function POST(request: Request) {
  // Entrega una sesión: un POST cross-site nunca debe llegar acá.
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

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const driverId = typeof body?.id === 'string' && UUID_RE.test(body.id) ? body.id : null;
  if (!driverId) return NextResponse.json({ error: 'invalid_id' }, { status: 400, headers: NO_STORE });

  const db = createAdminClient();
  const { data: driver, error: driverErr } = await db
    .from('drivers')
    .select('id, name, is_active, auth_user_id')
    .eq('id', driverId)
    .eq('restaurant_id', tenant.restaurantId)
    .maybeSingle();
  if (driverErr) {
    captureError(driverErr, { route: '/api/tenant/drivers/link' });
    return NextResponse.json({ error: 'internal' }, { status: 500, headers: NO_STORE });
  }
  if (!driver) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  if (!driver.is_active) return NextResponse.json({ error: 'inactive' }, { status: 409, headers: NO_STORE });

  const email = `driver-${driver.id}@drivers.menius.app`;

  // Primera vinculación: crear la cuenta. Si ya existe (vinculado antes), seguir.
  const { error: createErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: String(driver.name ?? '') },
    app_metadata: { role: 'driver', driver_id: driver.id, restaurant_id: tenant.restaurantId },
  });
  if (createErr && createErr.code !== 'email_exists') {
    captureError(createErr, { route: '/api/tenant/drivers/link', step: 'createUser' });
    return NextResponse.json({ error: 'internal' }, { status: 500, headers: NO_STORE });
  }

  // generateLink NO envía email; solo se usa su hashed_token.
  const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link?.properties?.hashed_token;
  const authUserId = link?.user?.id;
  if (linkErr || !tokenHash || !authUserId) {
    captureError(linkErr ?? new Error('generateLink sin hashed_token/user'), {
      route: '/api/tenant/drivers/link',
      step: 'generateLink',
    });
    return NextResponse.json({ error: 'internal' }, { status: 500, headers: NO_STORE });
  }

  if (driver.auth_user_id !== authUserId) {
    const { error: updErr } = await db
      .from('drivers')
      .update({ auth_user_id: authUserId })
      .eq('id', driver.id)
      .eq('restaurant_id', tenant.restaurantId);
    if (updErr) {
      captureError(updErr, { route: '/api/tenant/drivers/link', step: 'link-driver' });
      return NextResponse.json({ error: 'internal' }, { status: 500, headers: NO_STORE });
    }
  }

  return NextResponse.json(
    { link: `meniusdriver://link?t=${encodeURIComponent(tokenHash)}` },
    { headers: NO_STORE },
  );
}
