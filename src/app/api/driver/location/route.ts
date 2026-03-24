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
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat/lng must be numbers' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('orders')
    .update({ driver_lat: lat, driver_lng: lng, driver_updated_at: new Date().toISOString() })
    .eq('driver_tracking_token', token);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
