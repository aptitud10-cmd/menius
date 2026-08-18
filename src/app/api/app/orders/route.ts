export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('app:orders');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_LIMIT = 50;

/**
 * Order history for the Menius mobile app.
 *
 * The app used to query `orders` straight from the client, filtering by
 * customer_phone with the anon key. That could never work — the anon policy on
 * `orders` only exposes a single row matched by the `x-order-id` header, and the
 * embedded `restaurants` join has no SELECT grant for anon at all. So the
 * Pedidos tab always rendered an empty list.
 *
 * It also must not work: `customer_phone` as a client-supplied filter would let
 * anyone holding the (public) anon key page through other people's orders by
 * guessing phone numbers. Here the phone is never accepted from the request —
 * the server reads it from the device's own `app_devices` row, so a device can
 * only ever see the orders placed with the number it registered.
 *
 * Body: { device_uuid, limit? }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await checkRateLimitAsync(`app-orders:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { device_uuid, limit } = body as { device_uuid?: string; limit?: number };

    if (!device_uuid || !UUID_RE.test(String(device_uuid))) {
      return NextResponse.json({ error: 'device_uuid must be a valid UUID' }, { status: 400 });
    }

    const parsedLimit = Number(limit);
    const take = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.trunc(parsedLimit), 1), MAX_LIMIT)
      : MAX_LIMIT;

    const adminDb = createAdminClient();

    // The phone comes from the device's own row — never from the request body.
    const { data: device } = await adminDb
      .from('app_devices')
      .select('id, phone')
      .eq('device_uuid', device_uuid)
      .maybeSingle();

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // No phone on file yet: the customer hasn't completed their profile, so
    // there is nothing to match against. Not an error — just an empty history.
    const phone = typeof device.phone === 'string' ? device.phone.trim() : '';
    if (!phone) {
      return NextResponse.json({ orders: [] });
    }

    const { data, error } = await adminDb
      .from('orders')
      .select(
        'id, order_number, status, total, created_at, restaurant_id, restaurants(name, slug)',
      )
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })
      .limit(take);

    if (error) {
      logger.error('orders fetch failed', { error: error.message });
      return NextResponse.json({ error: 'Could not load orders' }, { status: 500 });
    }

    // Flatten the embedded restaurant so the app gets a stable shape regardless
    // of how PostgREST nests the join.
    const orders = (data ?? []).map((row) => {
      const { restaurants, ...order } = row as typeof row & {
        restaurants?: { name: string; slug: string } | { name: string; slug: string }[] | null;
      };
      const restaurant = Array.isArray(restaurants) ? (restaurants[0] ?? null) : (restaurants ?? null);
      return { ...order, restaurant };
    });

    return NextResponse.json({ orders });
  } catch (err) {
    logger.error('POST /api/app/orders failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
