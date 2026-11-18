/**
 * Ubicación del repartidor desde la app nativa (uploader de Transistorsoft).
 * POST { location: Location | Location[], tokens: string[] }
 *
 * El teléfono guarda cada punto en SQLite y lo borra SOLO si este endpoint
 * responde 2xx; si no, lo reintenta (al volver la señal, en el heartbeat, al
 * reiniciar). Por eso:
 *   - Datos inválidos o tokens cerrados → 200 igual (si no, el teléfono los
 *     reintenta para siempre). Los tokens que ya no aceptan GPS vuelven en
 *     `rejected` para que la app deje de mandarlos.
 *   - 429 / 500 → el teléfono reintenta más tarde, que es lo que queremos.
 *
 * El endpoint web (/api/driver/location, un punto por request) sigue para la PWA.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { broadcastDriverLocation } from '@/lib/realtime/broadcast-order';
import { MAX_ROUTE_ORDERS, parseRouteTokens } from '@/lib/orders/driver-route';
import { resolveDriverToken } from '@/lib/tracking/resolve-driver-token';
import { latestFix } from '@/lib/tracking/native-locations';
import { createLogger } from '@/lib/logger';

const logger = createLogger('driver-locations');

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { location?: unknown; tokens?: unknown } | null;
  if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' });

  const tokens = parseRouteTokens(body.tokens);
  // Sin entregas activas (puntos que quedaron en cola): se descartan sin error.
  if (!tokens || tokens.length === 0) return NextResponse.json({ ok: true, rejected: [] });
  if (tokens.length > MAX_ROUTE_ORDERS) {
    return NextResponse.json({ ok: false, error: `tokens must have 1..${MAX_ROUTE_ORDERS} items` });
  }

  // Un lote cada ~4 s en movimiento (≈15/min) + heartbeat; 60/min deja holgura.
  const rl = await checkRateLimitAsync(`driver-location:${tokens[0].slice(0, 16)}`, { limit: 60, windowSec: 60 });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = createAdminClient();
  const resolved = await Promise.all(tokens.map((t) => resolveDriverToken(supabase, t)));
  const ids = resolved.flatMap((r) => ('orderId' in r ? [r.orderId] : []));
  const rejected = tokens.filter((_, i) => !('orderId' in resolved[i]));

  const fix = latestFix(body.location);
  if (!fix || ids.length === 0) return NextResponse.json({ ok: true, rejected });

  // Lotes que llegan tarde (cola offline) no pisan un punto más nuevo.
  const { data: current, error: readErr } = await supabase
    .from('order_location_latest')
    .select('order_id, recorded_at')
    .in('order_id', ids);
  if (readErr) {
    logger.error('driver/locations read failed', { error: readErr.message });
    return NextResponse.json({ error: 'read failed' }, { status: 500 });
  }
  const newerThanStored = (id: string) => {
    const row = (current ?? []).find((r) => r.order_id === id) as { recorded_at?: string } | undefined;
    return !row?.recorded_at || Date.parse(row.recorded_at) < Date.parse(fix.recordedAt);
  };
  const fresh = ids.filter(newerThanStored);
  if (fresh.length === 0) return NextResponse.json({ ok: true, rejected });

  // updated_at = hora del GPS (el trigger la copia a orders.driver_updated_at):
  // un punto que llega tarde no se muestra como "recién actualizado".
  const { error } = await supabase
    .from('order_location_latest')
    .upsert(
      fresh.map((order_id) => ({
        order_id, lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy,
        recorded_at: fix.recordedAt, updated_at: fix.recordedAt,
      })),
      { onConflict: 'order_id' },
    );
  if (error) {
    logger.error('driver/locations upsert failed', { error: error.message });
    return NextResponse.json({ error: 'write failed' }, { status: 500 });
  }

  for (const id of fresh) void broadcastDriverLocation(id, fix.lat, fix.lng);
  return NextResponse.json({ ok: true, rejected });
}
