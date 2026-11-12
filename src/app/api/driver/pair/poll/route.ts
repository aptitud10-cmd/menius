export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { normalizePairingCode, deviceSecretMatches } from '@/lib/device-pairing';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * POST /api/driver/pair/poll { code, secret } — la app pregunta cada ~2 s.
 *   pending  → { status: 'pending' }
 *   expired  → { status: 'expired' }   (la app pide otro código)
 *   approved → la fila se consume y vuelve { status: 'connected', tokenHash, driverName }.
 *              La app canjea tokenHash con verifyOtp({ token_hash, type: 'magiclink' }).
 *
 * Cada repartidor tiene su propia cuenta de Auth con un email interno que no existe
 * (driver-<id>@drivers.menius.app): nunca recibe correo y no puede entrar al panel —
 * getTenant() no le encuentra tienda. Solo habilita /api/driver/me|orders y el RLS
 * driver_read_own_row / driver_read_assigned_orders. generateLink NO envía email.
 */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  const { allowed } = await checkRateLimitAsync(`driver-pair-poll:${ip}`, { limit: 120, windowSec: 60 });
  if (!allowed) return NextResponse.json({ status: 'pending' }, { status: 429, headers: NO_STORE });

  const body = (await request.json().catch(() => null)) as { code?: unknown; secret?: unknown } | null;
  const code = normalizePairingCode(body?.code);
  if (!code || typeof body?.secret !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400, headers: NO_STORE });
  }

  const db = createAdminClient();
  const { data: row, error } = await db
    .from('driver_pairings')
    .select('id, status, secret_hash, expires_at, restaurant_id, driver_id')
    .eq('code', code)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (error) {
    captureError(error, { route: '/api/driver/pair/poll' });
    return NextResponse.json({ status: 'pending' }, { status: 500, headers: NO_STORE });
  }
  // Secreto incorrecto = "no existe": el código solo no revela nada.
  if (!row || !deviceSecretMatches(body.secret, row.secret_hash)) {
    return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });
  }
  if (row.status === 'pending' || !row.driver_id || !row.restaurant_id) {
    return NextResponse.json({ status: 'pending' }, { headers: NO_STORE });
  }

  // Aprobado → consumir atómicamente. Un poll concurrente pierde la carrera.
  const { data: consumed } = await db
    .from('driver_pairings')
    .update({ status: 'consumed', consumed_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle();
  if (!consumed) return NextResponse.json({ status: 'pending' }, { headers: NO_STORE });

  const fail = (step: string, err: unknown) => {
    captureError(err instanceof Error ? err : new Error(String(err ?? step)), { route: '/api/driver/pair/poll', step });
    return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });
  };

  const { data: driver } = await db
    .from('drivers')
    .select('id, name, is_active')
    .eq('id', row.driver_id)
    .eq('restaurant_id', row.restaurant_id)
    .maybeSingle();
  // Lo desactivaron o borraron entre la aprobación y el canje.
  if (!driver || !driver.is_active) return NextResponse.json({ status: 'expired' }, { headers: NO_STORE });

  const email = `driver-${driver.id}@drivers.menius.app`;

  // Primera vinculación: crear la cuenta. Si ya existe (se vinculó antes), seguir.
  const { error: createErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: String(driver.name ?? '') },
    app_metadata: { role: 'driver', driver_id: driver.id, restaurant_id: row.restaurant_id },
  });
  if (createErr && createErr.code !== 'email_exists') return fail('createUser', createErr);

  const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link?.properties?.hashed_token;
  const authUserId = link?.user?.id;
  if (linkErr || !tokenHash || !authUserId) return fail('generateLink', linkErr);

  const { error: updErr } = await db
    .from('drivers')
    .update({ auth_user_id: authUserId })
    .eq('id', driver.id)
    .eq('restaurant_id', row.restaurant_id);
  if (updErr) return fail('link-driver', updErr);

  return NextResponse.json(
    { status: 'connected', tokenHash, driverName: driver.name ?? null },
    { headers: NO_STORE },
  );
}
