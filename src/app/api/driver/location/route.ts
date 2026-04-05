/**
 * Driver location update — public endpoint (no auth).
 * The driver uses a unique token embedded in their tracking link.
 * POST { token, lat, lng }
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`driver-location:${ip}`, { limit: 120, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { token, lat, lng } = body as { token?: string; lat?: number; lng?: number };

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

  // Verify token exists and has not expired
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
  return NextResponse.json({ ok: true });
}
