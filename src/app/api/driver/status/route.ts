/**
 * Driver status update — public endpoint (no auth).
 * Uses the per-delivery token to identify the order.
 * POST { token, action: 'picked_up' | 'at_door' | 'delivered' }
 *
 * picked_up  → sets driver_picked_up_at, notifies customer "Your order is on its way"
 * at_door    → sets driver_at_door_at, notifies customer "Your driver is at the door"
 * delivered  → sets driver_delivered_at, updates order status to 'delivered'
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsApp } from '@/lib/notifications/whatsapp';
import { sendSMS, resolveChannel } from '@/lib/notifications/sms';

type DriverAction = 'picked_up' | 'at_door' | 'delivered';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, action } = body as { token?: string; action?: DriverAction };

  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });
  if (!action || !['picked_up', 'at_door', 'delivered'].includes(action)) {
    return NextResponse.json({ error: 'action must be picked_up | at_door | delivered' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch the order by token
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, customer_phone, customer_name, order_number, delivery_address, restaurants(name, locale, slug, currency)')
    .eq('driver_tracking_token', token)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found for this token' }, { status: 404 });
  }

  const restaurant = (order as any).restaurants as {
    name: string; locale: string | null; slug: string; currency: string | null;
  } | null;

  const locale = restaurant?.locale ?? 'es';
  const en = locale === 'en';
  const restaurantName = restaurant?.name ?? 'Restaurant';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app').replace(/\/$/, '');
  const trackingUrl = `${appUrl}/${restaurant?.slug}/orden/${order.order_number}`;

  const now = new Date().toISOString();
  let updateData: Record<string, unknown> = {};
  let notificationText = '';
  let shouldNotify = false;

  if (action === 'picked_up') {
    updateData = { driver_picked_up_at: now };
    shouldNotify = true;
    notificationText = en
      ? `${restaurantName}: Your order is on its way! 🛵\nTrack your order: ${trackingUrl}`
      : `${restaurantName}: ¡Tu pedido está en camino! 🛵\nSigue tu pedido: ${trackingUrl}`;
  }

  if (action === 'at_door') {
    updateData = { driver_at_door_at: now };
    shouldNotify = true;
    notificationText = en
      ? `${restaurantName}: Your delivery driver has arrived! 🚪 Please come to the door.`
      : `${restaurantName}: ¡Tu repartidor está en la puerta! 🚪 Por favor acércate a la puerta.`;
  }

  if (action === 'delivered') {
    // Only update if not already delivered/cancelled
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return NextResponse.json({ ok: true, skipped: true });
    }
    updateData = { driver_delivered_at: now };

    // Also update order status to delivered
    const { error: statusErr } = await supabase
      .from('orders')
      .update({ status: 'delivered', driver_delivered_at: now })
      .eq('id', order.id);

    if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 500 });

    shouldNotify = true;
    notificationText = en
      ? `${restaurantName}: Your order has been delivered. Enjoy your meal! 🍽️`
      : `${restaurantName}: ¡Tu pedido ha sido entregado! Buen provecho 🍽️`;
  }

  // Update driver timestamp fields
  if (Object.keys(updateData).length > 0 && action !== 'delivered') {
    const { error: updateErr } = await supabase
      .from('orders')
      .update(updateData)
      .eq('driver_tracking_token', token);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Send customer notification (fire-and-forget, don't block the response)
  if (shouldNotify && order.customer_phone && notificationText) {
    const channel = resolveChannel(order.customer_phone);
    if (channel === 'sms') {
      sendSMS({ to: order.customer_phone, text: notificationText }).catch(() => {});
    } else {
      sendWhatsApp({ to: order.customer_phone, text: notificationText }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, action });
}
