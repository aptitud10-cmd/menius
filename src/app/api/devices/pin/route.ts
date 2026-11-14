export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { isSameOriginJson } from '@/lib/device-pairing';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { hashPin, isValidPin } from '@/lib/panel-pin';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * PIN del panel (el que se pide en la tablet para abrir el panel del dueño).
 * Solo el dueño desde su celular o computadora: ninguna tablet lo ve ni lo cambia,
 * aunque tenga el panel abierto.
 */
export async function GET() {
  const tenant = await getTenant({ ownerOnly: true });
  if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const [pin, log] = await Promise.all([
    admin.from('restaurant_panel_pins').select('updated_at').eq('restaurant_id', tenant.restaurantId).maybeSingle(),
    admin
      .from('panel_access_log')
      .select('created_at, success')
      .eq('restaurant_id', tenant.restaurantId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);
  if (pin.error) {
    // Migración 20261113f sin aplicar: la tarjeta no aparece.
    captureError(pin.error, { route: '/api/devices/pin', restaurantId: tenant.restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
  return NextResponse.json(
    { hasPin: !!pin.data, updatedAt: pin.data?.updated_at ?? null, log: log.data ?? [] },
    { headers: NO_STORE },
  );
}

export async function PUT(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const tenant = await getTenant({ ownerOnly: true });
  if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { allowed } = await checkRateLimitAsync(`panel-pin-set:u:${tenant.userId}`, { limit: 10, windowSec: 600 });
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = body?.pin;
  if (!isValidPin(pin)) return NextResponse.json({ error: 'invalid_pin_format' }, { status: 400 });

  const pin_hash = await hashPin(pin);
  const { error } = await createAdminClient()
    .from('restaurant_panel_pins')
    .upsert(
      { restaurant_id: tenant.restaurantId, pin_hash, failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() },
      { onConflict: 'restaurant_id' },
    );
  if (error) {
    captureError(error, { route: '/api/devices/pin', restaurantId: tenant.restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

/** Sin PIN, la tablet no puede abrir el panel. Cierra también los paneles abiertos. */
export async function DELETE(request: Request) {
  const origin = request.headers.get('origin');
  try {
    if (!origin || new URL(origin).host !== new URL(request.url).host) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const tenant = await getTenant({ ownerOnly: true });
  if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const [del, close] = await Promise.all([
    admin.from('restaurant_panel_pins').delete().eq('restaurant_id', tenant.restaurantId),
    admin.from('device_sessions').update({ panel_unlocked_until: null }).eq('restaurant_id', tenant.restaurantId),
  ]);
  const error = del.error ?? close.error;
  if (error) {
    captureError(error, { route: '/api/devices/pin', restaurantId: tenant.restaurantId });
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
