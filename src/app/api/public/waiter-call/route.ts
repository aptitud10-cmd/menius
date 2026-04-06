/**
 * POST /api/public/waiter-call
 * Customer taps "Call waiter" on dine-in order tracker.
 * Sends a WhatsApp notification to the restaurant's notification number.
 * Rate-limited: max 1 call per order per 3 minutes (checked in-memory per pod; safe for low volume).
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsApp } from '@/lib/notifications/whatsapp';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);

  // Per-IP rate limit shared via Redis: max 10 waiter calls per minute globally.
  const ipRl = await checkRateLimitAsync(`waiter-call:${ip}`, { limit: 10, windowSec: 60 });
  if (!ipRl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { orderId } = body as { orderId?: string };

  if (!orderId || !UUID_RE.test(String(orderId))) {
    return NextResponse.json({ error: 'orderId must be a valid UUID' }, { status: 400 });
  }

  // Per-order cooldown via Redis: max 1 call per order per 3 minutes.
  const orderRl = await checkRateLimitAsync(`waiter-call:order:${orderId}`, { limit: 1, windowSec: 180 });
  if (!orderRl.allowed) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, table_name, restaurants(name, notification_whatsapp, locale)')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const restaurant = (order as any).restaurants;
  const notifPhone: string | null = restaurant?.notification_whatsapp ?? null;
  const locale = restaurant?.locale ?? 'es';
  const en = locale === 'en';
  const tablePart = (order as any).table_name
    ? (en ? `Table ${(order as any).table_name}` : `Mesa ${(order as any).table_name}`)
    : (en ? 'a table' : 'una mesa');

  if (!notifPhone) {
    return NextResponse.json({ ok: true, notified: false });
  }

  const text = en
    ? `🙋 ${restaurant?.name ?? 'Restaurant'}: Customer at ${tablePart} (order #${order.order_number} — ${order.customer_name}) is requesting assistance.`
    : `🙋 ${restaurant?.name ?? 'Restaurante'}: El cliente en ${tablePart} (pedido #${order.order_number} — ${order.customer_name}) está solicitando atención.`;

  sendWhatsApp({ to: notifPhone, text }).catch(() => {});

  return NextResponse.json({ ok: true, notified: true });
}
