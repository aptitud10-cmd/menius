/**
 * Auto-advance pickup orders through the correct status flow:
 *
 * Step 1 — preparing → ready (when ETA passes):
 *   Notifies the customer "your food is ready for pickup".
 *   The counter must then press "Delivered" when the customer collects.
 *
 * Step 2 — ready → delivered (after READY_TIMEOUT_MINS without manual action):
 *   If the counter forgets to press "Delivered" after the customer picks up,
 *   the order auto-completes after 10 minutes in 'ready'.
 *
 * Runs every 3 minutes via Vercel Cron.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auto-complete-pickup');

const DEFAULT_ETA_MINS = 15;
const READY_TIMEOUT_MINS = 10;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminDb = createAdminClient();
    const { notifyStatusChange } = await import('@/lib/notifications/order-notifications');

    // ── Step 1: preparing → ready when ETA has passed ─────────────────────
    const { data: preparingOrders, error: prepErr } = await adminDb
      .from('orders')
      .select('id, order_number, restaurant_id, updated_at, estimated_ready_minutes, customer_name, customer_email, customer_phone, order_type, delivery_address')
      .eq('status', 'preparing')
      .eq('order_type', 'pickup');

    if (prepErr) return NextResponse.json({ error: prepErr.message }, { status: 500 });

    const now = Date.now();

    const toMarkReady = (preparingOrders ?? []).filter(o => {
      const etaMins = o.estimated_ready_minutes ?? DEFAULT_ETA_MINS;
      const preparingAt = new Date(o.updated_at).getTime();
      return now - preparingAt >= etaMins * 60 * 1000;
    });

    let markedReady = 0;
    if (toMarkReady.length > 0) {
      const ids = toMarkReady.map(o => o.id);
      const readyNow = new Date().toISOString();
      const { error: readyErr } = await adminDb
        .from('orders')
        .update({ status: 'ready', updated_at: readyNow })
        .in('id', ids);

      if (!readyErr) {
        markedReady = ids.length;
        for (const o of toMarkReady) {
          notifyStatusChange({
            orderId: o.id,
            orderNumber: o.order_number,
            restaurantId: o.restaurant_id,
            status: 'ready',
            customerName: o.customer_name,
            customerEmail: o.customer_email || undefined,
            customerPhone: o.customer_phone || undefined,
            orderType: o.order_type || undefined,
            deliveryAddress: o.delivery_address || undefined,
          }).catch(() => {});
        }
        logger.info(`Marked ${markedReady} pickup orders as ready`, { ids });
      }
    }

    // ── Step 2: ready → delivered after READY_TIMEOUT_MINS ────────────────
    const { data: readyOrders, error: readyFetchErr } = await adminDb
      .from('orders')
      .select('id, order_number, restaurant_id, updated_at, customer_name, customer_email, customer_phone, order_type, delivery_address')
      .eq('status', 'ready')
      .eq('order_type', 'pickup');

    if (readyFetchErr) return NextResponse.json({ error: readyFetchErr.message }, { status: 500 });

    const toDeliver = (readyOrders ?? []).filter(o => {
      const readyAt = new Date(o.updated_at).getTime();
      return now - readyAt >= READY_TIMEOUT_MINS * 60 * 1000;
    });

    let markedDelivered = 0;
    if (toDeliver.length > 0) {
      const ids = toDeliver.map(o => o.id);
      const { error: deliverErr } = await adminDb
        .from('orders')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .in('id', ids);

      if (!deliverErr) {
        markedDelivered = ids.length;
        for (const o of toDeliver) {
          notifyStatusChange({
            orderId: o.id,
            orderNumber: o.order_number,
            restaurantId: o.restaurant_id,
            status: 'delivered',
            customerName: o.customer_name,
            customerEmail: o.customer_email || undefined,
            customerPhone: o.customer_phone || undefined,
            orderType: o.order_type || undefined,
            deliveryAddress: o.delivery_address || undefined,
          }).catch(() => {});
        }
        logger.info(`Auto-delivered ${markedDelivered} pickup orders after ${READY_TIMEOUT_MINS} min in ready`, { ids });
      }
    }

    return NextResponse.json({ markedReady, markedDelivered });
  } catch (err) {
    logger.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
