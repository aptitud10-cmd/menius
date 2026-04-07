export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function startOfPrevMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export async function GET() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: 'No Stripe key' }, { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' });
  const db = createAdminClient();

  const [stripeData, supabaseData] = await Promise.all([
    fetchStripeMetrics(stripe),
    fetchSupabaseMetrics(db),
  ]);

  return NextResponse.json({ ...stripeData, ...supabaseData, ok: true });
}

async function fetchStripeMetrics(stripe: Stripe) {
  try {
    // Fetch all active subscriptions
    const activeSubs: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;
    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
        expand: ['data.items.data.price'],
      });
      activeSubs.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
    }

    // MRR = sum of monthly amounts
    let mrr = 0;
    for (const sub of activeSubs) {
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = (price.unit_amount ?? 0) / 100;
        if (price.recurring?.interval === 'year') {
          mrr += amount / 12;
        } else {
          mrr += amount;
        }
      }
    }

    // New subscriptions this month
    const som = startOfMonth();
    const newThisMonth = activeSubs.filter(s => s.created >= som).length;

    // Canceled this month (churn)
    const canceled: Stripe.Subscription[] = [];
    const cancelPage = await stripe.subscriptions.list({
      status: 'canceled',
      limit: 100,
      created: { gte: startOfPrevMonth() },
    });
    canceled.push(...cancelPage.data);

    const churnedThisMonth = canceled.filter(s => {
      const endedAt = s.ended_at ?? 0;
      return endedAt >= som;
    }).length;

    // Plan breakdown
    const planCounts: Record<string, number> = {};
    for (const sub of activeSubs) {
      for (const item of sub.items.data) {
        const name = item.price.nickname ?? item.price.id ?? 'unknown';
        planCounts[name] = (planCounts[name] ?? 0) + 1;
      }
    }

    // MRR last month (approx from prev month subs)
    const mrrLastMonth = mrr - (newThisMonth * (mrr / Math.max(activeSubs.length, 1)));

    return {
      mrr: Math.round(mrr * 100) / 100,
      mrrLastMonth: Math.round(mrrLastMonth * 100) / 100,
      activeSubscriptions: activeSubs.length,
      newSubscriptionsThisMonth: newThisMonth,
      churnedThisMonth,
      churnRate: activeSubs.length > 0 ? Math.round((churnedThisMonth / activeSubs.length) * 1000) / 10 : 0,
      planBreakdown: planCounts,
    };
  } catch (err) {
    return {
      mrr: 0, mrrLastMonth: 0, activeSubscriptions: 0,
      newSubscriptionsThisMonth: 0, churnedThisMonth: 0, churnRate: 0,
      planBreakdown: {}, stripeError: String(err),
    };
  }
}

async function fetchSupabaseMetrics(db: ReturnType<typeof createAdminClient>) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Total active restaurants
    const { count: totalActive } = await db
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // New this month
    const { count: newThisMonth } = await db
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startMonth);

    // Restaurants with orders in last 30 days (engaged)
    const { data: engagedData } = await db
      .from('orders')
      .select('restaurant_id')
      .gte('created_at', thirtyDaysAgo)
      .limit(1000);
    const engaged = new Set(engagedData?.map(o => o.restaurant_id) ?? []).size;

    // Restaurants with NO orders in 30 days (at risk)
    const atRisk = (totalActive ?? 0) - engaged;

    // Orders this month
    const { count: ordersThisMonth } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startMonth);

    // Orders this week
    const { count: ordersThisWeek } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    // Weekly signups for sparkline (last 8 weeks)
    const { data: weeklyRaw } = await db.rpc('exec_readonly_sql', {
      sql_query: `
        SELECT
          to_char(date_trunc('week', created_at), 'Mon DD') AS week,
          COUNT(*)::int AS count
        FROM restaurants
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY date_trunc('week', created_at)
        ORDER BY date_trunc('week', created_at)
      `,
    });

    // Active alerts count
    const { count: activeAlerts } = await db
      .from('dev_alerts')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null);

    return {
      totalActiveRestaurants: totalActive ?? 0,
      newRestaurantsThisMonth: newThisMonth ?? 0,
      engagedRestaurants: engaged,
      atRiskRestaurants: Math.max(0, atRisk),
      ordersThisMonth: ordersThisMonth ?? 0,
      ordersThisWeek: ordersThisWeek ?? 0,
      weeklySignups: weeklyRaw ?? [],
      activeAlerts: activeAlerts ?? 0,
    };
  } catch (err) {
    return {
      totalActiveRestaurants: 0, newRestaurantsThisMonth: 0,
      engagedRestaurants: 0, atRiskRestaurants: 0,
      ordersThisMonth: 0, ordersThisWeek: 0,
      weeklySignups: [], activeAlerts: 0,
      supabaseError: String(err),
    };
  }
}
