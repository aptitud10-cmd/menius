/**
 * POST /api/public/waiter-call
 * Customer taps "Call waiter" on dine-in order tracker.
 * Creates an in-app dashboard notification for the restaurant.
 * Rate-limited: max 1 call per order per 3 minutes.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);

  const ipRl = await checkRateLimitAsync(`waiter-call:${ip}`, { limit: 10, windowSec: 60 });
  if (!ipRl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { orderId } = body as { orderId?: string };

  if (!orderId || !UUID_RE.test(String(orderId))) {
    return NextResponse.json({ error: 'orderId must be a valid UUID' }, { status: 400 });
  }

  const orderRl = await checkRateLimitAsync(`waiter-call:order:${orderId}`, { limit: 1, windowSec: 180 });
  if (!orderRl.allowed) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, order_type, status, customer_name, table_name, restaurant_id, restaurants(name, locale)')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Only dine-in orders can call a waiter
  if ((order as any).order_type !== 'dine_in') {
    return NextResponse.json({ error: 'Waiter call only available for dine-in orders' }, { status: 400 });
  }

  // Silently ignore calls on completed or cancelled orders
  if (['delivered', 'cancelled'].includes((order as any).status)) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const restaurant = (order as any).restaurants;
  const locale = restaurant?.locale ?? 'es';
  const en = locale === 'en';
  const tablePart = (order as any).table_name
    ? (en ? `Table ${(order as any).table_name}` : `Mesa ${(order as any).table_name}`)
    : (en ? 'a table' : 'una mesa');

  const { createDashboardNotification } = await import('@/lib/notifications/dashboard-notifications');
  createDashboardNotification({
    restaurantId: order.restaurant_id,
    type: 'system',
    title: en
      ? `🙋 Waiter requested — ${tablePart}`
      : `🙋 Mesero solicitado — ${tablePart}`,
    body: en
      ? `Customer ${order.customer_name} (order #${order.order_number}) is requesting assistance.`
      : `El cliente ${order.customer_name} (pedido #${order.order_number}) está solicitando atención.`,
    actionUrl: '/app/orders',
    metadata: { order_id: order.id, order_number: order.order_number },
  }).catch(() => {});

  return NextResponse.json({ ok: true, notified: true });
}
