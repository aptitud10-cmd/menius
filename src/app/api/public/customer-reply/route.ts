/**
 * POST /api/public/customer-reply
 * Customer-side action on an order. Currently supports:
 *   action: 'coming_out' — customer taps "Ya salgo" when driver is at the door.
 *     Notifies the driver via WhatsApp/SMS.
 *
 * No auth required — uses order_id + restaurant_id to look up the order.
 * Rate-limited per order to prevent spam.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsApp } from '@/lib/notifications/whatsapp';
import { sendSMS, resolveChannel } from '@/lib/notifications/sms';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';

const ALLOWED_ACTIONS = ['coming_out'] as const;

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`customer-reply:${ip}`, { limit: 10, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { orderId, action } = body as { orderId?: string; action?: string };

  if (!orderId || !action) {
    return NextResponse.json({ error: 'orderId and action required' }, { status: 400 });
  }

  if (!UUID_RE.test(String(orderId))) {
    return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
  }

  if (!ALLOWED_ACTIONS.includes(action as typeof ALLOWED_ACTIONS[number])) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  // Per-order rate limit: prevent spamming the driver for the same order
  const orderRl = await checkRateLimitAsync(`customer-reply:order:${orderId}`, { limit: 3, windowSec: 300 });
  if (!orderRl.allowed) {
    return NextResponse.json({ ok: true, notified: false, reason: 'cooldown' });
  }

  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, status, customer_name, driver_phone, driver_name, restaurants(name, locale)')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Only allow "coming out" notification when order is actually out for delivery
  if (action === 'coming_out' && !['delivering', 'out_for_delivery', 'ready'].includes((order as any).status ?? '')) {
    return NextResponse.json({ ok: true, notified: false, reason: 'wrong_status' });
  }

  const driverPhone: string | null = (order as any).driver_phone ?? null;
  const driverName: string | null = (order as any).driver_name ?? null;
  const restaurant = (order as any).restaurants;
  const locale = restaurant?.locale ?? 'es';
  const en = locale === 'en';

  if (!driverPhone) {
    // No driver phone — still return ok so the UI shows feedback
    return NextResponse.json({ ok: true, notified: false });
  }

  const greeting = driverName ? (en ? `Hi ${driverName}` : `Hola ${driverName}`) : (en ? 'Hi' : 'Hola');
  const text = en
    ? `${greeting}! The customer (${order.customer_name}) is coming out to receive the order. Please wait a moment. 🚪`
    : `${greeting}! El cliente (${order.customer_name}) ya sale a recibir el pedido. Por favor espera un momento. 🚪`;

  const channel = resolveChannel(driverPhone);
  if (channel === 'sms') {
    sendSMS({ to: driverPhone, text }).catch(() => {});
  } else {
    sendWhatsApp({ to: driverPhone, text }).catch(() => {});
  }

  return NextResponse.json({ ok: true, notified: true });
}
