export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

const logger = createLogger('orders-status');

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('order_number');
    const restaurantId = searchParams.get('restaurant_id');
    // Opaque per-order token (driver_tracking_token). order_number is sequential
    // and guessable, so PII (customer + driver fields) is ONLY returned when the
    // caller proves possession of this token. Without it the response degrades to
    // non-PII status/items — closing the IDOR while keeping token-less callers
    // working. Mirrors the hardening already applied to /api/public/order-track.
    const token = searchParams.get('t');

    // Two-layer rate limit:
    //   1. Per IP (shared Redis) — prevents distributed enumeration
    //   2. Per IP+restaurant — prevents targeting a single restaurant's order sequence
    const [globalRl, scopedRl] = await Promise.all([
      checkRateLimitAsync(`order-status:${ip}`, { limit: 30, windowSec: 60 }),
      checkRateLimitAsync(`order-status:${ip}:${restaurantId ?? 'none'}`, { limit: 10, windowSec: 60 }),
    ]);
    if (!globalRl.allowed || !scopedRl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!orderNumber || !restaurantId) {
      return NextResponse.json({ error: 'order_number y restaurant_id requeridos' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Use the SECURITY DEFINER RPC function — works with anon key even if
    // service-role key is missing, because the function bypasses RLS internally.
    const { data: rows, error } = await adminDb
      .rpc('get_order_tracking', {
        p_order_number: orderNumber,
        p_restaurant_id: restaurantId,
      });

    if (error) {
      logger.error('order fetch error', { error: error.message, orderNumber, restaurantId });
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }
    // get_order_tracking returns a single jsonb object (not an array)
    const order = Array.isArray(rows) ? (rows[0] ?? null) : (rows ?? null);
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Authenticated only if the caller presents the matching opaque token.
    const orderToken = (order as { driver_tracking_token?: string | null }).driver_tracking_token ?? null;
    const authorized = !!token && !!orderToken && token === orderToken;

    // Strip the token from the payload regardless — it must never reach the client.
    const { driver_tracking_token: _omit, ...safeOrder } = order as Record<string, unknown>;

    // Fetch items separately so a join failure never blocks the tracker
    let order_items: unknown[] = [];
    try {
      const { data: items } = await adminDb
        .from('order_items')
        .select(`
          id, qty, unit_price, line_total, notes,
          products ( name, image_url ),
          product_variants ( name ),
          order_item_extras ( price, product_extras ( name ) ),
          order_item_modifiers ( group_name, option_name, price_delta )
        `)
        .eq('order_id', (order as { id: string }).id);
      order_items = items ?? [];
    } catch (itemsErr) {
      logger.warn('order_items fetch failed — returning order without items', {
        order_id: (order as { id: string }).id,
        error: itemsErr instanceof Error ? itemsErr.message : String(itemsErr),
      });
    }

    // PII is returned only to a caller holding the token. Otherwise null it out —
    // status, items, totals and ETA stay visible so the tracker still works.
    const shaped = {
      ...safeOrder,
      customer_name: authorized ? safeOrder.customer_name : null,
      customer_phone: authorized ? safeOrder.customer_phone : null,
      customer_email: authorized ? safeOrder.customer_email : null,
      delivery_address: authorized ? safeOrder.delivery_address : null,
      driver_name: authorized ? safeOrder.driver_name : null,
      driver_phone: authorized ? safeOrder.driver_phone : null,
      authorized,
      order_items,
    };

    return NextResponse.json({ order: shaped });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
