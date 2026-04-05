export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/notifications/email';
import { createLogger } from '@/lib/logger';

const logger = createLogger('email-automations');

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = { welcome: 0, reactivation: 0, review_request: 0, platform_trial: 0, platform_setup: 0, platform_inactive: 0, onboarding_d1: 0, onboarding_d3: 0, onboarding_d7: 0, monthly_report: 0, errors: 0 };

  // Restaurant cache to avoid N+1 queries across all sections
  const restaurantCache = new Map<string, { name: string; slug: string; locale: string; notification_email?: string }>();
  async function getRestaurant(id: string) {
    if (restaurantCache.has(id)) return restaurantCache.get(id)!;
    const { data } = await supabase
      .from('restaurants')
      .select('name, slug, locale, notification_email')
      .eq('id', id)
      .maybeSingle();
    if (data) restaurantCache.set(id, data);
    return data;
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

    // 1. Welcome emails: customers created in last 24h who haven't received a welcome
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: newCustomers } = await supabase
      .from('customers')
      .select('id, name, email, restaurant_id, tags')
      .not('email', 'is', null)
      .neq('email', '')
      .gte('created_at', oneDayAgo)
      .limit(100);

    for (const customer of newCustomers ?? []) {
      if ((customer.tags ?? []).includes('welcome_sent')) continue;
      if ((customer.tags ?? []).includes('unsubscribed')) continue;

      const restaurant = await getRestaurant(customer.restaurant_id);
      if (!restaurant) continue;

      const en = restaurant.locale === 'en';
      const menuUrl = `${appUrl}/${restaurant.slug}`;
      const unsubUrl = `${appUrl}/api/unsubscribe?id=${customer.id}`;

      const sent = await sendEmail({
        to: customer.email,
        subject: en ? `Welcome to ${restaurant.name}! 🎉` : `¡Bienvenido a ${restaurant.name}! 🎉`,
        html: buildWelcomeEmail(customer.name || (en ? 'Customer' : 'Cliente'), restaurant.name, menuUrl, unsubUrl, en),
      });

      if (sent) {
        results.welcome++;
        const newTags = [...(customer.tags ?? []), 'welcome_sent'];
        await supabase.from('customers').update({ tags: newTags }).eq('id', customer.id);
      } else {
        results.errors++;
      }
    }

    // 2. Reactivation: customers inactive 30+ days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inactiveCustomers } = await supabase
      .from('customers')
      .select('id, name, email, restaurant_id, tags, last_order_at')
      .not('email', 'is', null)
      .neq('email', '')
      .lt('last_order_at', thirtyDaysAgo)
      .gte('last_order_at', sixtyDaysAgo)
      .limit(50);

    for (const customer of inactiveCustomers ?? []) {
      if ((customer.tags ?? []).includes('reactivation_sent')) continue;
      if ((customer.tags ?? []).includes('unsubscribed')) continue;

      const restaurant = await getRestaurant(customer.restaurant_id);
      if (!restaurant) continue;

      const en = restaurant.locale === 'en';
      const menuUrl = `${appUrl}/${restaurant.slug}`;
      const unsubUrl = `${appUrl}/api/unsubscribe?id=${customer.id}`;

      const sent = await sendEmail({
        to: customer.email,
        subject: en ? `We miss you, ${customer.name || 'friend'}! 😢` : `Te extrañamos, ${customer.name || 'amigo'}! 😢`,
        html: buildReactivationEmail(customer.name || (en ? 'Customer' : 'Cliente'), restaurant.name, menuUrl, unsubUrl, en),
      });

      if (sent) {
        results.reactivation++;
        const newTags = [...(customer.tags ?? []), 'reactivation_sent'];
        await supabase.from('customers').update({ tags: newTags }).eq('id', customer.id);
      } else {
        results.errors++;
      }
    }

    // 3. Review request: delivered orders from 1-2 days ago without a review
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, restaurant_id')
      .eq('status', 'delivered')
      .not('customer_email', 'is', null)
      .neq('customer_email', '')
      .gte('updated_at', twoDaysAgo)
      .lt('updated_at', oneDayAgo)
      .limit(50);

    for (const order of deliveredOrders ?? []) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', order.id)
        .maybeSingle();

      if (existingReview) continue;

      const restaurant = await getRestaurant(order.restaurant_id);
      if (!restaurant) continue;

      const en = restaurant.locale === 'en';
      // Link directly to the order tracker page so the review form is visible immediately
      const reviewUrl = `${appUrl}/${restaurant.slug}/orden/${order.order_number}`;

      const sent = await sendEmail({
        to: order.customer_email,
        subject: en ? `How was your order at ${restaurant.name}? ⭐` : `¿Cómo estuvo tu pedido en ${restaurant.name}? ⭐`,
        html: buildReviewRequestEmail(order.customer_name || (en ? 'Customer' : 'Cliente'), restaurant.name, reviewUrl, en),
      });

      if (sent) results.review_request++;
      else results.errors++;
    }

    // ═══════════════════════════════════════════════════════════
    // PLATFORM → RESTAURANT OWNER automations (MENIUS marketing)
    // ═══════════════════════════════════════════════════════════

    // 4. Trial expiring: restaurants with trial ending in 3 days or less
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const { data: trialRestaurants } = await supabase
      .from('subscriptions')
      .select('restaurant_id, trial_end')
      .eq('status', 'trialing')
      .lte('trial_end', threeDaysFromNow)
      .gte('trial_end', now)
      .limit(50);

    for (const sub of trialRestaurants ?? []) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, notification_email, owner_user_id, locale')
        .eq('id', sub.restaurant_id)
        .maybeSingle();

      if (!restaurant?.notification_email) continue;

      const en = restaurant.locale === 'en';
      const daysLeft = Math.ceil((new Date(sub.trial_end!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const dashUrl = `${appUrl}/app/billing`;

      const sent = await sendEmail({
        to: restaurant.notification_email,
        subject: en
          ? `⏰ Your MENIUS trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
          : `⏰ Tu prueba de MENIUS termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
        html: buildTrialExpiringEmail(restaurant.name, daysLeft, dashUrl, en),
      });

      if (sent) results.platform_trial++;
      else results.errors++;
    }

    // 5. Setup incomplete: restaurants created 2+ days ago with no products
    const twoDaysAgoSetup = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgoSetup = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: newRestaurants } = await supabase
      .from('restaurants')
      .select('id, name, notification_email, slug, locale, tags')
      .lte('created_at', twoDaysAgoSetup)
      .gte('created_at', sevenDaysAgoSetup)
      .not('notification_email', 'is', null)
      .limit(50);

    for (const restaurant of newRestaurants ?? []) {
      if (!restaurant.notification_email) continue;
      if ((restaurant.tags ?? []).includes('setup_email_sent')) continue;

      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id);

      if ((count ?? 0) > 0) continue;

      const en = restaurant.locale === 'en';
      const setupUrl = `${appUrl}/app/menu/products`;

      const sent = await sendEmail({
        to: restaurant.notification_email,
        subject: en
          ? `🍽️ ${restaurant.name}: your menu is empty — set it up in minutes`
          : `🍽️ ${restaurant.name}: tu menú está vacío — configúralo en minutos`,
        html: buildSetupIncompleteEmail(restaurant.name, setupUrl, en),
      });

      if (sent) {
        results.platform_setup++;
        try {
          await supabase.rpc('append_restaurant_tag', { p_restaurant_id: restaurant.id, p_tag: 'setup_email_sent' });
        } catch { /* non-blocking */ }
      } else {
        results.errors++;
      }
    }

    // 6. No orders nudge: restaurants with products but 0 orders in last 14 days
    const { data: activeRestaurants } = await supabase
      .from('restaurants')
      .select('id, name, notification_email, slug, locale, tags')
      .eq('is_active', true)
      .not('notification_email', 'is', null)
      .limit(100);

    if (activeRestaurants && activeRestaurants.length > 0) {
      const restIds = activeRestaurants.map((r) => r.id);
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: productsPerRest }, { data: recentOrders }] = await Promise.all([
        supabase.from('products').select('restaurant_id').eq('is_active', true).in('restaurant_id', restIds),
        supabase.from('orders').select('restaurant_id').in('restaurant_id', restIds).gte('created_at', fourteenDaysAgo),
      ]);

      const hasProducts = new Set((productsPerRest ?? []).map((p) => p.restaurant_id));
      const hasRecentOrders = new Set((recentOrders ?? []).map((o) => o.restaurant_id));

      for (const restaurant of activeRestaurants) {
        if (!restaurant.notification_email) continue;
        if (!hasProducts.has(restaurant.id)) continue;
        if (hasRecentOrders.has(restaurant.id)) continue;
        if ((restaurant.tags ?? []).includes('no_orders_email_sent')) continue;

        const en = restaurant.locale === 'en';
        const tipsUrl = `${appUrl}/app`;

        const sent = await sendEmail({
          to: restaurant.notification_email,
          subject: en
            ? `📊 Tips to get your first order at ${restaurant.name}`
            : `📊 Tips para recibir tu primer pedido en ${restaurant.name}`,
          html: buildNoOrdersEmail(restaurant.name, `${appUrl}/${restaurant.slug}`, tipsUrl, en),
        });

        if (sent) {
          results.platform_inactive++;
          try {
            await supabase.rpc('append_restaurant_tag', { p_restaurant_id: restaurant.id, p_tag: 'no_orders_email_sent' });
          } catch { /* non-blocking */ }
        } else {
          results.errors++;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // ONBOARDING SEQUENCE (Day 1, 3, 7)
    // ═══════════════════════════════════════════════════════════

    const onboardingDays = [
      { days: 1, key: 'onboarding_d1' as const, tag: 'onboarding_d1_sent', builder: buildOnboardingDay1Email },
      { days: 3, key: 'onboarding_d3' as const, tag: 'onboarding_d3_sent', builder: buildOnboardingDay3Email },
      { days: 7, key: 'onboarding_d7' as const, tag: 'onboarding_d7_sent', builder: buildOnboardingDay7Email },
    ];

    for (const step of onboardingDays) {
      const targetDate = new Date(Date.now() - step.days * 24 * 60 * 60 * 1000);
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).toISOString();
      const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1).toISOString();

      const { data: targetRestaurants } = await supabase
        .from('restaurants')
        .select('id, name, slug, notification_email, locale')
        .gte('created_at', dayStart)
        .lt('created_at', dayEnd)
        .not('notification_email', 'is', null)
        .limit(50);

      for (const restaurant of targetRestaurants ?? []) {
        if (!restaurant.notification_email) continue;

        const { data: existingTag } = await supabase
          .from('restaurants')
          .select('id')
          .eq('id', restaurant.id)
          .contains('tags', [step.tag])
          .maybeSingle();

        if (existingTag) continue;

        const en = restaurant.locale === 'en';
        const dashUrl = `${appUrl}/app`;
        const menuUrl = `${appUrl}/${restaurant.slug}`;

        const sent = await sendEmail({
          to: restaurant.notification_email,
          subject: step.builder('subject', restaurant.name, undefined, undefined, en),
          html: step.builder('html', restaurant.name, dashUrl, menuUrl, en),
        });

        if (sent) {
          results[step.key]++;
          try { await supabase.rpc('append_restaurant_tag', { p_restaurant_id: restaurant.id, p_tag: step.tag }); } catch {};
        } else {
          results.errors++;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MONTHLY REPORT (1st of month)
    // ═══════════════════════════════════════════════════════════

    const today = new Date();
    if (today.getDate() === 1) {
      // Build idempotency tag for this specific month (e.g. "monthly_report_2026_03")
      // getMonth() is 0-indexed so add 1 to get the correct month number
      const reportMonthTag = `monthly_report_${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}`;

      const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
      const monthEnd = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const { data: activeRests } = await supabase
        .from('restaurants')
        .select('id, name, notification_email, slug, locale, tags')
        .eq('is_active', true)
        .not('notification_email', 'is', null)
        .limit(200);

      if (activeRests && activeRests.length > 0) {
        const restIds = activeRests.map((r) => r.id);

        const [{ data: monthOrders }, { data: monthCustomers }] = await Promise.all([
          supabase.from('orders').select('restaurant_id, total').in('restaurant_id', restIds).gte('created_at', monthStart).lt('created_at', monthEnd),
          supabase.from('customers').select('restaurant_id').in('restaurant_id', restIds).gte('created_at', monthStart).lt('created_at', monthEnd),
        ]);

        const ordersByRest = new Map<string, { count: number; revenue: number }>();
        for (const o of monthOrders ?? []) {
          const entry = ordersByRest.get(o.restaurant_id) ?? { count: 0, revenue: 0 };
          entry.count++;
          entry.revenue += Number(o.total ?? 0);
          ordersByRest.set(o.restaurant_id, entry);
        }

        const customersByRest = new Map<string, number>();
        for (const c of monthCustomers ?? []) {
          customersByRest.set(c.restaurant_id, (customersByRest.get(c.restaurant_id) ?? 0) + 1);
        }

        for (const restaurant of activeRests) {
          if (!restaurant.notification_email) continue;

          // Skip if already sent for this month (idempotency)
          if ((restaurant.tags ?? []).includes(reportMonthTag)) continue;

          const en = restaurant.locale === 'en';
          const stats = ordersByRest.get(restaurant.id) ?? { count: 0, revenue: 0 };
          const newCustCount = customersByRest.get(restaurant.id) ?? 0;
          const dashUrl = `${appUrl}/app/analytics`;

          const sent = await sendEmail({
            to: restaurant.notification_email,
            subject: en
              ? `📊 Monthly report for ${restaurant.name} — MENIUS`
              : `📊 Resumen mensual de ${restaurant.name} — MENIUS`,
            html: buildMonthlyReportEmail(restaurant.name, stats.count, newCustCount, stats.revenue, dashUrl, en),
          });

          if (sent) {
            results.monthly_report++;
            // Mark as sent for this month to prevent duplicate sends on cron retries
            try {
              await supabase.rpc('append_restaurant_tag', { p_restaurant_id: restaurant.id, p_tag: reportMonthTag });
            } catch { /* non-blocking */ }
          } else {
            results.errors++;
          }
        }
      }
    }

    logger.info('Automations completed', results);
    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    logger.error('Automations failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildUnsubscribeFooter(unsubUrl: string, restaurantName: string, en: boolean): string {
  return `<p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;">
    ${en ? `Sent by ${restaurantName} via MENIUS` : `Enviado por ${restaurantName} a través de MENIUS`} ·
    <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">
      ${en ? 'Unsubscribe' : 'Darme de baja'}
    </a>
  </p>`;
}

function buildWelcomeEmail(name: string, restaurantName: string, menuUrl: string, unsubUrl: string, en = false): string {
  const safeName = escHtml(name);
  const safeRest = escHtml(restaurantName);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:20px;font-weight:800;color:#7c3aed;margin:0;">${safeRest}</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:32px 24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${en ? `Hi ${safeName}` : `Hola ${safeName}`}, 👋</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${en ? `Welcome to <strong>${safeRest}</strong>! We're thrilled to have you as a customer.` : `¡Bienvenido a <strong>${safeRest}</strong>! Estamos encantados de tenerte como cliente.`}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${en ? 'You can browse our full menu and place orders anytime from your phone.' : 'Puedes ver nuestro menú completo y hacer pedidos en cualquier momento desde tu celular.'}</p>
      <a href="${menuUrl}" style="display:block;margin-top:24px;padding:14px;background:#7c3aed;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        ${en ? 'View our menu' : 'Ver nuestro menú'}
      </a>
    </div>
    ${buildUnsubscribeFooter(unsubUrl, safeRest, en)}
  </div>
</body>
</html>`;
}

function buildReactivationEmail(name: string, restaurantName: string, menuUrl: string, unsubUrl: string, en = false): string {
  const safeName = escHtml(name);
  const safeRest = escHtml(restaurantName);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:20px;font-weight:800;color:#7c3aed;margin:0;">${safeRest}</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:32px 24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${en ? `Hi ${safeName}` : `Hola ${safeName}`}, 😢</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${en ? `It's been a while since your last visit and <strong>we miss you</strong>. We've been preparing delicious new dishes and would love for you to come back and try them.` : `Hace tiempo que no nos visitas y <strong>te echamos de menos</strong>. Hemos estado preparando cosas deliciosas y nos encantaría que vuelvas a probarlas.`}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${en ? 'We hope to see you again soon!' : '¡Te esperamos de vuelta!'}</p>
      <a href="${menuUrl}" style="display:block;margin-top:24px;padding:14px;background:#7c3aed;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        ${en ? 'Order again' : 'Pedir de nuevo'}
      </a>
    </div>
    ${buildUnsubscribeFooter(unsubUrl, safeRest, en)}
  </div>
</body>
</html>`;
}

function buildReviewRequestEmail(name: string, restaurantName: string, menuUrl: string, en = false): string {
  const safeName = escHtml(name);
  const safeRest = escHtml(restaurantName);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:20px;font-weight:800;color:#7c3aed;margin:0;">${safeRest}</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:32px 24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${en ? `Hi ${safeName}` : `Hola ${safeName}`}, ⭐</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${en ? `We hope you enjoyed your order at <strong>${safeRest}</strong>!` : `¡Esperamos que hayas disfrutado tu pedido en <strong>${safeRest}</strong>!`}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${en ? 'Your opinion means a lot to us. Would you leave a quick review? It only takes a minute.' : 'Tu opinión es muy importante para nosotros. ¿Nos dejarías una reseña rápida? Solo toma un minuto.'}</p>
      <a href="${menuUrl}" style="display:block;margin-top:24px;padding:14px;background:#f59e0b;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        ${en ? 'Leave a review ⭐' : 'Dejar mi reseña ⭐'}
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;">
      ${en ? `Sent by ${safeRest} via MENIUS` : `Enviado por ${safeRest} a través de MENIUS`}
    </p>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM EMAILS (MENIUS → Restaurant Owners)
// ═══════════════════════════════════════════════════════════════

function buildTrialExpiringEmail(restaurantName: string, daysLeft: number, billingUrl: string, en = false): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:600;">${en ? `⏰ Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : `⏰ Tu prueba gratuita termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? `Hi, your trial for <strong style="color:#f3f4f6;">${restaurantName}</strong> on MENIUS is about to end.` : `Hola, el periodo de prueba de <strong style="color:#f3f4f6;">${restaurantName}</strong> en MENIUS está por terminar.`}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? 'To keep receiving online orders, your digital menu, and all the tools, choose a plan that fits your business.' : 'Para seguir recibiendo pedidos online, menú digital y todas las herramientas, elige un plan que se adapte a tu negocio.'}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? 'Plans starting at <strong style="color:#f3f4f6;">$39/mo</strong>. Cancel anytime.' : 'Planes desde <strong style="color:#f3f4f6;">$39/mes</strong>. Cancela cuando quieras.'}</p>
      <a href="${billingUrl}" style="display:block;margin-top:24px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        ${en ? 'Choose my plan' : 'Elegir mi plan'}
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">
      MENIUS — ${en ? 'Digital menu for restaurants' : 'Menú digital para restaurantes'}
    </p>
  </div>
</body>
</html>`;
}

function buildSetupIncompleteEmail(restaurantName: string, setupUrl: string, en = false): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:600;">${en ? '🍽️ Your menu is waiting' : '🍽️ Tu menú está esperando'}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? `You created <strong style="color:#f3f4f6;">${restaurantName}</strong> on MENIUS but haven't added any products to your menu yet.` : `Creaste <strong style="color:#f3f4f6;">${restaurantName}</strong> en MENIUS pero aún no has agregado productos a tu menú.`}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? '<strong style="color:#f3f4f6;">It\'s super fast:</strong> take a photo of your physical menu and our AI imports everything with categories, prices, and images in seconds.' : '<strong style="color:#f3f4f6;">Es súper rápido:</strong> toma una foto de tu menú físico y nuestra IA lo importa completo con categorías, precios e imágenes en segundos.'}</p>
      <a href="${setupUrl}" style="display:block;margin-top:24px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        ${en ? 'Set up my menu' : 'Configurar mi menú'}
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">
      MENIUS — ${en ? 'Digital menu for restaurants' : 'Menú digital para restaurantes'}
    </p>
  </div>
</body>
</html>`;
}

function buildOnboardingDay1Email(type: 'subject' | 'html', restaurantName: string, dashUrl?: string, menuUrl?: string, en = false): string {
  if (type === 'subject') return en ? `🎉 Welcome to MENIUS, ${restaurantName}!` : `🎉 ¡Bienvenido a MENIUS, ${restaurantName}!`;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;font-weight:600;">${en ? 'Hello! Your digital menu is ready 🎉' : '¡Hola! Tu menú digital está listo 🎉'}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? `You just created <strong style="color:#f3f4f6;">${restaurantName}</strong> on MENIUS. Here are your first steps:` : `Acabas de crear <strong style="color:#f3f4f6;">${restaurantName}</strong> en MENIUS. Estos son tus primeros pasos:`}</p>
      <div style="margin:16px 0;padding:16px;background:rgba(124,58,237,0.08);border-radius:12px;border:1px solid rgba(124,58,237,0.15);">
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">1. <strong>${en ? 'Add your products' : 'Agrega tus productos'}</strong> — ${en ? 'manually or with photo + AI' : 'manual o con foto + IA'}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">2. <strong>${en ? 'Customize your menu' : 'Personaliza tu menú'}</strong> — ${en ? 'logo, colors, hours' : 'logo, colores, horarios'}</p>
        <p style="margin:0;font-size:14px;color:#c4b5fd;">3. <strong>${en ? 'Share the link' : 'Comparte el link'}</strong> — ${en ? 'on social media, WhatsApp, or QR' : 'en redes, WhatsApp o con QR'}</p>
      </div>
      <p style="margin:12px 0;font-size:13px;color:#6b7280;">${en ? 'Your menu' : 'Tu menú'}: <a href="${menuUrl}" style="color:#7c3aed;">${menuUrl}</a></p>
      <a href="${dashUrl}" style="display:block;margin-top:20px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">${en ? 'Go to my dashboard' : 'Ir a mi dashboard'}</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — ${en ? 'Digital menu for restaurants' : 'Menú digital para restaurantes'}</p>
  </div>
</body></html>`;
}

function buildOnboardingDay3Email(type: 'subject' | 'html', restaurantName: string, dashUrl?: string, _menuUrl?: string, en = false): string {
  if (type === 'subject') return en ? `💡 3 tips for ${restaurantName} to get more orders` : `💡 3 tips para que ${restaurantName} reciba más pedidos`;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;font-weight:600;">${en ? `Tips to maximize ${restaurantName} 💡` : `Tips para maximizar ${restaurantName} 💡`}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? 'You\'ve been on MENIUS for 3 days. These tips will help you get the most out of it:' : 'Ya llevas 3 días con MENIUS. Estos tips te ayudarán a sacarle el máximo:'}</p>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? '📸 Add photos' : '📸 Agrega fotos'}</strong> — ${en ? 'Products with photos sell up to 30% more' : 'Los productos con foto venden hasta 30% más'}</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? '🤖 Import with AI' : '🤖 Importa con IA'}</strong> — ${en ? 'Take a photo of your physical menu and AI digitizes it completely' : 'Toma una foto de tu menú físico y la IA lo digitaliza completo'}</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? '🔔 Enable notifications' : '🔔 Activa notificaciones'}</strong> — ${en ? 'Never miss an order' : 'Nunca pierdas un pedido'}</p>
      </div>
      <a href="${dashUrl}" style="display:block;margin-top:20px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">${en ? 'Set up now' : 'Configurar ahora'}</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — ${en ? 'Digital menu for restaurants' : 'Menú digital para restaurantes'}</p>
  </div>
</body></html>`;
}

function buildOnboardingDay7Email(type: 'subject' | 'html', restaurantName: string, dashUrl?: string, _menuUrl?: string, en = false): string {
  if (type === 'subject') return en ? `🚀 ${restaurantName}: advanced tips to grow with MENIUS` : `🚀 ${restaurantName}: tips avanzados para crecer con MENIUS`;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;font-weight:600;">${en ? 'One week with MENIUS 🚀' : 'Una semana con MENIUS 🚀'}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? 'You\'ve been here a week! Time to use the advanced tools:' : '¡Ya llevas una semana! Es hora de usar las herramientas avanzadas:'}</p>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? '📧 Email marketing' : '📧 Email marketing'}</strong> — ${en ? 'Send AI-powered campaigns to your customers' : 'Envía campañas a tus clientes con IA'}</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>📊 Analytics</strong> — ${en ? 'Review your order and customer metrics' : 'Revisa tus métricas de pedidos y clientes'}</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>${en ? '🎯 Promotions' : '🎯 Promociones'}</strong> — ${en ? 'Create discount codes to attract customers' : 'Crea códigos de descuento para atraer clientes'}</p>
      </div>
      <div style="margin:16px 0;padding:12px;background:rgba(245,158,11,0.08);border-radius:10px;border:1px solid rgba(245,158,11,0.15);">
        <p style="margin:0;font-size:13px;color:#fbbf24;">💡 <strong>${en ? 'Did you know?' : '¿Sabías?'}</strong> ${en ? 'With the Pro plan ($79/mo) you can enable delivery, WhatsApp, and have up to 3 users.' : 'Con el plan Pro ($79/mes) puedes activar delivery, WhatsApp y tener hasta 3 usuarios.'}</p>
      </div>
      <a href="${dashUrl}/billing" style="display:block;margin-top:20px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">${en ? 'View plans' : 'Ver planes'}</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — ${en ? 'Digital menu for restaurants' : 'Menú digital para restaurantes'}</p>
  </div>
</body></html>`;
}

function buildMonthlyReportEmail(restaurantName: string, orders: number, newCustomers: number, revenue: number, dashUrl: string, en = false): string {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;text-align:center;">
        <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 4px;">${en ? 'Monthly summary' : 'Resumen mensual'}</p>
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0;">${restaurantName}</h2>
      </div>
      <div style="padding:28px 24px;">
        <div style="display:flex;gap:12px;margin-bottom:20px;">
          <div style="flex:1;background:rgba(124,58,237,0.08);border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:24px;font-weight:800;color:#7c3aed;margin:0;">${orders}</p>
            <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">${en ? 'Orders' : 'Pedidos'}</p>
          </div>
          <div style="flex:1;background:rgba(16,185,129,0.08);border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:24px;font-weight:800;color:#10b981;margin:0;">${newCustomers}</p>
            <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">${en ? 'New customers' : 'Nuevos clientes'}</p>
          </div>
          <div style="flex:1;background:rgba(245,158,11,0.08);border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:24px;font-weight:800;color:#f59e0b;margin:0;">$${revenue.toFixed(0)}</p>
            <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">Revenue</p>
          </div>
        </div>
        ${orders === 0
          ? `<p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.6;">${en ? 'You haven\'t received any orders this month yet. Share your menu on social media and WhatsApp to start receiving them.' : 'Aún no has recibido pedidos este mes. Comparte tu menú en redes sociales y WhatsApp para empezar a recibir.'}</p>`
          : `<p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.6;">${en ? 'Great job! Check your analytics to see trends and growth opportunities.' : '¡Buen trabajo! Revisa tu analytics para ver tendencias y oportunidades de crecimiento.'}</p>`}
        <a href="${dashUrl}" style="display:block;margin-top:16px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">${en ? 'View full analytics' : 'Ver analytics completo'}</a>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — ${en ? 'Digital menu for restaurants' : 'Menú digital para restaurantes'}</p>
  </div>
</body></html>`;
}

function buildNoOrdersEmail(restaurantName: string, menuUrl: string, dashUrl: string, en = false): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:600;">${en ? '📊 Tips to get your first orders' : '📊 Tips para recibir tus primeros pedidos'}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">${en ? `Your digital menu for <strong style="color:#f3f4f6;">${restaurantName}</strong> is ready, but you haven't received any orders yet. Here are some tips:` : `Tu menú digital de <strong style="color:#f3f4f6;">${restaurantName}</strong> está listo, pero aún no has recibido pedidos. Aquí van algunos tips:`}</p>
      <div style="margin:16px 0;padding:16px;background:rgba(124,58,237,0.08);border-radius:12px;border:1px solid rgba(124,58,237,0.15);">
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">1. <strong>${en ? 'Share your menu' : 'Comparte tu menú'}</strong> ${en ? 'on social media and WhatsApp' : 'en redes sociales y WhatsApp'}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">2. <strong>${en ? 'Print QR codes' : 'Imprime QR codes'}</strong> ${en ? 'for your restaurant tables' : 'para las mesas de tu restaurante'}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">3. <strong>${en ? 'Add photos' : 'Agrega fotos'}</strong> ${en ? 'to your products — they sell up to 30% more' : 'a tus productos — venden hasta 30% más'}</p>
        <p style="margin:0;font-size:14px;color:#c4b5fd;">4. <strong>${en ? 'Enable notifications' : 'Activa notificaciones'}</strong> ${en ? 'so you never miss an order' : 'para no perder ningún pedido'}</p>
      </div>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.6;">${en ? 'Your menu' : 'Tu menú'}: <a href="${menuUrl}" style="color:#7c3aed;">${menuUrl}</a></p>
      <a href="${dashUrl}" style="display:block;margin-top:16px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        ${en ? 'Go to my dashboard' : 'Ir a mi dashboard'}
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">
      MENIUS — ${en ? 'Digital menu for restaurants' : 'Menú digital para restaurantes'}
    </p>
  </div>
</body>
</html>`;
}


