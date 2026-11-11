/**
 * POST /api/driver/route — arma o reordena la ruta del repartidor.
 * Body: { tokens: string[] (1..4, en orden de entrega), release?: string[] }
 *
 * Público como el resto de /api/driver/*: la credencial es el token de cada
 * pedido (el QR de su ticket). Solo toca los pedidos cuyos tokens se presentan;
 * el batch_id nunca se devuelve ni sirve para leer otros pedidos.
 *  - tokens.length >= 2 → mismo batch_id, batch_seq = posición (1..n)
 *  - tokens.length == 1 → ese pedido sale de cualquier ruta
 *  - release            → esos pedidos salen de la ruta (el repartidor los quitó)
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { broadcastOrderUpdate } from '@/lib/realtime/broadcast-order';
import {
  MAX_ROUTE_ORDERS, chooseBatchId, parseRouteTokens, validateRoute, type RouteOrderRow,
} from '@/lib/orders/driver-route';

const logger = createLogger('driver-route');
const SELECT = 'id, restaurant_id, order_type, status, driver_tracking_token, driver_token_expires_at, batch_id';

export async function POST(req: NextRequest) {
  const rl = await checkRateLimitAsync(`driver-route:${getClientIP(req)}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { tokens?: unknown; release?: unknown };
  const tokens = parseRouteTokens(body.tokens);
  const release = body.release === undefined ? [] : parseRouteTokens(body.release);
  if (!tokens || tokens.length === 0 || !release) {
    return NextResponse.json({ error: 'tokens must be a non-empty array of strings' }, { status: 400 });
  }
  if (tokens.length > MAX_ROUTE_ORDERS) {
    return NextResponse.json({ error: 'Too many orders', reason: 'too_many' }, { status: 409 });
  }
  if (release.length > MAX_ROUTE_ORDERS) {
    return NextResponse.json({ error: 'release too long' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('orders').select(SELECT).in('driver_tracking_token', tokens);
  if (error) {
    logger.error('route lookup failed', { message: error.message });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
  const rows = (data ?? []) as RouteOrderRow[];

  const problem = validateRoute(tokens, rows);
  if (problem) {
    const status = problem.reason === 'not_found' ? 404 : problem.reason === 'expired' ? 410 : 409;
    return NextResponse.json({ error: 'Invalid route', reason: problem.reason, token: problem.token }, { status });
  }

  const byToken = new Map(rows.map((r) => [r.driver_tracking_token as string, r]));
  const ordered = tokens.map((t) => byToken.get(t)!);
  const batchId = ordered.length >= 2 ? chooseBatchId(ordered, randomUUID) : null;
  const now = new Date().toISOString();

  // ≤4 filas: un update por pedido (batch_seq distinto en cada uno).
  const results = await Promise.all(ordered.map((r, i) =>
    supabase.from('orders')
      .update({ batch_id: batchId, batch_seq: batchId ? i + 1 : null, updated_at: now })
      .eq('id', r.id)
      .eq('driver_tracking_token', r.driver_tracking_token as string),
  ));
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    logger.error('route update failed', { message: failed.error.message });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  // Pedidos que el repartidor quitó de la ruta (también por su token).
  const toRelease = release.filter((t) => !tokens.includes(t));
  if (toRelease.length) {
    const { error: relErr } = await supabase.from('orders')
      .update({ batch_id: null, batch_seq: null, updated_at: now })
      .in('driver_tracking_token', toRelease);
    if (relErr) logger.warn('route release failed', { message: relErr.message });
  }

  // El seguimiento de cada cliente recalcula "paradas antes de la tuya".
  for (const r of ordered) void broadcastOrderUpdate(r.id, r.status);

  return NextResponse.json({ ok: true, count: ordered.length });
}
