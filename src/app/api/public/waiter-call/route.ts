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

// Simple in-memory cooldown map: orderId → last call timestamp
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { orderId } = body as { orderId?: string };

  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }

  // Cooldown check
  const last = cooldowns.get(orderId) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json({ ok: true, throttled: true });
  }
  cooldowns.set(orderId, Date.now());

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
