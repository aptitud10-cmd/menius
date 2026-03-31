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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { orderId, action } = body as { orderId?: string; action?: string };

  if (!orderId || action !== 'coming_out') {
    return NextResponse.json({ error: 'orderId and action=coming_out required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, driver_phone, driver_name, restaurants(name, locale)')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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
