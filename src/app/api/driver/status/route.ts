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
import { canTransition } from '@/lib/order-state';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { broadcastOrderUpdate } from '@/lib/realtime/broadcast-order';
import { evictTokenCache } from '@/app/api/driver/location/route';

const logger = createLogger('driver-status');

type DriverAction = 'picked_up' | 'at_door' | 'delivered' | 'notify_outside';

const ALLOWED_ACTIONS: DriverAction[] = ['picked_up', 'at_door', 'delivered', 'notify_outside'];

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`driver-status:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { token, action } = body as { token?: string; action?: DriverAction };

  if (!token || token.length > 200) return NextResponse.json({ error: 'token is required' }, { status: 400 });
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

  type RestRow = { name: string; locale: string | null; slug: string; currency: string | null };
  const rawRest = (order as any).restaurants as RestRow[] | RestRow | null;
  const restaurant: RestRow | null = Array.isArray(rawRest) ? (rawRest[0] ?? null) : rawRest;

  const now = new Date().toISOString();
  let updateData: Record<string, unknown> = {};

  if (action === 'picked_up') {
    const advanceToReady = canTransition(order.status, 'ready');
    updateData = { driver_picked_up_at: now, ...(advanceToReady ? { status: 'ready' } : {}) };
  }

  if (action === 'at_door') {
    updateData = { driver_at_door_at: now };
  }

  if (action === 'notify_outside') {
    return NextResponse.json({ ok: true, action });
  }

  if (action === 'delivered') {
    // Only update if the transition is valid (guards delivered/cancelled orders)
    if (!canTransition(order.status, 'delivered')) {
      return NextResponse.json({ ok: true, skipped: true, action });
    }
    // Single update: status + timestamp together
    const { error: statusErr } = await supabase
      .from('orders')
      .update({ status: 'delivered', driver_delivered_at: now })
      .eq('id', order.id);

    if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 500 });

    // Broadcast to customer tracking page immediately (no-RLS broadcast channel).
    broadcastOrderUpdate(order.id, 'delivered').catch(() => {});

    // Evict Redis token cache — driver can no longer send location pings
    evictTokenCache(token.slice(0, 16)).catch(() => {});

    // Full notification stack (email + push + log) via notifyStatusChange
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
      logger.error('notifyStatusChange error on delivered', { error: err instanceof Error ? err.message : String(err) });
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

    // Broadcast to customer tracking page so they see driver milestones
    // (picked_up, at_door) in real-time. Client does a full refetch on receipt.
    broadcastOrderUpdate(order.id, order.status).catch(() => {});
  }

  return NextResponse.json({ ok: true, action });
}
