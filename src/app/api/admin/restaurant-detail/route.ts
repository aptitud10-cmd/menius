export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/auth/verify-admin';

export async function GET(req: Request) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('id');
  if (!restaurantId) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  // Validate UUID format before using in raw SQL
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const db = createAdminClient();

  // ── Restaurant base + subscription ───────────────────────────────────────
  const [{ data: restaurant }, { data: subscription }] = await Promise.all([
    db.from('restaurants')
      .select('id, name, slug, currency, country_code, is_active, created_at, owner_user_id, notification_email, phone, commission_plan')
      .eq('id', restaurantId)
      .maybeSingle(),
    db.from('subscriptions')
      .select('plan_id, status, trial_end, stripe_subscription_id, stripe_customer_id, current_period_end, cancel_at_period_end')
      .eq('restaurant_id', restaurantId)
      .maybeSingle(),
  ]);

  if (!restaurant) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  // ── Auth user (email + name) ──────────────────────────────────────────────
  let ownerEmail = restaurant.notification_email ?? '';
  let ownerName = '';
  let lastSignIn: string | null = null;
  if (restaurant.owner_user_id) {
    try {
      const { data: u } = await db.auth.admin.getUserById(restaurant.owner_user_id);
      if (u?.user) {
        ownerEmail = u.user.email ?? ownerEmail;
        ownerName = (u.user.user_metadata?.full_name as string) ?? (u.user.user_metadata?.name as string) ?? '';
        lastSignIn = u.user.last_sign_in_at ?? null;
      }
    } catch { /* non-critical */ }
  }

  // ── Order stats ───────────────────────────────────────────────────────────
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    { count: totalOrders },
    { count: ordersThisMonth },
    { count: ordersThisWeek },
    { count: ordersToday },
    { data: recentOrders },
    { data: dailyOrders },
    { count: productCount },
    { count: categoryCount },
  ] = await Promise.all([
    db.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    db.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('created_at', thirtyDaysAgo),
    db.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('created_at', sevenDaysAgo),
    db.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('created_at', todayStart),
    db.from('orders')
      .select('id, order_number, customer_name, total, status, created_at, payment_method')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(10),
    db.rpc('exec_readonly_sql', {
      sql_query: `
        SELECT
          date_trunc('day', created_at)::date AS day,
          COUNT(*)::int AS count,
          SUM(total)::numeric AS revenue
        FROM orders
        WHERE restaurant_id = '${restaurantId}'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `,
    }),
    db.from('products').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_active', true),
    db.from('categories').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_active', true),
  ]);

  // ── Revenue last 30d ──────────────────────────────────────────────────────
  const { data: revenueRaw } = await db
    .from('orders')
    .select('total')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', thirtyDaysAgo)
    .not('status', 'eq', 'cancelled');
  const revenueThisMonth = (revenueRaw ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);

  // ── Stripe MRR for this customer ──────────────────────────────────────────
  let stripeMrr = 0;
  let stripePayments: { date: string; amount: number; status: string }[] = [];
  if (subscription?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-01-28.clover',
        maxNetworkRetries: 1,
        timeout: 8000,
      });
      const [subData, charges] = await Promise.all([
        subscription.stripe_subscription_id
          ? stripe.subscriptions.retrieve(subscription.stripe_subscription_id, { expand: ['items.data.price'] })
          : null,
        stripe.charges.list({ customer: subscription.stripe_customer_id, limit: 10 }),
      ]);
      if (subData && 'items' in subData) {
        for (const item of subData.items.data) {
          const amount = (item.price.unit_amount ?? 0) / 100;
          stripeMrr += item.price.recurring?.interval === 'year' ? amount / 12 : amount;
        }
      }
      stripePayments = charges.data.map(c => ({
        date: new Date(c.created * 1000).toISOString(),
        amount: c.amount / 100,
        status: c.status,
      }));
    } catch { /* optional */ }
  }

  // ── Days since last order ─────────────────────────────────────────────────
  const { data: lastOrderRow } = await db
    .from('orders')
    .select('created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const daysSinceLastOrder = lastOrderRow
    ? Math.floor((now.getTime() - new Date(lastOrderRow.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return NextResponse.json({
    restaurant: {
      ...restaurant,
      ownerEmail,
      ownerName,
      lastSignIn,
    },
    subscription: subscription ?? null,
    stats: {
      totalOrders: totalOrders ?? 0,
      ordersThisMonth: ordersThisMonth ?? 0,
      ordersThisWeek: ordersThisWeek ?? 0,
      ordersToday: ordersToday ?? 0,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      productCount: productCount ?? 0,
      categoryCount: categoryCount ?? 0,
      stripeMrr: Math.round(stripeMrr * 100) / 100,
      daysSinceLastOrder,
    },
    recentOrders: recentOrders ?? [],
    dailyOrders: dailyOrders ?? [],
    stripePayments,
  });
}
