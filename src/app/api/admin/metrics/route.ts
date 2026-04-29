export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/auth/verify-admin';

function startOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toUnix(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: 'No Stripe key' }, { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover', maxNetworkRetries: 1, timeout: 12000 });
  const db = createAdminClient();

  const [stripeData, supabaseData] = await Promise.all([
    fetchStripeMetrics(stripe),
    fetchSupabaseMetrics(db),
  ]);

  return NextResponse.json({ ...stripeData, ...supabaseData, ok: true });
}

async function fetchStripeMetrics(stripe: Stripe) {
  try {
    // ── Active subscriptions ────────────────────────────────────────────────
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

    // Also include trialing
    const trialSubs: Stripe.Subscription[] = [];
    let hasMoreTrial = true;
    let trialAfter: string | undefined;
    while (hasMoreTrial) {
      const page = await stripe.subscriptions.list({
        status: 'trialing',
        limit: 100,
        ...(trialAfter ? { starting_after: trialAfter } : {}),
        expand: ['data.items.data.price'],
      });
      trialSubs.push(...page.data);
      hasMoreTrial = page.has_more;
      if (page.data.length > 0) trialAfter = page.data[page.data.length - 1].id;
    }

    // ── MRR calculation ─────────────────────────────────────────────────────
    let mrr = 0;
    const planCounts: Record<string, number> = {};

    for (const sub of activeSubs) {
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = (price.unit_amount ?? 0) / 100;
        if (price.recurring?.interval === 'year') {
          mrr += amount / 12;
        } else {
          mrr += amount;
        }
        const name = price.nickname ?? 'unknown';
        planCounts[name] = (planCounts[name] ?? 0) + 1;
      }
    }

    // ── Monthly trend (last 6 months) — parallel ──────────────────────────
    const monthlyMrr = await Promise.all(
      Array.from({ length: 6 }, (_, idx) => 5 - idx).map(async (i) => {
        const start = startOfMonth(i);
        const end = startOfMonth(i - 1);
        try {
          const monthSubs = await stripe.subscriptions.list({
            status: 'active',
            created: { gte: toUnix(start), lt: toUnix(end) },
            limit: 100,
            expand: ['data.items.data.price'],
          });
          let monthMrr = 0;
          for (const sub of monthSubs.data) {
            for (const item of sub.items.data) {
              const amount = (item.price.unit_amount ?? 0) / 100;
              monthMrr += item.price.recurring?.interval === 'year' ? amount / 12 : amount;
            }
          }
          return {
            month: start.toLocaleDateString('es', { month: 'short', year: '2-digit' }),
            mrr: Math.round(monthMrr * 100) / 100,
            newSubs: monthSubs.data.length,
          };
        } catch {
          return { month: start.toLocaleDateString('es', { month: 'short', year: '2-digit' }), mrr: 0, newSubs: 0 };
        }
      })
    );

    // ── Churn this month ───────────────────────────────────────────────────
    const som = startOfMonth();
    const newThisMonth = activeSubs.filter(s => s.created >= toUnix(som)).length;
    const cancelPage = await stripe.subscriptions.list({
      status: 'canceled',
      limit: 100,
      created: { gte: toUnix(startOfMonth(1)) },
    });
    const churnedThisMonth = cancelPage.data.filter(s => (s.ended_at ?? 0) >= toUnix(som)).length;

    // ── MRR last month (approx) ────────────────────────────────────────────
    const mrrLastMonth = monthlyMrr[monthlyMrr.length - 2]?.mrr ?? 0;
    const mrrGrowth = mrrLastMonth > 0 ? ((mrr - mrrLastMonth) / mrrLastMonth) * 100 : 0;

    // ── Application fees (Stripe Connect commissions) ───────────────────────
    let applicationFeesThisMonth = 0;
    try {
      const fees = await stripe.applicationFees.list({
        created: { gte: toUnix(som) },
        limit: 100,
      });
      applicationFeesThisMonth = fees.data.reduce((sum, f) => sum + (f.amount / 100), 0);
    } catch { /* Connect fees optional */ }

    return {
      mrr: Math.round(mrr * 100) / 100,
      mrrLastMonth: Math.round(mrrLastMonth * 100) / 100,
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      arr: Math.round(mrr * 12 * 100) / 100,
      activeSubscriptions: activeSubs.length,
      trialingSubscriptions: trialSubs.length,
      newSubscriptionsThisMonth: newThisMonth,
      churnedThisMonth,
      churnRate: activeSubs.length > 0 ? Math.round((churnedThisMonth / activeSubs.length) * 1000) / 10 : 0,
      planBreakdown: planCounts,
      monthlyTrend: monthlyMrr,
      applicationFeesThisMonth: Math.round(applicationFeesThisMonth * 100) / 100,
    };
  } catch (err) {
    return {
      mrr: 0, mrrLastMonth: 0, mrrGrowth: 0, arr: 0,
      activeSubscriptions: 0, trialingSubscriptions: 0,
      newSubscriptionsThisMonth: 0, churnedThisMonth: 0,
      churnRate: 0, planBreakdown: {}, monthlyTrend: [],
      applicationFeesThisMonth: 0,
      stripeError: String(err),
    };
  }
}

