export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEffectivePlanId } from '@/lib/auth/check-plan';

const COMMISSION_BPS: Record<string, number> = {
  free: 200,
  starter: 100,
  pro: 0,
  business: 0,
};

export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { restaurantId } = tenant;
    const db = createAdminClient();

    // Effective plan determines current commission rate
    const planId = await getEffectivePlanId(restaurantId);
    const commissionBps = COMMISSION_BPS[planId] ?? 0;
    const commissionRate = commissionBps / 10000; // e.g. 200 bps → 0.02

    // Current month boundaries (UTC)
    const now = new Date();
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
    return NextResponse.json({ commissionBps: 0, commissionRate: 0, thisMonth: { onlineRevenue: 0, orderCount: 0, commissionAmount: 0 }, prevMonth: { onlineRevenue: 0, orderCount: 0, commissionAmount: 0 } });
  }
}
