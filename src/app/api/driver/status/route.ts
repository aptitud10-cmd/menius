/**
 * Driver status update — public endpoint (no auth).
 * Uses the per-delivery token to identify the order.
 * POST { token, action: 'picked_up' | 'at_door' | 'delivered' | 'notify_outside' }
 *
 * picked_up      → sets driver_picked_up_at, notifies customer "Your order is on its way"
 * at_door        → sets driver_at_door_at, notifies customer "Your driver is at the door"
 * delivered      → sets driver_delivered_at, updates order status to 'delivered', full notification stack
 * notify_outside → sends "your order is outside" message without changing any DB state
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsApp } from '@/lib/notifications/whatsapp';
import { sendSMS, resolveChannel } from '@/lib/notifications/sms';

type DriverAction = 'picked_up' | 'at_door' | 'delivered' | 'notify_outside';

const ALLOWED_ACTIONS: DriverAction[] = ['picked_up', 'at_door', 'delivered', 'notify_outside'];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, action } = body as { token?: string; action?: DriverAction };

  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });
  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'action must be picked_up | at_door | delivered | notify_outside' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch the order by token
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, order_type, customer_phone, customer_name, customer_email, order_number, restaurant_id, delivery_address, driver_token_expires_at, driver_picked_up_at, driver_at_door_at, restaurants(name, locale, slug, currency)')
    .eq('driver_tracking_token', token)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found for this token' }, { status: 404 });
  }

  // Reject expired tokens (allow 'delivered' action even if expired so driver can still complete)
  const expiry = (order as any).driver_token_expires_at;
  if (action !== 'delivered' && expiry && new Date(expiry) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
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
    // Also advance status to 'ready' so the customer tracker shows "On its way"
    updateData = { driver_picked_up_at: now, status: 'ready' };
    // Only notify if this is the first time (prevents duplicate WhatsApp if two drivers tap the same link)
    shouldNotify = !(order as any).driver_picked_up_at;
    notificationText = en
      ? `${restaurantName}: Your order is on its way! 🛵\nTrack your order: ${trackingUrl}`
      : `${restaurantName}: ¡Tu pedido está en camino! 🛵\nSigue tu pedido: ${trackingUrl}`;
  }

  if (action === 'at_door') {
    updateData = { driver_at_door_at: now };
    // Only notify if this is the first time (prevents duplicate WhatsApp if two drivers tap the same link)
    shouldNotify = !(order as any).driver_at_door_at;
    notificationText = en
      ? `${restaurantName}: Your delivery driver has arrived! 🚪 Please come to the door.`
      : `${restaurantName}: ¡Tu repartidor está en la puerta! 🚪 Por favor acércate a la puerta.`;
  }

  if (action === 'notify_outside') {
    // Fire-and-forget message — no DB state change
    shouldNotify = true;
    notificationText = en
      ? `${restaurantName}: Your order is outside! Please come to receive it. 📦`
      : `${restaurantName}: ¡Tu pedido está afuera! Por favor sal a recibirlo. 📦`;
  }

  if (action === 'delivered') {
    // Only update if not already delivered/cancelled
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return NextResponse.json({ ok: true, skipped: true, action });
    }
    // Single update: status + timestamp together
    const { error: statusErr } = await supabase
      .from('orders')
      .update({ status: 'delivered', driver_delivered_at: now })
      .eq('id', order.id);

    if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 500 });

    // Full notification stack (WhatsApp + email + push + log) via notifyStatusChange
    try {
      const { notifyStatusChange } = await import('@/lib/notifications/order-notifications');
      await notifyStatusChange({
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId: order.restaurant_id,
        status: 'delivered',
        customerName: order.customer_name,
        customerEmail: (order as any).customer_email || undefined,
        customerPhone: order.customer_phone || undefined,
        orderType: (order as any).order_type || undefined,
        deliveryAddress: (order as any).delivery_address || undefined,
      });
    } catch (err) {
      console.error('[DriverStatus] notifyStatusChange error on delivered:', err);
    }

    return NextResponse.json({ ok: true, action });
  }

  // Update driver timestamp fields (picked_up / at_door only — delivered handled above)
  if (Object.keys(updateData).length > 0) {
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
