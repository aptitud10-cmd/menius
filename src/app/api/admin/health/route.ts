export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { PLANS } from '@/lib/plans';

const logger = createLogger('admin-health');

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { supabase } = auth;
    const now = new Date();
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const d7ahead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: stuckOrders, count: stuckCount },
      { data: noProductRests },
      { data: trialsExpiring },
      { data: cancelledSubs },
      { data: allSubs },
      { data: recentOrders7d },
      { data: recentOrders30d },
      { data: allRestaurants },
    ] = await Promise.all([
      // Orders stuck as "pending" for >24h
      supabase
        .from('orders')
        .select('id, order_number, restaurant_id, total, created_at', { count: 'exact' })
        .eq('status', 'pending')
        .lt('created_at', h24ago)
        .limit(20),

      // All active restaurants (for empty menu + inactive checks)
      supabase
        .from('restaurants')
        .select('id, name, slug, created_at')
        .eq('is_active', true)
        .limit(200),

      // Trials expiring in next 7 days
      supabase
        .from('subscriptions')
        .select('restaurant_id, trial_end, plan_id')
        .eq('status', 'trialing')
        .lte('trial_end', d7ahead)
        .gte('trial_end', now.toISOString())
        .order('trial_end'),

      // Cancelled subs in last 7 days
      supabase
        .from('subscriptions')
        .select('restaurant_id, canceled_at, plan_id')
        .eq('status', 'canceled')
        .gte('canceled_at', d7ago)
        .order('canceled_at', { ascending: false })
        .limit(10),

      // All subscriptions for MRR
      supabase
        .from('subscriptions')
        .select('plan_id, status, stripe_price_id')
        .limit(5000),

      // Orders last 7d revenue
      supabase
        .from('orders')
        .select('total, restaurant_id')
        .in('status', ['completed', 'delivered', 'ready'])
        .gte('created_at', d7ago),

      // Orders last 30d revenue
      supabase
        .from('orders')
        .select('total, restaurant_id')
        .in('status', ['completed', 'delivered', 'ready'])
        .gte('created_at', d30ago),

      // All active restaurants
      supabase
        .from('restaurants')
        .select('id, name, slug, created_at')
        .eq('is_active', true)
        .limit(5000),
    ]);

    // Restaurants with no active products
    const allRestIds = (allRestaurants ?? []).map(r => r.id);
    const { data: productCounts } = await supabase
      .from('products')
      .select('restaurant_id')
      .eq('is_active', true)
      .in('restaurant_id', allRestIds);

    const restsWithProducts = new Set((productCounts ?? []).map(p => p.restaurant_id));
    const emptyMenuRests = (allRestaurants ?? []).filter(r => !restsWithProducts.has(r.id));

    // Restaurants inactive (no orders in 30d) — built from allRestaurants, not inactiveRests
    const restsWithRecentOrders = new Set((recentOrders30d ?? []).map(o => o.restaurant_id));
    const inactiveRestList = (allRestaurants ?? [])
      .filter(r => restsWithProducts.has(r.id) && !restsWithRecentOrders.has(r.id))
      .slice(0, 10);

    // Revenue metrics
    const revenue7d = (recentOrders7d ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
    const revenue30d = (recentOrders30d ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);

    // Unique restaurants with orders in each period
    const activeRests7d = new Set((recentOrders7d ?? []).map(o => o.restaurant_id)).size;
    const activeRests30d = new Set((recentOrders30d ?? []).map(o => o.restaurant_id)).size;

    // MRR estimate from subscription plans — uses live prices from plans config
    const PLAN_PRICES: Record<string, number> = Object.fromEntries(
      Object.values(PLANS).map(p => [p.id, p.price.monthly])
    );
    const activeSubs = (allSubs ?? []).filter(s => s.status === 'active' || s.status === 'trialing');
    const mrrEstimate = activeSubs.reduce((s, sub) => s + (PLAN_PRICES[sub.plan_id] ?? 0), 0);

    // Subscription health
    const subStatusCounts: Record<string, number> = {};
    for (const sub of allSubs ?? []) {
      subStatusCounts[sub.status] = (subStatusCounts[sub.status] ?? 0) + 1;
    }

    return NextResponse.json({
      checkedAt: now.toISOString(),
      platform: {
        mrrEstimate,
        revenue7d,
        revenue30d,
        activeRests7d,
        activeRests30d,
        totalActiveRests: allRestIds.length,
      },
      alerts: {
        stuckOrders: {
          count: stuckCount ?? 0,
          items: (stuckOrders ?? []).map(o => ({
            id: o.id,
            order_number: o.order_number,
            total: o.total,
            created_at: o.created_at,
          })),
        },
        emptyMenus: {
          count: emptyMenuRests.length,
          items: emptyMenuRests.slice(0, 10).map(r => ({ id: r.id, name: r.name, slug: r.slug, created_at: r.created_at })),
        },
        inactiveRests: {
          count: inactiveRestList.length,
          items: inactiveRestList.map(r => ({ id: r.id, name: r.name, slug: r.slug })),
        },
        trialsExpiring: {
          count: (trialsExpiring ?? []).length,
          items: (trialsExpiring ?? []).map(s => ({
            restaurant_id: s.restaurant_id,
            trial_end: s.trial_end,
            plan_id: s.plan_id,
            daysLeft: Math.ceil((new Date(s.trial_end!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          })),
        },
        recentCancellations: {
          count: (cancelledSubs ?? []).length,
          items: (cancelledSubs ?? []).map(s => ({
            restaurant_id: s.restaurant_id,
            canceled_at: s.canceled_at,
            plan_id: s.plan_id,
          })),
        },
      },
      subscriptions: subStatusCounts,
    });
  } catch (err) {
    logger.error('health GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
