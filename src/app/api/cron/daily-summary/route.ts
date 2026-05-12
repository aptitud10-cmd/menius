export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/notifications/email';
import { buildWeeklyDigestEmail } from '@/lib/notifications/retention-emails';
import { createLogger } from '@/lib/logger';

const logger = createLogger('weekly-digest');

/**
 * Weekly digest cron — runs every Monday at 9am UTC.
 * Sends each restaurant owner a summary of the past 7 days:
 * revenue, orders, avg ticket, top product, alerts, and a tip.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app').replace(/\/$/, '');

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const riskThreshold = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all active restaurants with owner email
  const { data: restaurants, error: restError } = await admin
    .from('restaurants')
    .select('id, name, slug, email, locale, currency')
    .eq('is_active', true)
    .not('email', 'is', null)
    .neq('email', '');

  if (restError || !restaurants) {
    logger.error('Failed to fetch restaurants', { error: restError?.message });
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }

  const completedStatuses = ['completed', 'delivered', 'ready'];
  let sent = 0;
  let skipped = 0;

  for (const restaurant of restaurants) {
    try {
      const rid = restaurant.id;

      const [
        { data: weekOrders },
        { data: prevWeekOrders },
        { data: topProductsRaw },
        { data: atRiskCustomers },
        { data: pendingOrders },
        { data: products },
        { data: promotions },
      ] = await Promise.all([
        admin.from('orders').select('id, status, total').eq('restaurant_id', rid).gte('created_at', weekAgo),
        admin.from('orders').select('id, status, total').eq('restaurant_id', rid).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
        admin.from('order_items').select('product_id, line_total, products!inner(name, is_active)').eq('products.restaurant_id', rid).gte('created_at', weekAgo).limit(300),
        admin.from('customers').select('id').eq('restaurant_id', rid).lt('last_order_at', riskThreshold).gte('total_orders', 2),
        admin.from('orders').select('id').eq('restaurant_id', rid).eq('status', 'pending'),
        admin.from('products').select('id, is_active, image_url').eq('restaurant_id', rid).eq('is_active', true),
        admin.from('promotions').select('id').eq('restaurant_id', rid).eq('is_active', true),
      ]);

      const completedWeek = (weekOrders ?? []).filter(o => completedStatuses.includes(o.status));
      const weekRevenue = completedWeek.reduce((s, o) => s + Number(o.total), 0);
      const weekOrderCount = completedWeek.length;

      // Skip restaurants with 0 activity this week — nothing useful to report
      if (weekOrderCount === 0) {
        skipped++;
        continue;
      }

      const completedPrev = (prevWeekOrders ?? []).filter(o => completedStatuses.includes(o.status));
      const prevWeekRevenue = completedPrev.reduce((s, o) => s + Number(o.total), 0);
      const prevWeekOrderCount = completedPrev.length;

      const avgTicket = weekOrderCount > 0 ? weekRevenue / weekOrderCount : 0;

      // Top product by revenue this week
      const productRevMap: Record<string, { name: string; revenue: number }> = {};
      for (const item of topProductsRaw ?? []) {
        const prod = item as unknown as { product_id: string; line_total: number; products: { name: string } };
        if (!prod.product_id) continue;
        if (!productRevMap[prod.product_id]) productRevMap[prod.product_id] = { name: prod.products?.name ?? prod.product_id, revenue: 0 };
        productRevMap[prod.product_id].revenue += Number(prod.line_total);
      }
      const sortedProds = Object.values(productRevMap).sort((a, b) => b.revenue - a.revenue);
      const topProduct = sortedProds[0] ?? null;

      const atRiskCount = (atRiskCustomers ?? []).length;
      const pendingCount = (pendingOrders ?? []).length;
      const productsWithoutImage = (products ?? []).filter(p => !p.image_url).length;
      const activePromos = (promotions ?? []).length;

      const locale = restaurant.locale ?? 'es';
      const currency = restaurant.currency ?? 'USD';
      const en = locale === 'en';

      // Pick contextual tip based on what data shows
      let tip: string;
      let tipCta: string;
      let tipCtaUrl: string;

      if (productsWithoutImage > 0) {
        tip = en
          ? `${productsWithoutImage} of your products don't have photos. Products with photos sell up to 30% more. Add photos in Menu → Products.`
          : `${productsWithoutImage} de tus productos no tienen foto. Los productos con foto se venden hasta 30% más. Agrégalas en Menú → Productos.`;
        tipCta = en ? 'Add photos now' : 'Agregar fotos';
        tipCtaUrl = `${appUrl}/app/menu/products`;
      } else if (activePromos === 0) {
        tip = en
          ? 'You have no active promotions. A well-placed discount code can increase weekly orders by 15-20%. Create one in Promotions.'
          : 'No tienes promociones activas. Un código de descuento bien puesto puede aumentar los pedidos semanales 15-20%. Crea uno en Promociones.';
        tipCta = en ? 'Create a promo' : 'Crear promoción';
        tipCtaUrl = `${appUrl}/app/promotions`;
      } else if (atRiskCount > 0) {
        tip = en
          ? `${atRiskCount} customers haven't ordered in 21+ days. Send them a reactivation campaign with a discount to bring them back.`
          : `${atRiskCount} clientes no han pedido en 21+ días. Envíales una campaña de reactivación con un descuento para recuperarlos.`;
        tipCta = en ? 'Send campaign' : 'Enviar campaña';
        tipCtaUrl = `${appUrl}/app/marketing`;
      } else {
        tip = en
          ? 'Check your peak hours in Analytics to schedule your team at the right time and reduce wait times.'
          : 'Revisa tus horas pico en Analytics para programar a tu equipo en el momento correcto y reducir tiempos de espera.';
        tipCta = en ? 'View analytics' : 'Ver analytics';
        tipCtaUrl = `${appUrl}/app/analytics`;
      }

      const ownerName = restaurant.name; // fallback — ideal would be owner profile name
      const html = buildWeeklyDigestEmail({
        ownerName,
        restaurantName: restaurant.name,
        dashboardUrl: `${appUrl}/app`,
        locale,
        currency,
        weekRevenue,
        weekOrders: weekOrderCount,
        avgTicket,
        prevWeekRevenue,
        prevWeekOrders: prevWeekOrderCount,
        topProduct: topProduct?.name ?? null,
        topProductRevenue: topProduct?.revenue ?? 0,
        atRiskCount,
        pendingOrdersCount: pendingCount,
        productsWithoutImage,
        activePromos,
        tip,
        tipCta,
        tipCtaUrl,
      });

      const subject = en
        ? `Your week at ${restaurant.name} — ${weekOrderCount} orders, ${currency} ${weekRevenue.toFixed(2)}`
        : `Tu semana en ${restaurant.name} — ${weekOrderCount} órdenes, ${currency} ${weekRevenue.toFixed(2)}`;

      const success = await sendEmail({
        to: restaurant.email,
        subject,
        html,
      });

      if (success) sent++;
      else skipped++;
    } catch (err) {
      logger.error('Weekly digest failed for restaurant', {
        restaurantId: restaurant.id,
        error: err instanceof Error ? err.message : String(err),
      });
      skipped++;
    }
  }

  logger.info('Weekly digest complete', { sent, skipped, total: restaurants.length });
  return NextResponse.json({ sent, skipped, total: restaurants.length });
}
