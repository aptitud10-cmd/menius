export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { getDashboardPlan, meetsMinPlan } from '@/lib/plan-access';
import { isSale, isReceivedOrder, summarizeSales, SALE_FIELDS, type SaleFields } from '@/lib/sales';
import {
  resolveTimezone, localDateString, addDaysToDateString, localDayRange,
  lastLocalDaysRange, previousLocalDayRange, type LocalDayRange,
} from '@/lib/date-utils';
import { fetchAllRows } from '@/lib/supabase/fetch-all';

const logger = createLogger('tenant-analytics');

const STARTER_MAX_DAYS = 30;
const PRO_MAX_DAYS = 365;

const ORDER_COLUMNS = `id, total, created_at, discount_amount, tax_amount, tip_amount, delivery_fee, order_type, ${SALE_FIELDS}`;

interface OrderRow extends SaleFields {
  id: string;
  total: number | string | null;
  created_at: string;
  discount_amount: number | string | null;
  tax_amount: number | string | null;
  tip_amount: number | string | null;
  delivery_fee: number | string | null;
  order_type: string | null;
  status: string;
}

type ProductEmbed = { name: string; cost_price: number | null };

interface ItemRow {
  id: string;
  product_id: string;
  qty: number;
  line_total: number | string;
  products: ProductEmbed | ProductEmbed[] | null;
  order: SaleFields | SaleFields[] | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const plan = await getDashboardPlan();
    const isPro = meetsMinPlan(plan, 'pro');

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const rid = tenant.restaurantId;

    const { data: restaurantInfo } = await supabase
      .from('restaurants')
      .select('currency, timezone')
      .eq('id', rid)
      .maybeSingle();

    const currency: string = restaurantInfo?.currency || 'MXN';
    // Day boundaries follow the restaurant's local calendar, not the server's (UTC).
    const timezone = resolveTimezone(restaurantInfo?.timezone as string | null | undefined);

    const maxAllowedDays = isPro ? PRO_MAX_DAYS : STARTER_MAX_DAYS;
    const today = localDateString(new Date(), timezone);
    const earliestDate = addDaysToDateString(today, -(maxAllowedDays - 1));

