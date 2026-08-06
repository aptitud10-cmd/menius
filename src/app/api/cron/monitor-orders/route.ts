export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAlert } from '@/lib/dev-tool/alerts';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';

const logger = createLogger('monitor-orders');

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return await runMonitorOrders();
  } catch (err) {
    logger.error('monitor-orders failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/cron/monitor-orders' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function runMonitorOrders(): Promise<NextResponse> {
  const db = createAdminClient();
  const now = new Date();
  const h1ago  = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const alertsCreated: string[] = [];

  // 1. Stuck pending orders (>1h in 'pending')
  const { data: stuckOrders } = await db
    .from('orders')
    .select('id, order_number, restaurant_id, total, created_at')
    .eq('status', 'pending')
    .lt('created_at', h1ago)
    .limit(20);

  for (const order of stuckOrders ?? []) {
    // Fetch restaurant slug
    const { data: rest } = await db
      .from('restaurants')
      .select('slug, name')
      .eq('id', order.restaurant_id)
      .single();

    await createAlert({
      severity: 'warning',
      source: 'orders',
      title: `Orden #${order.order_number ?? order.id.slice(0, 8)} atascada en 'pending'`,
      description: `La orden lleva más de 1 hora en estado pending. Total: $${Number(order.total ?? 0).toFixed(2)}. Restaurante: ${rest?.name ?? order.restaurant_id}`,
      store_slug: rest?.slug ?? undefined,
      data: { orderId: order.id, total: order.total, createdAt: order.created_at },
    });
    alertsCreated.push(`stuck:${order.id}`);
  }

  // 1b. Stuck delivery orders: waiting for a driver in 'ready' >1h, or
  // 'out_for_delivery' >3h without being closed. These never auto-complete
  // (the auto-complete cron is pickup-only), so without this alert they
  // stay open forever.
  const h3ago = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const { data: stuckDeliveries } = await db
    .from('orders')
    .select('id, order_number, restaurant_id, status, total, created_at, driver_name')
    .eq('order_type', 'delivery')
    .or(`and(status.eq.ready,created_at.lt.${h1ago}),and(status.eq.out_for_delivery,created_at.lt.${h3ago})`)
    .limit(20);

  for (const order of stuckDeliveries ?? []) {
    // Dedupe: the cron runs repeatedly while the order stays stuck — one open
    // alert per (order, status) is enough.
    const { data: existingAlert } = await db
      .from('dev_alerts')
      .select('id')
      .contains('metadata', { orderId: order.id, status: order.status })
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle();
    if (existingAlert) continue;

    const { data: rest } = await db
      .from('restaurants')
      .select('slug, name')
      .eq('id', order.restaurant_id)
      .single();

    const waitingForDriver = order.status === 'ready';
    await createAlert({
      severity: 'warning',
      source: 'orders',
      title: waitingForDriver
        ? `Delivery #${order.order_number ?? order.id.slice(0, 8)} lleva >1h en 'ready' sin salir`
        : `Delivery #${order.order_number ?? order.id.slice(0, 8)} lleva >3h en 'out_for_delivery' sin cerrarse`,
      description: waitingForDriver
        ? `La orden está lista pero ${order.driver_name ? `el repartidor (${order.driver_name}) no ha confirmado la recogida` : 'no tiene repartidor asignado'}. Restaurante: ${rest?.name ?? order.restaurant_id}`
        : `La orden salió a reparto pero nadie la marcó como entregada. Restaurante: ${rest?.name ?? order.restaurant_id}`,
      store_slug: rest?.slug ?? undefined,
      data: { orderId: order.id, status: order.status, total: order.total, createdAt: order.created_at },
    });
    alertsCreated.push(`stuck-delivery:${order.id}`);
  }

  // 2. Restaurants with subscription but zero orders in 48h (possible issue)
  const { data: activeRestaurants } = await db
    .from('subscriptions')
    .select('restaurant_id')
    .in('status', ['active', 'trialing'])
    .limit(100);

  const activeIds = (activeRestaurants ?? []).map(s => s.restaurant_id);

  if (activeIds.length > 0) {
    // Get restaurants that had orders before but not in 48h
    const { data: recentActivity } = await db
      .from('orders')
      .select('restaurant_id')
      .in('restaurant_id', activeIds)
      .gte('created_at', h48ago);

    const withRecentOrders = new Set((recentActivity ?? []).map(o => o.restaurant_id));
    const dormant = activeIds.filter(id => !withRecentOrders.has(id));

    // Only alert if they had orders before (in last 7 days)
    const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    for (const restaurantId of dormant.slice(0, 10)) {
      const { count } = await db
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', d7ago)
        .lt('created_at', h48ago);

      if ((count ?? 0) > 0) {
        const { data: rest } = await db
          .from('restaurants')
          .select('slug, name')
          .eq('id', restaurantId)
          .single();

        await createAlert({
          severity: 'info',
          source: 'orders',
          title: `Tienda ${rest?.name ?? restaurantId} sin órdenes en 48h`,
          description: `Esta tienda estaba activa pero no ha recibido órdenes en las últimas 48 horas. Puede indicar un problema en el menú o el checkout.`,
          store_slug: rest?.slug ?? undefined,
          data: { restaurantId },
        });
        alertsCreated.push(`dormant:${restaurantId}`);
      }
    }
  }

  // 3. High cancellation rate: >3 cancelled orders in last 24h for one restaurant
  const { data: recentCancels } = await db
    .from('orders')
    .select('restaurant_id')
    .eq('status', 'cancelled')
    .gte('created_at', h24ago);

  const cancelCounts: Record<string, number> = {};
  for (const o of recentCancels ?? []) {
    cancelCounts[o.restaurant_id] = (cancelCounts[o.restaurant_id] ?? 0) + 1;
  }

  for (const [restaurantId, count] of Object.entries(cancelCounts)) {
    if (count >= 3) {
      const { data: rest } = await db
        .from('restaurants')
        .select('slug, name')
        .eq('id', restaurantId)
        .single();

      await createAlert({
        severity: 'warning',
        source: 'orders',
        title: `Alta tasa de cancelaciones en ${rest?.name ?? restaurantId} (${count} en 24h)`,
        description: `${count} órdenes canceladas en las últimas 24 horas. Puede indicar un problema con el menú, precios o el proceso de pago.`,
        store_slug: rest?.slug ?? undefined,
        data: { restaurantId, cancelCount: count },
      });
      alertsCreated.push(`cancels:${restaurantId}`);
    }
  }

  logger.info('monitor-orders done', { alertsCreated: alertsCreated.length });
  return NextResponse.json({ ok: true, alertsCreated });
}
