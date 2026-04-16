export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createAdminClient } from '@/lib/supabase/admin';

// Subscription-based commission rates (bps).
// All paid plans (starter/pro/business) = 0%. Only commission_plan = 4% (handled separately).
// free = 0 here because free restaurants can't process online payments anyway.
const COMMISSION_BPS: Record<string, number> = {
  free: 0,
  starter: 0,
  pro: 0,
  business: 0,
};

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { restaurantId } = tenant;
    const db = createAdminClient();

    // Single parallel fetch — avoids the extra sequential queries that getEffectivePlanId would add.
    const [restaurantRes, subRes] = await Promise.all([
      db.from('restaurants').select('currency, commission_plan').eq('id', restaurantId).maybeSingle(),
      db.from('subscriptions').select('status, trial_end, plan_id').eq('restaurant_id', restaurantId).maybeSingle(),
    ]);

    const currency = (restaurantRes.data?.currency as string | null | undefined) ?? 'USD';
    const isCommissionPlan = (restaurantRes.data as any)?.commission_plan === true;

    const sub = subRes.data;
    const now = new Date();
    const isTrialing =
      sub?.status === 'trialing' &&
      sub.trial_end != null &&
      new Date(sub.trial_end) > now;

    // Derive planId and commissionBps from the fetched data (avoids a third DB round-trip)
    let planId: string;
    let commissionBps: number;

    if (isCommissionPlan) {
      planId = 'business';
      commissionBps = 400; // 4%
    } else if (isTrialing) {
      planId = sub?.plan_id ?? 'starter';
      commissionBps = 0;
    } else if (sub?.status === 'active' || sub?.status === 'past_due') {
      planId = sub.plan_id ?? 'free';
      commissionBps = COMMISSION_BPS[planId] ?? 0;
    } else {
      planId = 'free';
      commissionBps = COMMISSION_BPS.free;
    }
    const commissionRate = commissionBps / 10000; // e.g. 200 bps → 0.02

    // Current month boundaries (UTC)
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    // Previous month boundaries
    const prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const prevEnd   = monthStart;

    // Online paid orders for this month and last month
    const [currRes, prevRes] = await Promise.all([
      db
        .from('orders')
        .select('total')
        .eq('restaurant_id', restaurantId)
        .eq('payment_method', 'online')
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled')
        .gte('created_at', monthStart.toISOString())
        .lt('created_at', monthEnd.toISOString()),
      db
        .from('orders')
        .select('total')
        .eq('restaurant_id', restaurantId)
        .eq('payment_method', 'online')
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', prevEnd.toISOString()),
    ]);

    const currOrders = currRes.data ?? [];
    const prevOrders = prevRes.data ?? [];

    const onlineRevenueThisMonth = currOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const onlineRevenuePrevMonth = prevOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const commissionThisMonth = onlineRevenueThisMonth * commissionRate;
    const commissionPrevMonth = onlineRevenuePrevMonth * commissionRate;

    return NextResponse.json({
      planId,
      isTrial: isTrialing,
      isCommissionPlan,
      currency,
      commissionBps,
      commissionRate,
      thisMonth: {
        onlineRevenue: onlineRevenueThisMonth,
        orderCount: currOrders.length,
        commissionAmount: commissionThisMonth,
      },
      prevMonth: {
        onlineRevenue: onlineRevenuePrevMonth,
        orderCount: prevOrders.length,
        commissionAmount: commissionPrevMonth,
      },
    });
  } catch (err) {
    console.error('[billing/commissions]', err);
    return NextResponse.json({ currency: 'USD', commissionBps: 0, commissionRate: 0, thisMonth: { onlineRevenue: 0, orderCount: 0, commissionAmount: 0 }, prevMonth: { onlineRevenue: 0, orderCount: 0, commissionAmount: 0 } });
  }
}
