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
  const results = { welcome: 0, reactivation: 0, review_request: 0, errors: 0 };

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
