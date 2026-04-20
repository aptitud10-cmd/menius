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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, lat, lng } = body as { token?: string; lat?: number; lng?: number };

  // Rate limit per token (driver identity) — not per IP.
  const rlKey = token ? `driver-location:${token.slice(0, 16)}` : `driver-location:ip:${getClientIP(req)}`;
  const rl = await checkRateLimitAsync(rlKey, { limit: 30, windowSec: 60 });
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
      .select('id, driver_token_expires_at')
      .eq('driver_tracking_token', token)
      .maybeSingle();

    if (!order) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

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
