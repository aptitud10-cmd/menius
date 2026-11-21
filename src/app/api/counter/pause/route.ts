export const dynamic = 'force-dynamic';

/**
 * GET → { pausedUntil: ISO | null, busyExtra, busyUntil }: la pausa de pedidos y el modo
 * ocupado vigentes del restaurante.
 * El Counter y el KDS la consultan cada 30 s para que una pausa puesta en otra
 * pantalla (u otra tablet) se vea en todas. `restaurants` no está en realtime a
 * propósito: emitiría la fila entera, con columnas privadas.
 *
 * ?counter=1 (solo el Counter, no el KDS) además deja la señal de "sigo conectada"
 * en restaurants.counter_seen_at, como mucho una vez por minuto. Con eso el cron
 * counter-offline avisa al dueño si la tablet se cae con la tienda abierta.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';

const logger = createLogger('counter-pause');

export async function GET(request: NextRequest) {
  const tenant = await getTenant({ allowDevice: true });
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (request.nextUrl.searchParams.get('counter') === '1') {
    // Solo escribe si la última señal tiene más de 1 min (la consulta es cada 30 s).
    const { error: hbErr } = await createAdminClient()
      .from('restaurants')
      .update({ counter_seen_at: new Date().toISOString() })
      .eq('id', tenant.restaurantId)
      .or(`counter_seen_at.is.null,counter_seen_at.lt.${new Date(Date.now() - 60_000).toISOString()}`);
    if (hbErr) logger.warn('counter heartbeat failed', { error: hbErr.message });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select('orders_paused_until, busy_extra_minutes, busy_until')
    .eq('id', tenant.restaurantId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  const raw = (data?.orders_paused_until as string | null) ?? null;
  const ms = raw ? new Date(raw).getTime() : NaN;
  const busyRaw = (data?.busy_until as string | null) ?? null;
  const busyMs = busyRaw ? new Date(busyRaw).getTime() : NaN;
  const busyOn = Number.isFinite(busyMs) && busyMs > Date.now() && Number(data?.busy_extra_minutes) > 0;
  return NextResponse.json({
    pausedUntil: Number.isFinite(ms) && ms > Date.now() ? raw : null,
    busyExtra: busyOn ? Number(data?.busy_extra_minutes) : 0,
    busyUntil: busyOn ? busyRaw : null,
  });
}
