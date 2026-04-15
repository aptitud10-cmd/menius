export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsApp, formatDailySummaryWhatsApp } from '@/lib/notifications/whatsapp';
import { createLogger } from '@/lib/logger';

const logger = createLogger('daily-summary');

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

  // Query window: calendar day in UTC.
  // Cron fires at 22:00 UTC = ~4-5pm LATAM — captures the full active business day.
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const yesterdayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)).toISOString();

  // Fetch all active restaurants with WhatsApp notifications enabled
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, currency, locale, notification_whatsapp, notifications_enabled')
    .eq('is_active', true)
    .eq('notifications_enabled', true)
    .not('notification_whatsapp', 'is', null)
    .neq('notification_whatsapp', '');

  if (!restaurants?.length) {
    logger.info('No restaurants with WhatsApp notifications enabled');
    return NextResponse.json({ sent: 0 });
  }

  // Fetch plan check — only starter+ gets WhatsApp summaries
  const restaurantIds = restaurants.map((r) => r.id);
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('restaurant_id, plan_id, status')
    .in('restaurant_id', restaurantIds)
    .in('status', ['active', 'trialing', 'past_due']);

  const activePlanIds = new Set((subs ?? []).map((s) => s.restaurant_id));

  // Fetch today's orders for all eligible restaurants in one query
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('restaurant_id, total, order_type, status')
    .in('restaurant_id', restaurantIds)
    .gte('created_at', todayStart)
    .neq('status', 'cancelled');

  // Fetch yesterday's order counts for trend comparison
  const { data: yesterdayOrders } = await supabase
    .from('orders')
    .select('restaurant_id')
    .in('restaurant_id', restaurantIds)
    .gte('created_at', yesterdayStart)
    .lt('created_at', todayStart)
    .neq('status', 'cancelled');

  // Fetch top products today across all restaurants
  const { data: topItems } = await supabase
    .from('order_items')
    .select(`
      qty,
      product:products ( name ),
      order:orders ( restaurant_id, status, created_at )
    `)
    .gte('orders.created_at', todayStart)
    .neq('orders.status', 'cancelled')
    .in('orders.restaurant_id', restaurantIds);

  // Group data by restaurant
  const ordersByRestaurant = new Map<string, typeof todayOrders>();
  for (const o of todayOrders ?? []) {
    const list = ordersByRestaurant.get(o.restaurant_id) ?? [];
    list.push(o);
    ordersByRestaurant.set(o.restaurant_id, list);
  }

  const yesterdayCountByRestaurant = new Map<string, number>();
  for (const o of yesterdayOrders ?? []) {
    yesterdayCountByRestaurant.set(o.restaurant_id, (yesterdayCountByRestaurant.get(o.restaurant_id) ?? 0) + 1);
  }

  // Product qty aggregation per restaurant
  const productQtyByRestaurant = new Map<string, Map<string, number>>();
  for (const item of topItems ?? []) {
    const order = (item as any).order;
    const product = (item as any).product;
    if (!order?.restaurant_id || !product?.name) continue;
    const rid = order.restaurant_id;
    if (!productQtyByRestaurant.has(rid)) productQtyByRestaurant.set(rid, new Map());
    const map = productQtyByRestaurant.get(rid)!;
    map.set(product.name, (map.get(product.name) ?? 0) + item.qty);
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const restaurant of restaurants) {
    // Skip restaurants without an active paid plan
    if (!activePlanIds.has(restaurant.id)) {
      skipped++;
      continue;
    }

    const orders = ordersByRestaurant.get(restaurant.id) ?? [];

    // Don't bother restaurants that had no orders today
    if (orders.length === 0) {
      skipped++;
      continue;
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const ordersByType = { dine_in: 0, pickup: 0, delivery: 0 };
    for (const o of orders) {
      const t = o.order_type as keyof typeof ordersByType;
      if (t in ordersByType) ordersByType[t]++;
    }

    const productMap = productQtyByRestaurant.get(restaurant.id) ?? new Map<string, number>();
    const topProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, qty]) => ({ name, qty }));

    const vsYesterdayOrders = yesterdayCountByRestaurant.get(restaurant.id) ?? null;

    const message = formatDailySummaryWhatsApp({
      restaurantName: restaurant.name,
      totalOrders,
      totalRevenue,
      currency: restaurant.currency || 'MXN',
      ordersByType,
      topProducts,
      vsYesterdayOrders,
      dashUrl: `${appUrl}/app`,
    });

    const { success } = await sendWhatsApp({
      to: restaurant.notification_whatsapp,
      text: message,
    });

    if (success) {
      sent++;
      logger.info('Daily summary sent', { restaurant: restaurant.slug, orders: totalOrders });
    } else {
      errors.push(restaurant.slug);
      logger.error('Failed to send daily summary', { restaurant: restaurant.slug });
    }
  }

  logger.info('Daily summary cron complete', { sent, skipped, errors: errors.length });
  return NextResponse.json({ sent, skipped, errors });
}
