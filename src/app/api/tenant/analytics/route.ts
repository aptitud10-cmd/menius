export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { getDashboardPlan, meetsMinPlan } from '@/lib/plan-access';

const logger = createLogger('tenant-analytics');

const STARTER_MAX_DAYS = 30;
const PRO_MAX_DAYS = 365;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const plan = await getDashboardPlan();
    const isPro = meetsMinPlan(plan, 'pro');

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    let sinceISO: string;
    let prevSinceISO: string;
    let days: number;
    let endISO: string;

    if (startParam && endParam) {
      const startDate = new Date(startParam + 'T00:00:00');
      const endDate = new Date(endParam + 'T23:59:59.999');
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
        return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 });
      }

      const maxAllowedDays = isPro ? PRO_MAX_DAYS : STARTER_MAX_DAYS;
      const maxStart = new Date();
      maxStart.setDate(maxStart.getDate() - maxAllowedDays);
      if (startDate < maxStart) {
        startDate.setTime(maxStart.getTime());
      }

      sinceISO = startDate.toISOString();
      endISO = endDate.toISOString();
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - days);
      prevSinceISO = prevStart.toISOString();
    } else {
      days = Number(searchParams.get('days')) || 7;
      const maxAllowedDays = isPro ? PRO_MAX_DAYS : STARTER_MAX_DAYS;
      if (days > maxAllowedDays) days = maxAllowedDays;
      const since = new Date();
      since.setDate(since.getDate() - days);
      sinceISO = since.toISOString();
      const prevSince = new Date();
      prevSince.setDate(prevSince.getDate() - days * 2);
      prevSinceISO = prevSince.toISOString();
      endISO = new Date().toISOString();
    }

    const rid = tenant.restaurantId;

    const { data: restaurantInfo } = await supabase
      .from('restaurants')
      .select('currency')
      .eq('id', rid)
      .maybeSingle();

    const currency: string = restaurantInfo?.currency || 'MXN';

    const [currentRes, prevRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, status, created_at, discount_amount, order_type')
        .eq('restaurant_id', rid)
        .gte('created_at', sinceISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: true }),
      supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('restaurant_id', rid)
        .gte('created_at', prevSinceISO)
        .lt('created_at', sinceISO),
    ]);

    const allOrders = currentRes.data ?? [];
    const prevOrders = prevRes.data ?? [];

    // 'ready' is excluded — it means food is prepared but not yet paid/delivered.
    // Revenue is counted only for truly finalised orders.
    const completedStatuses = ['completed', 'delivered'];
    const completedOrders = allOrders.filter(o => completedStatuses.includes(o.status));
    const prevCompleted = prevOrders.filter(o => completedStatuses.includes(o.status));

    const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.total), 0);
    const prevRevenue = prevCompleted.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = allOrders.length;
    const prevTotalOrders = prevOrders.length;
    const avgTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const prevAvgTicket = prevCompleted.length > 0 ? prevRevenue / prevCompleted.length : 0;
    const totalDiscount = allOrders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
    const cancelledOrders = allOrders.filter(o => o.status === 'cancelled').length;
    const conversionRate = totalOrders > 0 ? ((totalOrders - cancelledOrders) / totalOrders) * 100 : 0;

    const pctChange = (current: number, previous: number): number | null => {
      if (previous === 0) return current > 0 ? 100 : null;
      return ((current - previous) / previous) * 100;
    };

    const salesByDay: Record<string, { date: string; orders: number; revenue: number }> = {};
    for (const o of allOrders) {
      const d = o.created_at.split('T')[0];
      if (!salesByDay[d]) salesByDay[d] = { date: d, orders: 0, revenue: 0 };
      salesByDay[d].orders++;
      if (completedStatuses.includes(o.status)) {
        salesByDay[d].revenue += Number(o.total);
      }
    }

    const statusCount: Record<string, number> = {};
    for (const o of allOrders) {
      statusCount[o.status] = (statusCount[o.status] || 0) + 1;
    }

    const hourlyDistribution: number[] = new Array(24).fill(0);
    // weeklyHeatmap[dayOfWeek 0=Sun][hour] = count
    const weeklyHeatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const o of allOrders) {
      const d = new Date(o.created_at);
      const hour = d.getHours();
      const dow = d.getDay();
      hourlyDistribution[hour]++;
      weeklyHeatmap[dow][hour]++;
    }

    const maxOrdersInHour = Math.max(...hourlyDistribution);
    const peakHour = maxOrdersInHour > 0 ? hourlyDistribution.indexOf(maxOrdersInHour) : null;
    const peakHourLabel = peakHour !== null
      ? `${peakHour.toString().padStart(2, '0')}:00 - ${((peakHour + 1) % 24).toString().padStart(2, '0')}:00`
      : null;

    // Order type breakdown
    const orderTypeCount: Record<string, number> = {};
    for (const o of allOrders) {
      const ot = o.order_type ?? 'unknown';
      orderTypeCount[ot] = (orderTypeCount[ot] || 0) + 1;
    }


    const orderIds = allOrders.map(o => o.id);
    let topProducts: { name: string; qty: number; revenue: number }[] = [];
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, qty, line_total, products(name)')
        .in('order_id', orderIds);

      const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      for (const item of (items ?? [])) {
        const pid = item.product_id;
        const pname = (item as { products: { name: string } | null }).products?.name ?? 'Desconocido';
        if (!productMap[pid]) productMap[pid] = { name: pname, qty: 0, revenue: 0 };
        productMap[pid].qty += item.qty;
        productMap[pid].revenue += Number(item.line_total);
      }
      topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }

    return NextResponse.json({
      currency,
      period: { days, since: sinceISO },
      summary: {
        totalOrders,
        totalRevenue,
        avgTicket,
        totalDiscount,
        completedOrders: completedOrders.length,
        cancelledOrders,
        conversionRate,
        peakHour: peakHourLabel,
      },
      comparison: {
        revenueChange: pctChange(totalRevenue, prevRevenue),
        ordersChange: pctChange(totalOrders, prevTotalOrders),
        ticketChange: pctChange(avgTicket, prevAvgTicket),
      },
      salesByDay: Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date)),
      hourlyDistribution,
      weeklyHeatmap,
      statusCount,
      orderTypeCount,
      topProducts,
    });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