    let range: LocalDayRange;
    if (startParam && endParam) {
      const requested = localDayRange(startParam, endParam, timezone);
      if (!requested) {
        return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 });
      }
      if (requested.endDate < earliestDate) {
        return NextResponse.json({ error: 'Rango de fechas fuera del período de tu plan' }, { status: 400 });
      }
      // Clamp the start to the plan's history window.
      range = requested.startDate < earliestDate
        ? localDayRange(earliestDate, requested.endDate, timezone)!
        : requested;
    } else {
      const rawDays = Math.floor(Number(searchParams.get('days')) || 7);
      const days = Math.min(maxAllowedDays, Math.max(1, rawDays));
      range = lastLocalDaysRange(days, timezone);
    }
    const prevRange = previousLocalDayRange(range, timezone);

    const ordersIn = (r: LocalDayRange) =>
      fetchAllRows<OrderRow>((from, to) =>
        supabase
          .from('orders')
          .select(ORDER_COLUMNS)
          .eq('restaurant_id', rid)
          .gte('created_at', r.start.toISOString())
          .lt('created_at', r.end.toISOString())
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      );

    // Helper: convert a UTC Date to the restaurant's local date string (YYYY-MM-DD)
    const toLocalDate = (utcDateStr: string): string => localDateString(new Date(utcDateStr), timezone);

    // Helper: get local hour (0-23) and day-of-week (0=Sun) for a UTC timestamp
    const toLocalHourDow = (utcDateStr: string): { hour: number; dow: number } => {
      try {
        const d = new Date(utcDateStr);
        const hour = Number(d.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: timezone })) % 24;
        const dow = new Date(d.toLocaleDateString('en-US', { timeZone: timezone })).getDay();
        return { hour, dow };
      } catch {
        const d = new Date(utcDateStr);
        return { hour: d.getHours(), dow: d.getDay() };
      }
    };

    const [currentRes, prevRes] = await Promise.all([ordersIn(range), ordersIn(prevRange)]);
    if (currentRes.error || prevRes.error) {
      logger.error('orders query failed', { error: currentRes.error ?? prevRes.error });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
    if (currentRes.truncated) {
      logger.warn('orders truncated', { restaurantId: rid, rows: currentRes.rows.length });
    }

    // Unpaid online checkouts never reached the restaurant: not orders, not cancellations.
    const allOrders = currentRes.rows.filter(isReceivedOrder);
    const prevOrders = prevRes.rows.filter(isReceivedOrder);

    // Revenue uses the shared sale rule (lib/sales.ts), same as Home, Orders and the report.
    const current = summarizeSales(allOrders);
    const previous = summarizeSales(prevOrders);

    const totalRevenue = current.total;
    const prevRevenue = previous.total;
    const totalOrders = allOrders.length;
    const prevTotalOrders = prevOrders.length;
    const avgTicket = current.count > 0 ? totalRevenue / current.count : 0;
    const prevAvgTicket = previous.count > 0 ? prevRevenue / previous.count : 0;
    const totalDiscount = current.discount;
    const cancelledOrders = allOrders.filter(o => o.status === 'cancelled').length;
    const conversionRate = totalOrders > 0 ? ((totalOrders - cancelledOrders) / totalOrders) * 100 : 0;

    const pctChange = (current: number, previous: number): number | null => {
      if (previous === 0) return current > 0 ? 100 : null;
      return ((current - previous) / previous) * 100;
    };

    const salesByDay: Record<string, { date: string; orders: number; revenue: number }> = {};
    for (const o of allOrders) {
      const d = toLocalDate(o.created_at);
      if (!salesByDay[d]) salesByDay[d] = { date: d, orders: 0, revenue: 0 };
      salesByDay[d].orders++;
      if (isSale(o)) {
        salesByDay[d].revenue += Number(o.total);
      }
    }

    const statusCount: Record<string, number> = {};
    for (const o of allOrders) {
      statusCount[o.status] = (statusCount[o.status] || 0) + 1;
    }

    const hourlyDistribution: number[] = new Array(24).fill(0);
    // weeklyHeatmap[dayOfWeek 0=Sun][hour] = count — all in restaurant's local timezone
    const weeklyHeatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const o of allOrders) {
      const { hour, dow } = toLocalHourDow(o.created_at);
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


    // Top products: items from orders that count as a sale, in the same local-day range.
    let topProducts: { name: string; qty: number; revenue: number }[] = [];
    if (current.count > 0) {
      const itemsRes = await fetchAllRows<ItemRow>((from, to) =>
        supabase
          .from('order_items')
          .select('id, product_id, qty, line_total, products(name, cost_price), order:orders!inner(restaurant_id, created_at, status, payment_method, payment_status)')
          .eq('order.restaurant_id', rid)
          .neq('order.status', 'cancelled')
          .gte('order.created_at', range.start.toISOString())
          .lt('order.created_at', range.end.toISOString())
          .order('id', { ascending: true })
          .range(from, to),
      );
      if (itemsRes.error) {
        logger.error('order_items query failed', { error: itemsRes.error });
      }
      const items = itemsRes.rows.filter((item) => {
        const ord = Array.isArray(item.order) ? item.order[0] : item.order;
        return ord != null && isSale(ord);
      });

      const productMap: Record<string, { name: string; qty: number; revenue: number; cost: number; hasCost: boolean }> = {};
      for (const item of items) {
        const pid = item.product_id;
        const rawProds = item.products;
        const prod = Array.isArray(rawProds) ? rawProds[0] : rawProds;
        const pname = prod?.name ?? 'Desconocido';
        const costPrice = prod?.cost_price != null ? Number(prod.cost_price) : null;
        if (!productMap[pid]) productMap[pid] = { name: pname, qty: 0, revenue: 0, cost: 0, hasCost: costPrice != null };
        productMap[pid].qty += item.qty;
        productMap[pid].revenue += Number(item.line_total);
        if (costPrice != null) productMap[pid].cost += costPrice * item.qty;
      }
      topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          qty: p.qty,
          revenue: p.revenue,
          ...(p.hasCost && { cost: p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 }),
        }));
    }

    return NextResponse.json({
      currency,
      period: {
        days: range.days,
        since: range.start.toISOString(),
        startDate: range.startDate,
        endDate: range.endDate,
        timezone,
      },
      truncated: currentRes.truncated,
      summary: {
        totalOrders,
        totalRevenue,
        avgTicket,
        totalDiscount,
        totalTax: current.tax,
        totalTips: current.tip,
        completedOrders: current.count,
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
