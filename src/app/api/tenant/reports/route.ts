export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { formatPrice } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import { isSale, isReceivedOrder, summarizeSales, SALE_FIELDS, type SaleFields } from '@/lib/sales';
import { resolveTimezone, localDayRange, lastLocalDaysRange, type LocalDayRange } from '@/lib/date-utils';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { csvRow } from '@/lib/csv';

const ORDER_COLUMNS = `id, order_number, customer_name, customer_phone, customer_email, order_type, total, discount_amount, tax_amount, tip_amount, delivery_fee, delivery_address, notes, created_at, ${SALE_FIELDS}`;

interface ReportOrder extends SaleFields {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  status: string;
  order_type: string | null;
  total: number | string | null;
  discount_amount: number | string | null;
  tax_amount: number | string | null;
  tip_amount: number | string | null;
  delivery_fee: number | string | null;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
}

const money = (v: unknown): string => (Number(v ?? 0) || 0).toFixed(2);

/** Formats a YYYY-MM-DD calendar date without shifting it through a timezone. */
const formatCalendarDate = (dateStr: string): string =>
  new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('es', { timeZone: 'UTC' });

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const logger = createLogger('tenant-reports');

export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const format = searchParams.get('format') || 'csv';

    const supabase = await createClient();
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, currency, timezone')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    // Day boundaries and printed dates follow the restaurant's timezone, not the server's (UTC).
    const timezone = resolveTimezone(restaurant?.timezone as string | null | undefined);

    let range: LocalDayRange;
    const isCustomRange = Boolean(startParam && endParam);
    if (startParam && endParam) {
      const requested = localDayRange(startParam, endParam, timezone);
      if (!requested) {
        return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 });
      }
      range = requested;
    } else {
      const period = searchParams.get('period') || '30';
      const rawDays = parseInt(period, 10);
      if (isNaN(rawDays)) {
        return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
      }
      range = lastLocalDaysRange(Math.min(365, Math.max(1, rawDays)), timezone);
    }
    const days = range.days;

    const ordersRes = await fetchAllRows<ReportOrder>((from, to) =>
      supabase
        .from('orders')
        .select(ORDER_COLUMNS)
        .eq('restaurant_id', tenant.restaurantId)
        .gte('created_at', range.start.toISOString())
        .lt('created_at', range.end.toISOString())
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to),
    );
    if (ordersRes.error) {
      logger.error('orders query failed', { error: ordersRes.error });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
    if (ordersRes.truncated) {
      logger.warn('orders truncated', { restaurantId: tenant.restaurantId, rows: ordersRes.rows.length });
    }

    const currency = restaurant?.currency ?? 'USD';
    const restaurantName = restaurant?.name ?? 'Restaurante';
    const safeRestaurantName = escHtml(restaurantName);
    // Strip characters unsafe in HTTP header values for Content-Disposition
    const filenameSlug = restaurantName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
    // Unpaid online checkouts never reached the restaurant: left out of the report.
    const allOrders = ordersRes.rows.filter(isReceivedOrder);

    const localDate = (iso: string) =>
      new Date(iso).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone });
    const localTime = (iso: string) =>
      new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });

    if (format === 'csv') {
      // "Venta" marks the rows that add up to the report's sales total (lib/sales.ts).
      const header = 'Número,Fecha,Hora,Cliente,Teléfono,Email,Estado,Tipo,Pago,Estado del pago,Venta,Total,Impuesto,Propina,Envío,Descuento,Dirección,Notas';
      const rows = allOrders.map(o => {
        return csvRow([
          o.order_number,
          localDate(o.created_at),
          localTime(o.created_at),
          o.customer_name || '',
          o.customer_phone || '',
          o.customer_email || '',
          o.status,
          o.order_type || 'dine_in',
          o.payment_method || 'cash',
          o.payment_status || '',
          isSale(o) ? 'Sí' : 'No',
          money(o.total),
          money(o.tax_amount),
          money(o.tip_amount),
          money(o.delivery_fee),
          money(o.discount_amount),
          o.delivery_address || '',
          o.notes || '',
        ]);
      });

      const csv = [header, ...rows].join('\n');
      const bom = '\uFEFF';

      return new NextResponse(bom + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameSlug}-reporte-${days}d.csv"`,
        },
      });
    }

    // HTML report (printable as PDF from browser)
    // Same sale rule as Home, Analytics and Orders (lib/sales.ts).
    const sales = summarizeSales(allOrders);
    const totalRevenue = sales.total;
    const totalDiscount = sales.discount;
    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
    const avgTicket = sales.count > 0 ? totalRevenue / sales.count : 0;

    const byType: Record<string, number> = {};
    for (const o of allOrders) {
      const t = o.order_type || 'dine_in';
      byType[t] = (byType[t] || 0) + 1;
    }

    const typeLabels: Record<string, string> = { dine_in: 'En restaurante', pickup: 'Para recoger', delivery: 'Delivery' };

    const orderRows = allOrders.slice(0, 200).map(o => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${escHtml(String(o.order_number ?? ''))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${localDate(o.created_at)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${escHtml(o.customer_name || '—')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${escHtml(o.status ?? '')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right;font-weight:600;">${formatPrice(Number(o.total), currency)}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Reporte de Ventas — ${safeRestaurantName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #111827; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    .subtitle { color: #6b7280; font-size: 14px; margin: 0 0 32px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat { background: #f9fafb; border-radius: 12px; padding: 16px; }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin: 0 0 4px; }
    .stat-value { font-size: 24px; font-weight: 700; margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; border-bottom: 2px solid #e5e7eb; }
    th:last-child { text-align: right; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Reporte de Ventas</h1>
  <p class="subtitle">${safeRestaurantName} — ${isCustomRange ? `${formatCalendarDate(range.startDate)} - ${formatCalendarDate(range.endDate)}` : `Últimos ${days} días (${formatCalendarDate(range.startDate)} - ${formatCalendarDate(range.endDate)})`}</p>

  <div class="stats">
    <div class="stat">
      <p class="stat-label">Ingresos</p>
      <p class="stat-value" style="color:#059669;">${formatPrice(totalRevenue, currency)}</p>
    </div>
    <div class="stat">
      <p class="stat-label">Órdenes con venta</p>
      <p class="stat-value">${sales.count}</p>
    </div>
    <div class="stat">
      <p class="stat-label">Ticket promedio</p>
      <p class="stat-value">${formatPrice(avgTicket, currency)}</p>
    </div>
    <div class="stat">
      <p class="stat-label">Canceladas</p>
      <p class="stat-value" style="color:#dc2626;">${cancelled}</p>
    </div>
  </div>

  <div style="margin-bottom:32px;">
    <h3 style="font-size:14px;margin:0 0 8px;">Por tipo de orden</h3>
    ${Object.entries(byType).map(([t, count]) => `<span style="display:inline-block;margin-right:16px;font-size:13px;"><strong>${typeLabels[t] || t}:</strong> ${count}</span>`).join('')}
    <br><span style="font-size:13px;color:#6b7280;">Descuentos otorgados: ${formatPrice(totalDiscount, currency)} · Impuestos: ${formatPrice(sales.tax, currency)} · Propinas: ${formatPrice(sales.tip, currency)} · Envíos: ${formatPrice(sales.deliveryFee, currency)}</span>
  </div>

  <h3 style="font-size:14px;margin:0 0 12px;">Detalle de órdenes (${Math.min(200, allOrders.length)} de ${escHtml(String(allOrders.length))})</h3>
  <table>
    <thead><tr><th>Orden</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th style="text-align:right;">Total</th></tr></thead>
    <tbody>${orderRows}</tbody>
  </table>

  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:40px;">
    Generado por MENIUS — ${new Date().toLocaleString('es', { timeZone: timezone })}
  </p>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
