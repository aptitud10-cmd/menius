/**
 * Driver location update — public endpoint (no auth).
 * The driver uses a unique token embedded in their tracking link.
 * POST { token, lat, lng }
 *
 * Scale path:
 *   1. Token validated via Redis cache (token_prefix → {orderId, expiresAt}).
 *      Cache miss falls back to Postgres — O(log n) via partial index.
 *      Cache hit avoids 1 DB round-trip per GPS ping entirely.
 *   2. GPS writes go to order_location_latest (narrow table, 1 row/order,
 *      upsert ON CONFLICT). A DB trigger syncs driver_lat/lng back to orders
 *      for backward compatibility.
 *   3. Broadcast sent fire-and-forget via Supabase HTTP Broadcast API.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { broadcastDriverLocation } from '@/lib/realtime/broadcast-order';

// ── Redis token cache ─────────────────────────────────────────────────────────
// Lazy-imported so the module works without Redis configured.

interface TokenCacheEntry { orderId: string; expiresAt: string | null }

async function getCachedToken(tokenPrefix: string): Promise<TokenCacheEntry | null> {
  try {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    const redis = new Redis({ url, token });
    const raw = await redis.get<TokenCacheEntry>(`dtoken:${tokenPrefix}`);
    return raw ?? null;
  } catch {
    return null;
  }
}

async function setCachedToken(tokenPrefix: string, entry: TokenCacheEntry): Promise<void> {
  try {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const tok = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !tok) return;
    const redis = new Redis({ url, token: tok });
    // Cache for 2 hours — tokens last 24h typically, but we invalidate on delivery
    await redis.set(`dtoken:${tokenPrefix}`, entry, { ex: 7_200 });
  } catch { /* silent — falls back to DB on next request */ }
}

// Call this when a delivery is completed or cancelled to evict the cache entry.
export async function evictTokenCache(tokenPrefix: string): Promise<void> {
  try {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const tok = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !tok) return;
    const redis = new Redis({ url, token: tok });
    await redis.del(`dtoken:${tokenPrefix}`);
  } catch { /* silent */ }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, lat, lng } = body as { token?: string; lat?: number; lng?: number };

  // Rate limit per token (driver identity) — not per IP.
  // IP-based limiting breaks when multiple drivers share a carrier NAT or mobile network.
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

  // 1. Try Redis cache first — avoids 1 Postgres round-trip per GPS ping
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

    orderId = order.id;
    tokenExpiresAt = (order as any).driver_token_expires_at ?? null;

    // Populate cache for all subsequent pings from this driver
    await setCachedToken(tokenPrefix, { orderId, expiresAt: tokenExpiresAt });
  }

  // 2. Validate expiry
  if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  // 3. Write GPS to order_location_latest (narrow hot-path table).
  //    A DB trigger syncs driver_lat/lng back to orders for backward compatibility.
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
