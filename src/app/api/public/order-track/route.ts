import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`order-track:${ip}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const orderNumber = searchParams.get('order');
  const restaurantId = searchParams.get('restaurant');
  // Opaque per-order token (driver_tracking_token). The order_number is sequential
  // and guessable, so PII (customer + driver fields) is ONLY returned when the caller
  // proves possession of this token. Without it, the response degrades to non-PII
  // status/items — closing the IDOR while keeping old (token-less) links working.
  const token = searchParams.get('t');

  if (!orderNumber || !restaurantId) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  if (!UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: 'invalid_restaurant' }, { status: 400 });
  }

  try {
    // Admin client is intentional here (AUDIT2 S1b — accepted with mitigation).
    // Public order tracking needs the order + its order_items join, which anon RLS
    // cannot satisfy (public_read_order_items requires restaurant ownership). Hardened
    // as a server-side gateway: IP rate limit (30/60s), UUID-validated restaurant_id,
    // lookup scoped to order_number + restaurant_id, and an explicit field allowlist
    // below. Equivalent in trust to a SECURITY DEFINER RPC.
    const db = createAdminClient();

    // Only select fields needed for the tracking UI — never expose payment tokens or internal tokens.
    // driver_tracking_token is selected solely to authenticate the caller; it is NOT returned.
    const { data: order, error } = await db
      .from('orders')
      .select(`
        id, order_number, status, order_type, total, tax_amount, tip_amount,
        delivery_fee, discount_amount, payment_method, notes, created_at, updated_at,
        customer_name, customer_phone, customer_email, delivery_address,
        estimated_ready_minutes,
        driver_name, driver_phone, driver_assigned_at,
        driver_lat, driver_lng, driver_picked_up_at, driver_at_door_at, driver_delivered_at,
        delivery_photo_url, driver_tracking_token,
        table:table_id(name),
        order_items(
          id, qty, unit_price, line_total, notes,
          product:product_id(name),
          variant:variant_id(name)
        )
      `)
      .eq('order_number', orderNumber)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (error) {
      log.error('[order-track] DB query failed', { orderNumber, restaurantId, error: error.message });
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (!order) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Authenticated only if the caller presents the matching opaque token.
    // order_number is sequential/guessable, so without the token we must not leak PII.
    const orderToken = (order as any).driver_tracking_token as string | null;
    const authorized = !!token && !!orderToken && token === orderToken;

    // Strip the token from the payload regardless — it must never reach the client.
    const { driver_tracking_token: _omit, ...safeOrder } = order as any;

    const shaped = {
      ...safeOrder,
      // PII is returned only to a caller holding the token. Otherwise null it out —
      // status, items, totals and ETA stay visible so the tracker still works.
      customer_name: authorized ? safeOrder.customer_name : null,
      customer_phone: authorized ? safeOrder.customer_phone : null,
      customer_email: authorized ? safeOrder.customer_email : null,
      delivery_address: authorized ? safeOrder.delivery_address : null,
      driver_name: authorized ? safeOrder.driver_name : null,
      driver_phone: authorized ? safeOrder.driver_phone : null,
      authorized,
      table_name: (order.table as any)?.name ?? null,
      order_items: ((order.order_items ?? []) as any[]).map((item: any) => ({
        id: item.id,
        qty: item.qty,
        unit_price: item.unit_price,
        line_total: item.line_total,
        notes: item.notes,
        product_name: item.product?.name ?? null,
        variant_name: item.variant?.name ?? null,
      })),
    };

    return NextResponse.json(shaped);
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
