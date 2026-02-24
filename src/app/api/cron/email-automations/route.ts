export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications/email';
import { createLogger } from '@/lib/logger';

const logger = createLogger('email-automations');

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient();
  const results = { welcome: 0, reactivation: 0, review_request: 0, platform_trial: 0, platform_setup: 0, platform_inactive: 0, onboarding_d1: 0, onboarding_d3: 0, onboarding_d7: 0, monthly_report: 0, errors: 0 };

  try {
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

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, slug')
        .eq('id', customer.restaurant_id)
        .maybeSingle();

      if (!restaurant) continue;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
      const menuUrl = `${appUrl}/r/${restaurant.slug}`;

      const sent = await sendEmail({
        to: customer.email,
        subject: `¡Bienvenido a ${restaurant.name}! 🎉`,
        html: buildWelcomeEmail(customer.name || 'Cliente', restaurant.name, menuUrl),
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

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, slug')
        .eq('id', customer.restaurant_id)
        .maybeSingle();

      if (!restaurant) continue;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
      const menuUrl = `${appUrl}/r/${restaurant.slug}`;

      const sent = await sendEmail({
        to: customer.email,
        subject: `Te extrañamos, ${customer.name || 'amigo'}! 😢`,
        html: buildReactivationEmail(customer.name || 'Cliente', restaurant.name, menuUrl),
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
      .select('id, customer_name, customer_email, restaurant_id')
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

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, slug')
        .eq('id', order.restaurant_id)
        .maybeSingle();

      if (!restaurant) continue;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
      const menuUrl = `${appUrl}/r/${restaurant.slug}`;

      const sent = await sendEmail({
        to: order.customer_email,
        subject: `¿Cómo estuvo tu pedido en ${restaurant.name}? ⭐`,
        html: buildReviewRequestEmail(order.customer_name || 'Cliente', restaurant.name, menuUrl),
      });

      if (sent) results.review_request++;
      else results.errors++;
    }

    // ═══════════════════════════════════════════════════════════
    // PLATFORM → RESTAURANT OWNER automations (MENIUS marketing)
    // ═══════════════════════════════════════════════════════════

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

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
        .select('name, notification_email, owner_user_id')
        .eq('id', sub.restaurant_id)
        .maybeSingle();

      if (!restaurant?.notification_email) continue;

      const daysLeft = Math.ceil((new Date(sub.trial_end!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const dashUrl = `${appUrl}/app/billing`;

      const sent = await sendEmail({
        to: restaurant.notification_email,
        subject: `⏰ Tu prueba de MENIUS termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
        html: buildTrialExpiringEmail(restaurant.name, daysLeft, dashUrl),
      });

      if (sent) results.platform_trial++;
      else results.errors++;
    }

    // 5. Setup incomplete: restaurants created 2+ days ago with no products
    const twoDaysAgoSetup = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgoSetup = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: newRestaurants } = await supabase
      .from('restaurants')
      .select('id, name, notification_email, slug')
      .lte('created_at', twoDaysAgoSetup)
      .gte('created_at', sevenDaysAgoSetup)
      .not('notification_email', 'is', null)
      .limit(50);

    for (const restaurant of newRestaurants ?? []) {
      if (!restaurant.notification_email) continue;

      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id);

      if ((count ?? 0) > 0) continue;

      const setupUrl = `${appUrl}/app/menu/products`;

      const sent = await sendEmail({
        to: restaurant.notification_email,
        subject: `🍽️ ${restaurant.name}: tu menú está vacío — configúralo en minutos`,
        html: buildSetupIncompleteEmail(restaurant.name, setupUrl),
      });

      if (sent) results.platform_setup++;
      else results.errors++;
    }

    // 6. No orders nudge: restaurants with products but 0 orders in last 7 days
    const { data: activeRestaurants } = await supabase
      .from('restaurants')
      .select('id, name, notification_email, slug')
      .eq('is_active', true)
      .not('notification_email', 'is', null)
      .limit(100);

    for (const restaurant of activeRestaurants ?? []) {
      if (!restaurant.notification_email) continue;

      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true);

      if ((productCount ?? 0) === 0) continue;

      const sevenDaysAgoOrders = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: orderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', sevenDaysAgoOrders);

      if ((orderCount ?? 0) > 0) continue;

      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentOrderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', fourteenDaysAgo);

      if ((recentOrderCount ?? 0) > 0) continue;

      const tipsUrl = `${appUrl}/app`;

      const sent = await sendEmail({
        to: restaurant.notification_email,
        subject: `📊 Tips para recibir tu primer pedido en ${restaurant.name}`,
        html: buildNoOrdersEmail(restaurant.name, `${appUrl}/r/${restaurant.slug}`, tipsUrl),
      });

      if (sent) results.platform_inactive++;
      else results.errors++;
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
        .select('id, name, slug, notification_email')
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

        const dashUrl = `${appUrl}/app`;
        const menuUrl = `${appUrl}/r/${restaurant.slug}`;

        const sent = await sendEmail({
          to: restaurant.notification_email,
          subject: step.builder('subject', restaurant.name),
          html: step.builder('html', restaurant.name, dashUrl, menuUrl),
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
      const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
      const monthEnd = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const { data: activeRests } = await supabase
        .from('restaurants')
        .select('id, name, notification_email, slug')
        .eq('is_active', true)
        .not('notification_email', 'is', null)
        .limit(200);

      for (const restaurant of activeRests ?? []) {
        if (!restaurant.notification_email) continue;

        const [{ count: orderCount }, { data: orders }] = await Promise.all([
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).gte('created_at', monthStart).lt('created_at', monthEnd),
          supabase.from('orders').select('total').eq('restaurant_id', restaurant.id).gte('created_at', monthStart).lt('created_at', monthEnd),
        ]);

        const { count: newCustomerCount } = await supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd);

        const revenue = (orders ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
        const dashUrl = `${appUrl}/app/analytics`;

        const sent = await sendEmail({
          to: restaurant.notification_email,
          subject: `📊 Resumen mensual de ${restaurant.name} — MENIUS`,
          html: buildMonthlyReportEmail(restaurant.name, orderCount ?? 0, newCustomerCount ?? 0, revenue, dashUrl),
        });

        if (sent) results.monthly_report++;
        else results.errors++;
      }
    }

    logger.info('Automations completed', results);
    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    logger.error('Automations failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function buildWelcomeEmail(name: string, restaurantName: string, menuUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:20px;font-weight:800;color:#7c3aed;margin:0;">${restaurantName}</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:32px 24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Hola ${name}, 👋</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">¡Bienvenido a <strong>${restaurantName}</strong>! Estamos encantados de tenerte como cliente.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Puedes ver nuestro menú completo y hacer pedidos en cualquier momento desde tu celular.</p>
      <a href="${menuUrl}" style="display:block;margin-top:24px;padding:14px;background:#7c3aed;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        Ver nuestro menú
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;">
      Enviado por ${restaurantName} a través de MENIUS
    </p>
  </div>
</body>
</html>`;
}

function buildReactivationEmail(name: string, restaurantName: string, menuUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:20px;font-weight:800;color:#7c3aed;margin:0;">${restaurantName}</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:32px 24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Hola ${name}, 😢</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Hace tiempo que no nos visitas y <strong>te echamos de menos</strong>. Hemos estado preparando cosas deliciosas y nos encantaría que vuelvas a probarlas.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">¡Te esperamos de vuelta!</p>
      <a href="${menuUrl}" style="display:block;margin-top:24px;padding:14px;background:#7c3aed;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        Pedir de nuevo
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;">
      Enviado por ${restaurantName} a través de MENIUS
    </p>
  </div>
</body>
</html>`;
}

function buildReviewRequestEmail(name: string, restaurantName: string, menuUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:20px;font-weight:800;color:#7c3aed;margin:0;">${restaurantName}</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:32px 24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Hola ${name}, ⭐</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">¡Esperamos que hayas disfrutado tu pedido en <strong>${restaurantName}</strong>!</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Tu opinión es muy importante para nosotros. ¿Nos dejarías una reseña rápida? Solo toma un minuto.</p>
      <a href="${menuUrl}" style="display:block;margin-top:24px;padding:14px;background:#f59e0b;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        Dejar mi reseña ⭐
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;">
      Enviado por ${restaurantName} a través de MENIUS
    </p>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM EMAILS (MENIUS → Restaurant Owners)
// ═══════════════════════════════════════════════════════════════

function buildTrialExpiringEmail(restaurantName: string, daysLeft: number, billingUrl: string): string {
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
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:600;">⏰ Tu prueba gratuita termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">Hola, el periodo de prueba de <strong style="color:#f3f4f6;">${restaurantName}</strong> en MENIUS está por terminar.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">Para seguir recibiendo pedidos online, menú digital y todas las herramientas, elige un plan que se adapte a tu negocio.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">Planes desde <strong style="color:#f3f4f6;">$39/mes</strong>. Cancela cuando quieras.</p>
      <a href="${billingUrl}" style="display:block;margin-top:24px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        Elegir mi plan
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">
      MENIUS — Menú digital para restaurantes
    </p>
  </div>
</body>
</html>`;
}

function buildSetupIncompleteEmail(restaurantName: string, setupUrl: string): string {
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
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:600;">🍽️ Tu menú está esperando</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">Creaste <strong style="color:#f3f4f6;">${restaurantName}</strong> en MENIUS pero aún no has agregado productos a tu menú.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;"><strong style="color:#f3f4f6;">Es súper rápido:</strong> toma una foto de tu menú físico y nuestra IA lo importa completo con categorías, precios e imágenes en segundos.</p>
      <a href="${setupUrl}" style="display:block;margin-top:24px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        Configurar mi menú
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">
      MENIUS — Menú digital para restaurantes
    </p>
  </div>
</body>
</html>`;
}

function buildOnboardingDay1Email(type: 'subject' | 'html', restaurantName: string, dashUrl?: string, menuUrl?: string): string {
  if (type === 'subject') return `🎉 ¡Bienvenido a MENIUS, ${restaurantName}!`;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;font-weight:600;">¡Hola! Tu menú digital está listo 🎉</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">Acabas de crear <strong style="color:#f3f4f6;">${restaurantName}</strong> en MENIUS. Estos son tus primeros pasos:</p>
      <div style="margin:16px 0;padding:16px;background:rgba(124,58,237,0.08);border-radius:12px;border:1px solid rgba(124,58,237,0.15);">
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">1. <strong>Agrega tus productos</strong> — manual o con foto + IA</p>
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">2. <strong>Personaliza tu menú</strong> — logo, colores, horarios</p>
        <p style="margin:0;font-size:14px;color:#c4b5fd;">3. <strong>Comparte el link</strong> — en redes, WhatsApp o con QR</p>
      </div>
      <p style="margin:12px 0;font-size:13px;color:#6b7280;">Tu menú: <a href="${menuUrl}" style="color:#7c3aed;">${menuUrl}</a></p>
      <a href="${dashUrl}" style="display:block;margin-top:20px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">Ir a mi dashboard</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — Menú digital para restaurantes</p>
  </div>
</body></html>`;
}

function buildOnboardingDay3Email(type: 'subject' | 'html', restaurantName: string, dashUrl?: string, _menuUrl?: string): string {
  if (type === 'subject') return `💡 3 tips para que ${restaurantName} reciba más pedidos`;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;font-weight:600;">Tips para maximizar ${restaurantName} 💡</p>
      <p style="margin:0 0 16px;font-size:15px;color:#9ca3af;line-height:1.6;">Ya llevas 3 días con MENIUS. Estos tips te ayudarán a sacarle el máximo:</p>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>📸 Agrega fotos</strong> — Los productos con foto venden hasta 30% más</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>🤖 Importa con IA</strong> — Toma una foto de tu menú físico y la IA lo digitaliza completo</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>🔔 Activa notificaciones</strong> — Nunca pierdas un pedido</p>
      </div>
      <a href="${dashUrl}" style="display:block;margin-top:20px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">Configurar ahora</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — Menú digital para restaurantes</p>
  </div>
</body></html>`;
}

function buildOnboardingDay7Email(type: 'subject' | 'html', restaurantName: string, dashUrl?: string, _menuUrl?: string): string {
  if (type === 'subject') return `🚀 ${restaurantName}: tips avanzados para crecer con MENIUS`;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);padding:32px 24px;">
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;font-weight:600;">Una semana con MENIUS 🚀</p>
      <p style="margin:0 0 16px;font-size:15px;color:#9ca3af;line-height:1.6;">¡Ya llevas una semana! Es hora de usar las herramientas avanzadas:</p>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>📧 Email marketing</strong> — Envía campañas a tus clientes con IA</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>📊 Analytics</strong> — Revisa tus métricas de pedidos y clientes</p>
      </div>
      <div style="margin:0 0 12px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:14px;color:#c4b5fd;"><strong>🎯 Promociones</strong> — Crea códigos de descuento para atraer clientes</p>
      </div>
      <div style="margin:16px 0;padding:12px;background:rgba(245,158,11,0.08);border-radius:10px;border:1px solid rgba(245,158,11,0.15);">
        <p style="margin:0;font-size:13px;color:#fbbf24;">💡 <strong>¿Sabías?</strong> Con el plan Pro ($79/mes) puedes activar delivery, WhatsApp y tener hasta 3 usuarios.</p>
      </div>
      <a href="${dashUrl}/billing" style="display:block;margin-top:20px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">Ver planes</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — Menú digital para restaurantes</p>
  </div>
</body></html>`;
}

function buildMonthlyReportEmail(restaurantName: string, orders: number, newCustomers: number, revenue: number, dashUrl: string): string {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1></div>
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;text-align:center;">
        <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 4px;">Resumen mensual</p>
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0;">${restaurantName}</h2>
      </div>
      <div style="padding:28px 24px;">
        <div style="display:flex;gap:12px;margin-bottom:20px;">
          <div style="flex:1;background:rgba(124,58,237,0.08);border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:24px;font-weight:800;color:#7c3aed;margin:0;">${orders}</p>
            <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">Pedidos</p>
          </div>
          <div style="flex:1;background:rgba(16,185,129,0.08);border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:24px;font-weight:800;color:#10b981;margin:0;">${newCustomers}</p>
            <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">Nuevos clientes</p>
          </div>
          <div style="flex:1;background:rgba(245,158,11,0.08);border-radius:12px;padding:16px;text-align:center;">
            <p style="font-size:24px;font-weight:800;color:#f59e0b;margin:0;">$${revenue.toFixed(0)}</p>
            <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">Revenue</p>
          </div>
        </div>
        ${orders === 0 ? '<p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.6;">Aún no has recibido pedidos este mes. Comparte tu menú en redes sociales y WhatsApp para empezar a recibir.</p>' : '<p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.6;">¡Buen trabajo! Revisa tu analytics para ver tendencias y oportunidades de crecimiento.</p>'}
        <a href="${dashUrl}" style="display:block;margin-top:16px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">Ver analytics completo</a>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">MENIUS — Menú digital para restaurantes</p>
  </div>
</body></html>`;
}

function buildNoOrdersEmail(restaurantName: string, menuUrl: string, dashUrl: string): string {
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
      <p style="margin:0 0 16px;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:600;">📊 Tips para recibir tus primeros pedidos</p>
      <p style="margin:0 0 12px;font-size:15px;color:#9ca3af;line-height:1.6;">Tu menú digital de <strong style="color:#f3f4f6;">${restaurantName}</strong> está listo, pero aún no has recibido pedidos. Aquí van algunos tips:</p>
      <div style="margin:16px 0;padding:16px;background:rgba(124,58,237,0.08);border-radius:12px;border:1px solid rgba(124,58,237,0.15);">
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">1. <strong>Comparte tu menú</strong> en redes sociales y WhatsApp</p>
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">2. <strong>Imprime QR codes</strong> para las mesas de tu restaurante</p>
        <p style="margin:0 0 8px;font-size:14px;color:#c4b5fd;">3. <strong>Agrega fotos</strong> a tus productos — venden hasta 30% más</p>
        <p style="margin:0;font-size:14px;color:#c4b5fd;">4. <strong>Activa notificaciones</strong> para no perder ningún pedido</p>
      </div>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.6;">Tu menú: <a href="${menuUrl}" style="color:#7c3aed;">${menuUrl}</a></p>
      <a href="${dashUrl}" style="display:block;margin-top:16px;padding:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        Ir a mi dashboard
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#4b5563;margin-top:20px;">
      MENIUS — Menú digital para restaurantes
    </p>
  </div>
</body>
</html>`;
}
