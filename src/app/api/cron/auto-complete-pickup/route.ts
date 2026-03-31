/**
 * Auto-complete pickup orders when their ETA has passed.
 *
 * Runs every 3 minutes. Finds pickup orders in 'preparing' status where
 * updated_at + estimated_ready_minutes (default 15) is in the past,
 * marks them as 'delivered', and sends customer notification.
 *
 * Counter operators don't need to press any button — the order closes automatically.
 * The optional "Ready for pickup" button sends an early WhatsApp if the counter
 * guy wants to notify the customer before the auto-complete kicks in.
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_ETA_MINS = 15;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminDb = createAdminClient();

    // Fetch all pickup orders currently in 'preparing'
    const { data: orders, error } = await adminDb
      .from('orders')
      .select('id, order_number, restaurant_id, updated_at, estimated_ready_minutes, customer_name, customer_email, customer_phone, order_type, delivery_address')
      .eq('status', 'preparing')
      .eq('order_type', 'pickup');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = Date.now();
    const toComplete = (orders ?? []).filter(o => {
      const etaMins = o.estimated_ready_minutes ?? DEFAULT_ETA_MINS;
      const preparingAt = new Date(o.updated_at).getTime();
      return now - preparingAt >= etaMins * 60 * 1000;
    });

    if (toComplete.length === 0) {
      return NextResponse.json({ completed: 0 });
    }

    const ids = toComplete.map(o => o.id);

    // Bulk update to delivered
    const { error: updateErr } = await adminDb
      .from('orders')
      .update({ status: 'delivered' })
      .in('id', ids);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Send notifications (non-blocking, fire-and-forget per order)
    const { notifyStatusChange } = await import('@/lib/notifications/order-notifications');
    for (const o of toComplete) {
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

    console.info(`[auto-complete-pickup] Completed ${ids.length} pickup orders:`, ids);
    return NextResponse.json({ completed: ids.length, ids });
  } catch (err) {
    console.error('[auto-complete-pickup]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
