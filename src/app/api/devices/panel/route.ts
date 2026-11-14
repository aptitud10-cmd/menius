export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDeviceSession } from '@/lib/auth/device-session';
import { isSameOriginJson } from '@/lib/device-pairing';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { isValidPin, panelUnlockUntil, verifyPin } from '@/lib/panel-pin';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Panel del dueño desde la tablet del Counter (brief sección 7).
 *
 *  - unlock {pin}: con el PIN correcto, ESTA tablet ve el panel por 10 min.
 *  - touch:        hay actividad en el panel → otros 10 min (solo si ya está abierto).
 *  - lock:         vuelve al Counter → se cierra ya.
 *
 * La sesión se identifica por el session_id del JWT verificado (RPC
 * current_device_session): una tablet solo puede abrir o cerrar SU propio panel.
 * El dueño en su celular o computadora no pasa por acá (no es tablet).
 */
export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const device = await getDeviceSession(supabase);
  if (!device.isTablet || !device.restaurantId || !device.sessionId) {
    return NextResponse.json({ error: 'not_a_tablet' }, { status: 400 });
  }
  const { restaurantId, sessionId } = device;

  const body = (await request.json().catch(() => null)) as { action?: unknown; pin?: unknown } | null;
  const action = body?.action;
  const admin = createAdminClient();

  if (action === 'lock') {
    const { error } = await admin.from('device_sessions').update({ panel_unlocked_until: null }).eq('session_id', sessionId);
    if (error) captureError(error, { route: '/api/devices/panel', action: 'lock', restaurantId });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (action === 'touch') {
    if (!device.panelUnlocked) return NextResponse.json({ error: 'locked' }, { status: 403, headers: NO_STORE });
    const until = panelUnlockUntil();
    const { error } = await admin
      .from('device_sessions')
      .update({ panel_unlocked_until: until })
      .eq('session_id', sessionId)
      .gt('panel_unlocked_until', new Date().toISOString());
    if (error) {
      captureError(error, { route: '/api/devices/panel', action: 'touch', restaurantId });
      return NextResponse.json({ error: 'unavailable' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, until }, { headers: NO_STORE });
  }

  if (action !== 'unlock') return NextResponse.json({ error: 'invalid' }, { status: 400 });

  // Además del bloqueo de 5 intentos por tienda: freno por tablet.
  const { allowed } = await checkRateLimitAsync(`panel-pin:s:${sessionId}`, { limit: 20, windowSec: 600 });
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const pin = body?.pin;
  if (!isValidPin(pin)) return NextResponse.json({ error: 'invalid_pin_format' }, { status: 400 });

  const { data: row, error: readError } = await admin
    .from('restaurant_panel_pins')
    .select('pin_hash, locked_until')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (readError) {
    captureError(readError, { route: '/api/devices/panel', action: 'unlock', restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
  if (!row) return NextResponse.json({ error: 'no_pin' }, { status: 404, headers: NO_STORE });

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    return NextResponse.json({ error: 'locked_out', lockedUntil: row.locked_until }, { status: 429, headers: NO_STORE });
  }

  const ok = await verifyPin(pin, row.pin_hash);
  const log = admin.from('panel_access_log').insert({ restaurant_id: restaurantId, session_id: sessionId, success: ok });

  if (!ok) {
    const [{ data: fail, error: failError }, logRes] = await Promise.all([
      admin.rpc('register_panel_pin_failure', { p_restaurant_id: restaurantId }),
      log,
    ]);
    if (logRes.error) captureError(logRes.error, { route: '/api/devices/panel', action: 'log', restaurantId });
    if (failError) {
      captureError(failError, { route: '/api/devices/panel', action: 'fail', restaurantId });
      return NextResponse.json({ error: 'unavailable' }, { status: 500 });
    }
    const f = (Array.isArray(fail) ? fail[0] : fail) as { attempts_left?: number; locked_until?: string | null } | null;
    if (f?.locked_until) {
      return NextResponse.json({ error: 'locked_out', lockedUntil: f.locked_until }, { status: 429, headers: NO_STORE });
    }
    return NextResponse.json({ error: 'wrong_pin', attemptsLeft: f?.attempts_left ?? 0 }, { status: 401, headers: NO_STORE });
  }

  const until = panelUnlockUntil();
  const [unlock, reset, logRes] = await Promise.all([
    admin.from('device_sessions').update({ panel_unlocked_until: until }).eq('session_id', sessionId),
    admin.from('restaurant_panel_pins').update({ failed_attempts: 0, locked_until: null }).eq('restaurant_id', restaurantId),
    log,
  ]);
  if (logRes.error) captureError(logRes.error, { route: '/api/devices/panel', action: 'log', restaurantId });
  if (reset.error) captureError(reset.error, { route: '/api/devices/panel', action: 'reset', restaurantId });
  if (unlock.error) {
    captureError(unlock.error, { route: '/api/devices/panel', action: 'unlock', restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, until }, { headers: NO_STORE });
}
