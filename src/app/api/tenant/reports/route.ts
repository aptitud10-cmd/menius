export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { formatPrice } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    const format = searchParams.get('format') || 'csv';
    const days = Math.min(365, Math.max(1, parseInt(period)));

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const supabase = createClient();

    const [{ data: restaurant }, { data: orders }] = await Promise.all([
      supabase.from('restaurants').select('name, currency').eq('id', tenant.restaurantId).maybeSingle(),
      supabase
        .from('orders')
        .select('order_number, customer_name, customer_phone, customer_email, status, order_type, payment_method, total, discount_amount, delivery_address, notes, created_at')
        .eq('restaurant_id', tenant.restaurantId)
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
    ]);

    const currency = restaurant?.currency ?? 'USD';
    const restaurantName = restaurant?.name ?? 'Restaurante';
    const allOrders = orders ?? [];

    if (format === 'csv') {
      const header = 'Número,Fecha,Cliente,Teléfono,Email,Estado,Tipo,Pago,Total,Descuento,Dirección,Notas';
      const rows = allOrders.map(o => {
        const date = new Date(o.created_at).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return [
          o.order_number,
          date,
          `"${(o.customer_name || '').replace(/"/g, '""')}"`,
          o.customer_phone || '',
          o.customer_email || '',
          o.status,
          o.order_type || 'dine_in',
          o.payment_method || 'cash',
          Number(o.total).toFixed(2),
          Number(o.discount_amount || 0).toFixed(2),
          `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
          `"${(o.notes || '').replace(/"/g, '""')}"`,
        ].join(',');
      });

      const csv = [header, ...rows].join('\n');
      const bom = '\uFEFF';

      return new NextResponse(bom + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${restaurantName}-reporte-${days}d.csv"`,
        },
      });
    }

    // HTML report (printable as PDF from browser)
    const completed = allOrders.filter(o => ['completed', 'delivered', 'ready'].includes(o.status));
    const totalRevenue = completed.reduce((s, o) => s + Number(o.total), 0);
    const totalDiscount = allOrders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
    const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

    const byType: Record<string, number> = {};
    for (const o of allOrders) {
      const t = o.order_type || 'dine_in';
      byType[t] = (byType[t] || 0) + 1;
    }

    const typeLabels: Record<string, string> = { dine_in: 'En restaurante', pickup: 'Para recoger', delivery: 'Delivery' };

    const orderRows = allOrders.slice(0, 200).map(o => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${o.order_number}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${new Date(o.created_at).toLocaleDateString('es')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${o.customer_name || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${o.status}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right;font-weight:600;">${formatPrice(Number(o.total), currency)}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Reporte de Ventas — ${restaurantName}</title>
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
  <p class="subtitle">${restaurantName} — Últimos ${days} días (${new Date(since).toLocaleDateString('es')} - ${new Date().toLocaleDateString('es')})</p>

  <div class="stats">
    <div class="stat">
      <p class="stat-label">Ingresos</p>
      <p class="stat-value" style="color:#059669;">${formatPrice(totalRevenue, currency)}</p>
    </div>
    <div class="stat">
      <p class="stat-label">Órdenes completadas</p>
      <p class="stat-value">${completed.length}</p>
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
    <br><span style="font-size:13px;color:#6b7280;">Descuentos otorgados: ${formatPrice(totalDiscount, currency)}</span>
  </div>

  <h3 style="font-size:14px;margin:0 0 12px;">Detalle de órdenes (${Math.min(200, allOrders.length)} de ${allOrders.length})</h3>
  <table>
    <thead><tr><th>Orden</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th style="text-align:right;">Total</th></tr></thead>
    <tbody>${orderRows}</tbody>
  </table>

  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:40px;">
    Generado por MENIUS — ${new Date().toLocaleString('es')}
  </p>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err) {
    console.error('[reports GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