async function fetchSupabaseMetrics(db: ReturnType<typeof createAdminClient>) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { count: totalActive },
      { count: newThisMonth },
      { count: ordersThisMonth },
      { count: ordersThisWeek },
      { count: ordersToday },
      { count: totalOrders },
      { data: engagedData },
      { data: weeklyRaw },
      { data: topRestaurants },
      { data: recentSignups },
      { count: activeAlerts },
    ] = await Promise.all([
      db.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
      db.from('restaurants').select('*', { count: 'exact', head: true }).gte('created_at', startMonth),
      db.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', startMonth),
      db.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      db.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      db.from('orders').select('*', { count: 'exact', head: true }),
      db.from('orders').select('restaurant_id').gte('created_at', thirtyDaysAgo).limit(2000),
      db.rpc('exec_readonly_sql', {
        sql_query: `
          SELECT
            to_char(date_trunc('week', created_at), 'Mon DD') AS week,
            COUNT(*)::int AS count
          FROM restaurants
          WHERE created_at >= NOW() - INTERVAL '8 weeks'
          GROUP BY date_trunc('week', created_at)
          ORDER BY date_trunc('week', created_at)
        `,
      }),
      db.rpc('exec_readonly_sql', {
        sql_query: `
          SELECT
            r.id,
            r.name,
            r.slug,
            r.country_code,
            r.currency,
            r.created_at,
            COUNT(o.id)::int AS order_count_30d,
            COALESCE(s.plan_id, 'free') AS plan_id,
            COALESCE(s.status, 'none') AS sub_status
          FROM restaurants r
          LEFT JOIN orders o ON o.restaurant_id = r.id AND o.created_at >= NOW() - INTERVAL '30 days'
          LEFT JOIN subscriptions s ON s.restaurant_id = r.id
          WHERE r.is_active = true
          GROUP BY r.id, r.name, r.slug, r.country_code, r.currency, r.created_at, s.plan_id, s.status
          ORDER BY order_count_30d DESC
          LIMIT 15
        `,
      }),
      db.from('restaurants')
        .select('id, name, slug, created_at, country_code')
        .order('created_at', { ascending: false })
        .limit(5),
      db.from('dev_alerts').select('*', { count: 'exact', head: true }).is('resolved_at', null),
    ]);

    const engagedSet = new Set(engagedData?.map((o: { restaurant_id: string }) => o.restaurant_id) ?? []);
    const engaged = engagedSet.size;
    const atRisk = Math.max(0, (totalActive ?? 0) - engaged);

    // ── Conversion funnel ────────────────────────────────────────────────────
    const { count: withAnyOrders } = await db
      .from('orders')
      .select('restaurant_id', { count: 'exact', head: false })
      .limit(1);

    const { data: paidRestaurants } = await db
      .from('subscriptions')
      .select('restaurant_id')
      .in('status', ['active', 'trialing'])
      .limit(500);

    const paidCount = new Set(paidRestaurants?.map((r: { restaurant_id: string }) => r.restaurant_id) ?? []).size;

    // ── ARPU ────────────────────────────────────────────────────────────────
    // Calculated from Stripe data — passed separately
    // Here we compute average orders per engaged restaurant
    const avgOrdersPerRestaurant = engaged > 0 && ordersThisMonth
      ? Math.round((ordersThisMonth / engaged) * 10) / 10
      : 0;

    return {
      totalActiveRestaurants: totalActive ?? 0,
      newRestaurantsThisMonth: newThisMonth ?? 0,
      engagedRestaurants: engaged,
      atRiskRestaurants: atRisk,
      ordersThisMonth: ordersThisMonth ?? 0,
      ordersThisWeek: ordersThisWeek ?? 0,
      ordersToday: ordersToday ?? 0,
      totalOrders: totalOrders ?? 0,
      weeklySignups: weeklyRaw ?? [],
      topRestaurants: topRestaurants ?? [],
      recentSignups: recentSignups ?? [],
      paidRestaurants: paidCount,
      avgOrdersPerRestaurant,
      activeAlerts: activeAlerts ?? 0,
      conversionRate: (totalActive ?? 0) > 0
        ? Math.round((paidCount / (totalActive ?? 1)) * 1000) / 10
        : 0,
    };
  } catch (err) {
    return {
      totalActiveRestaurants: 0, newRestaurantsThisMonth: 0,
      engagedRestaurants: 0, atRiskRestaurants: 0,
      ordersThisMonth: 0, ordersThisWeek: 0, ordersToday: 0, totalOrders: 0,
      weeklySignups: [], topRestaurants: [], recentSignups: [],
      paidRestaurants: 0, avgOrdersPerRestaurant: 0,
      activeAlerts: 0, conversionRate: 0,
      supabaseError: String(err),
    };
  }
}
