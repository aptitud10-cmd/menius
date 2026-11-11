/**
 * Driver location update — public endpoint (no auth).
 * The driver uses a unique token embedded in their tracking link.
 * POST { token, lat, lng }
 *
 * Scale path:
 *   1. Token validated via Redis cache (token_prefix → {orderId, expiresAt}).
 *      Cache miss falls back to Postgres — O(log n) via partial index.
 *   2. GPS writes go to order_location_latest (narrow table, 1 row/order).
 *      A DB trigger syncs driver_lat/lng back to orders for backward compat.
 *   3. Broadcast sent fire-and-forget via Supabase HTTP Broadcast API.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { broadcastDriverLocation } from '@/lib/realtime/broadcast-order';
import { getCachedToken, setCachedToken } from '@/lib/tracking/token-cache';
import { MAX_ROUTE_ORDERS, parseRouteTokens } from '@/lib/orders/driver-route';

type Resolved = { orderId: string } | { error: string; status: number };

/** Token → pedido (Redis primero, Postgres si no está). Mismas guardas de siempre. */
async function resolveToken(supabase: ReturnType<typeof createAdminClient>, token: string): Promise<Resolved> {
  const tokenPrefix = token.slice(0, 16);
  let orderId: string | null = null;
  let tokenExpiresAt: string | null = null;

  const cached = await getCachedToken(tokenPrefix);
  if (cached) {
    orderId = cached.orderId;
    tokenExpiresAt = cached.expiresAt;
  } else {
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_type, status, driver_token_expires_at')
      .eq('driver_tracking_token', token)
      .maybeSingle();
    if (!order) return { error: 'Invalid token', status: 404 };
    // Solo delivery acepta pings de GPS (si no, se inyectan coordenadas en un pickup).
    if ((order as any).order_type !== 'delivery') return { error: 'Location is only valid for delivery orders', status: 409 };
    // Cerrado o cancelado: no más GPS. Al cerrar se invalida la caché.
    if (['delivered', 'completed', 'cancelled'].includes((order as any).status)) return { error: 'Order closed', status: 409 };
    orderId = order.id as string;
    tokenExpiresAt = (order as any).driver_token_expires_at ?? null;
    await setCachedToken(tokenPrefix, { orderId, expiresAt: tokenExpiresAt });
  }
  if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) return { error: 'Token expired', status: 410 };
  return { orderId };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token: oneToken, tokens: manyTokens, lat, lng } = body as { token?: string; tokens?: unknown; lat?: number; lng?: number };

  // Ruta: un solo GPS para todos los pedidos del viaje (≤4 tokens).
  if (manyTokens !== undefined) return postMany(req, manyTokens, lat, lng);
  const token = oneToken;

  // Rate limit per token (driver identity) — not per IP.
  const rlKey = token ? `driver-location:${token.slice(0, 16)}` : `driver-location:ip:${getClientIP(req)}`;
  // 60/min: con throttle de 2s en el cliente el driver postea ~30/min en
  // movimiento; el doble deja holgura para reintentos sin cortar con 429.
  const rl = await checkRateLimitAsync(rlKey, { limit: 60, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!token || lat == null || lng == null) {
    return NextResponse.json({ error: 'token, lat and lng are required' }, { status: 400 });
  }
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng must be finite numbers' }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'lat must be -90..90 and lng must be -180..180' }, { status: 400 });
  }

  const tokenPrefix = token.slice(0, 16);
  const supabase = createAdminClient();

  // 1. Try Redis cache — avoids 1 Postgres round-trip per GPS ping on hit
  let orderId: string | null = null;
  let tokenExpiresAt: string | null = null;

  const cached = await getCachedToken(tokenPrefix);
  if (cached) {
    orderId = cached.orderId;
    tokenExpiresAt = cached.expiresAt;
  } else {
    // Cache miss — hit Postgres (O(log n) via partial index on driver_tracking_token)
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_type, status, driver_token_expires_at')
      .eq('driver_tracking_token', token)
      .maybeSingle();

    if (!order) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

    // Solo delivery acepta pings de GPS. Sin esta guarda se pueden inyectar
    // coordenadas en un pedido de pickup con el token impreso en su ticket.
    if ((order as any).order_type !== 'delivery') {
      return NextResponse.json(
        { error: 'Location is only valid for delivery orders' },
        { status: 409 },
      );
    }

    // Pedido cerrado o cancelado: no más GPS. Al cerrar se invalida la caché
    // (updateOrderStatus / reembolso), así que el siguiente ping llega acá.
    if (['delivered', 'completed', 'cancelled'].includes((order as any).status)) {
      return NextResponse.json({ error: 'Order closed' }, { status: 409 });
    }

    orderId = order.id as string;
    tokenExpiresAt = (order as any).driver_token_expires_at ?? null;
    await setCachedToken(tokenPrefix, { orderId, expiresAt: tokenExpiresAt });
  }

  // 2. Validate expiry
  if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  // 3. Write GPS to order_location_latest — trigger syncs back to orders
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('order_location_latest')
    .upsert(
      { order_id: orderId, lat, lng, recorded_at: now, updated_at: now },
      { onConflict: 'order_id' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 4. Broadcast GPS coordinates — fire-and-forget
  void broadcastDriverLocation(orderId, lat, lng);

  return NextResponse.json({ ok: true });
}

async function postMany(req: NextRequest, raw: unknown, lat: unknown, lng: unknown) {
  const tokens = parseRouteTokens(raw);
  const first = tokens?.[0];
  const rl = await checkRateLimitAsync(
    first ? `driver-location:${first.slice(0, 16)}` : `driver-location:ip:${getClientIP(req)}`,
    { limit: 60, windowSec: 60 },
  );
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  if (!tokens || tokens.length === 0 || tokens.length > MAX_ROUTE_ORDERS) {
    return NextResponse.json({ error: `tokens must have 1..${MAX_ROUTE_ORDERS} items` }, { status: 400 });
  }
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)
    || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'lat/lng must be valid numbers' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const resolved = await Promise.all(tokens.map((t) => resolveToken(supabase, t)));
  const ids = resolved.flatMap((r) => ('orderId' in r ? [r.orderId] : []));
  // Por token: cuáles ya no aceptan GPS (entregado, cancelado, vencido) para que
  // el teléfono deje de mandarlos sin cortar los demás.
  const rejected = tokens.filter((_, i) => !('orderId' in resolved[i]));
  if (ids.length === 0) {
    const r = resolved[0] as { error: string; status: number };
    return NextResponse.json({ error: r.error, rejected }, { status: r.status });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('order_location_latest')
    .upsert(ids.map((order_id) => ({ order_id, lat, lng, recorded_at: now, updated_at: now })), { onConflict: 'order_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const id of ids) void broadcastDriverLocation(id, lat, lng);
  return NextResponse.json({ ok: true, rejected });
}
