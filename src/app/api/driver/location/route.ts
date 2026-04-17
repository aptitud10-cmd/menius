/**
 * Driver location update — public endpoint (no auth).
 * The driver uses a unique token embedded in their tracking link.
 * POST { token, lat, lng }
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { broadcastDriverLocation } from '@/lib/realtime/broadcast-order';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, lat, lng } = body as { token?: string; lat?: number; lng?: number };

  // Rate limit per token (driver identity) — not per IP.
  // IP-based limiting breaks when multiple drivers share a carrier NAT or office network.
  // Token is validated below; use a prefix to avoid leaking raw token into Redis keys.
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

  const supabase = createAdminClient();

  // Verify token exists and has not expired.
  // Index: orders_driver_tracking_token_idx (partial, WHERE NOT NULL) — O(log n).
  // At high scale (1000s concurrent deliveries), replace this SELECT with a
  // Redis cache: token_prefix → {orderId, expiresAt}, invalidated on delivery/cancel.
  const { data: order } = await supabase
    .from('orders')
    .select('id, driver_token_expires_at')
    .eq('driver_tracking_token', token)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (order.driver_token_expires_at && new Date(order.driver_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  const { error } = await supabase
    .from('orders')
    .update({ driver_lat: lat, driver_lng: lng, driver_updated_at: new Date().toISOString() })
    .eq('id', order.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Broadcast GPS coordinates directly to the customer tracking page.
  // Uses 'location_update' event with lat/lng payload so the map marker
  // moves instantly without a full HTTP refetch.
  // Fire-and-forget — response is returned immediately.
  void broadcastDriverLocation(order.id, lat, lng);

  return NextResponse.json({ ok: true });
}
