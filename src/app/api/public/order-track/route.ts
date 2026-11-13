import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';
import { log } from '@/lib/logger';
import { liveLocationTopic } from '@/lib/realtime/live-topic';
import { fetchStopsAhead } from '@/lib/orders/driver-route';
import { customerItemLines } from '@/lib/modifier-lines';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`order-track:${ip}`, { limit: 60, windowSec: 60 });
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
    // customer_arrived_at llega con la migración 20261110c: si todavía no se
    // corrió, se reintenta sin esa columna en vez de romper el seguimiento.
    const BASE_SELECT = `
        id, order_number, status, order_type, total, tax_amount, tip_amount,
        delivery_fee, discount_amount, payment_method, payment_status, scheduled_for, notes, created_at, updated_at,
        customer_name, customer_phone, customer_email, delivery_address,
        estimated_ready_minutes, prepared_at, delivery_lat, delivery_lng,
        driver_name, driver_phone, driver_assigned_at,
        driver_lat, driver_lng, driver_picked_up_at, driver_at_door_at, driver_delivered_at, driver_updated_at,
        delivery_photo_url, driver_tracking_token, customer_token, cancellation_reason, batch_id, batch_seq,
        table:table_id(name),
        order_items(
          id, qty, unit_price, line_total, notes, modifier_lines, product_id, variant_id,
          product:product_id(name),
          variant:variant_id(name, price_delta),
          order_item_modifiers(group_name, option_name, price_delta)
        )
      `;
    const runSelect = (extra: string) => db
      .from('orders')
      .select(extra ? BASE_SELECT.replace('driver_updated_at,', `driver_updated_at, ${extra},`) : BASE_SELECT)
      .eq('order_number', orderNumber)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    let res = await runSelect('customer_arrived_at');
    if (res.error && (res.error as { code?: string }).code === '42703') res = await runSelect('');
    const { error } = res;
    const order = res.data as any;

    if (error) {
      log.error('[order-track] DB query failed', { orderNumber, restaurantId, error: error.message });
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (!order) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Authenticated only if the caller presents the matching opaque token.
    // order_number is sequential/guessable, so without the token we must not leak PII.
    // customer_token is the canonical view token; the driver action token is also
    // accepted (strictly more privileged + old printed QRs still work).
    const custToken = (order as any).customer_token as string | null;
    const drvToken = (order as any).driver_tracking_token as string | null;
    const authorized = !!token && ((!!custToken && token === custToken) || (!!drvToken && token === drvToken));

    // Strip both tokens from the payload regardless — they must never reach the client.
    // El motivo de cancelación es texto libre del restaurante: no se devuelve.
    // Solo se expone si el sistema cerró el pedido solo (para el título).
    // La ruta (batch) nunca sale: solo el número de paradas antes de la suya.
    const { driver_tracking_token: _omit, customer_token: _omit2, cancellation_reason: reason, batch_id: _b, batch_seq: _s, ...safeOrder } = order as any;
    const stops_ahead = authorized ? await fetchStopsAhead(db, order) : 0;

    const shaped = {
      stops_ahead,
      ...safeOrder,
      // PII is returned only to a caller holding the token. Otherwise null it out —
      // status, items, totals and ETA stay visible so the tracker still works.
      customer_name: authorized ? safeOrder.customer_name : null,
      customer_phone: authorized ? safeOrder.customer_phone : null,
      customer_email: authorized ? safeOrder.customer_email : null,
      delivery_address: authorized ? safeOrder.delivery_address : null,
      driver_name: authorized ? safeOrder.driver_name : null,
      driver_phone: authorized ? safeOrder.driver_phone : null,
      // Ubicación en vivo del repartidor (cerca de la casa del cliente), foto de
      // la puerta y notas: también son privados. Sin token no se devuelven.
      driver_lat: authorized ? safeOrder.driver_lat : null,
      driver_lng: authorized ? safeOrder.driver_lng : null,
      delivery_photo_url: authorized ? safeOrder.delivery_photo_url : null,
      notes: authorized ? safeOrder.notes : null,
      delivery_lat: authorized ? safeOrder.delivery_lat : null,
      delivery_lng: authorized ? safeOrder.delivery_lng : null,
      authorized,
      auto_closed: reason === 'auto_closed',
      // Canal del GPS en vivo: solo con token (ver live-topic.ts).
      live_topic: authorized ? liveLocationTopic(order.id) : null,
      table_name: (order.table as any)?.name ?? null,
      order_items: ((order.order_items ?? []) as any[]).map((item: any) => ({
        id: item.id,
        qty: item.qty,
        unit_price: item.unit_price,
        line_total: item.line_total,
        notes: authorized ? item.notes : null,
        product_name: item.product?.name ?? null,
        variant_name: item.variant?.name ?? null,
        // Para "Pedir lo mismo" (ids del menú, no son datos privados).
        product_id: item.product_id ?? null,
        variant_id: item.variant_id ?? null,
        variant_price_delta: item.variant?.price_delta ?? null,
        // Lo que eligió (Deluxe, side, "No Onion"…): el cliente tiene que poder
        // confirmar su pedido. No es dato privado.
        modifiers: ((item.order_item_modifiers ?? []) as any[]).map((m: any) => ({ name: m.option_name as string, price_delta: Number(m.price_delta) || 0 })),
        // Con el formato del carrito y el ticket ("Cheeseburger Deluxe", una línea por cosa).
        ...customerItemLines(item),
      })),
    };

    return NextResponse.json(shaped);
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
