/**
 * GET /api/driver/order?token=xxx
 * Returns minimal order info (delivery address, customer name) for the driver page.
 * No auth required — uses the per-delivery token.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`driver-order:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const token = req.nextUrl.searchParams.get('token');
  if (!token || token.length > 200) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, order_type, delivery_address, customer_name, customer_phone, order_number,
      total, payment_method, payment_status, notes, delivery_lat, delivery_lng, delivery_photo_url,
      driver_token_expires_at, driver_picked_up_at, driver_at_door_at, driver_delivered_at,
      restaurants(name, phone, currency, locale),
      order_items(qty, notes, product:product_id(name), variant:variant_id(name))
    `)
    .eq('driver_tracking_token', token)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const expired = data.driver_token_expires_at && new Date(data.driver_token_expires_at) < new Date();
  if (expired) return NextResponse.json({ error: 'Token expired' }, { status: 410 });

  return NextResponse.json({
    orderId: data.id,
    orderStatus: data.status,
    deliveryAddress: data.delivery_address ?? null,
    customerName: data.customer_name ?? null,
    customerPhone: data.customer_phone ?? null,
    orderNumber: data.order_number ?? null,
    restaurantName: (data as any).restaurants?.name ?? null,
    driverPickedUpAt: (data as any).driver_picked_up_at ?? null,
    driverAtDoorAt: (data as any).driver_at_door_at ?? null,
    driverDeliveredAt: (data as any).driver_delivered_at ?? null,
    // Lo que el repartidor necesita en la calle: cuánto cobrar (Buccaneer:
    // 100% de los deliveries en efectivo), las notas del cliente (apto,
    // timbre), qué lleva la bolsa y a quién llamar si hay un problema.
    total: Number((data as any).total ?? 0),
    paymentMethod: (data as any).payment_method ?? null,
    paymentStatus: (data as any).payment_status ?? null,
    notes: ((data as any).notes as string | null)?.trim() || null,
    deliveryLat: (data as any).delivery_lat ?? null,
    deliveryLng: (data as any).delivery_lng ?? null,
    deliveryPhotoUrl: (data as any).delivery_photo_url ?? null,
    restaurantPhone: ((data as any).restaurants?.phone as string | null)?.trim() || null,
    currency: (data as any).restaurants?.currency ?? 'USD',
    locale: (data as any).restaurants?.locale ?? null,
    items: (((data as any).order_items ?? []) as any[]).map((i) => ({
      qty: Number(i.qty ?? 1),
      name: [i.product?.name, i.variant?.name].filter(Boolean).join(' · ') || null,
    })),
  });
}
