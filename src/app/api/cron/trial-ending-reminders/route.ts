export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/notifications/email';
import { createLogger } from '@/lib/logger';

const logger = createLogger('cron:trial-ending-reminders');

// Runs daily. Finds restaurants whose trial ends in exactly 3 days and sends a warning.
// This is independent of Stripe webhooks — restaurants on trial without a Stripe subscription
// never receive the `customer.subscription.trial_will_end` webhook, so we must handle it here.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminDb = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

  try {
    // Target: trial_end between 2d 23h and 3d 1h from now (1-day window centered on 3 days out)
    const windowStart = new Date(Date.now() + (3 * 24 - 1) * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(Date.now() + (3 * 24 + 1) * 60 * 60 * 1000).toISOString();

    const { data: subs } = await adminDb
      .from('subscriptions')
      .select('restaurant_id, trial_end, restaurants(name, slug, locale, notification_email, stripe_account_id)')
      .eq('status', 'trialing')
      .gte('trial_end', windowStart)
      .lte('trial_end', windowEnd);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'No trials ending in 3 days', sent: 0 });
    }

    let sentCount = 0;

    for (const sub of subs) {
      const rest = sub.restaurants as { name: string; slug: string; locale: string; notification_email: string | null; stripe_account_id: string | null } | null;
      if (!rest?.notification_email) continue;

      const en = rest.locale === 'en';
      const hasStripe = !!rest.stripe_account_id;

      try {
        await sendEmail({
          to: rest.notification_email,
          subject: en
            ? `Your MENIUS trial ends in 3 days — ${rest.name}`
            : `Tu prueba de MENIUS termina en 3 días — ${rest.name}`,
          html: buildTrialEndingEmail(rest.name, appUrl, en, hasStripe),
        });
        sentCount++;
        logger.info('Trial ending reminder sent', { restaurantSlug: rest.slug });
      } catch (err) {
        logger.error('Failed to send trial ending reminder', {
          restaurantSlug: rest.slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ message: `Sent ${sentCount} trial ending reminders`, sent: sentCount });
  } catch (err) {
    logger.error('Trial ending reminders cron failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function buildTrialEndingEmail(restaurantName: string, appUrl: string, en: boolean, hasStripe: boolean): string {
  const ctaUrl = `${appUrl}/app/billing`;
  const ctaText = en ? 'Upgrade now →' : 'Suscribirme ahora →';

  const bodyText = en
    ? hasStripe
      ? `${restaurantName}'s free trial ends in 3 days. You already have payments set up — just pick a plan to keep everything running without interruption.`
      : `${restaurantName}'s free trial ends in 3 days. After that, advanced features like online payments, delivery tracking, and analytics will be paused. Upgrade now to keep them active.`
    : hasStripe
      ? `La prueba gratuita de ${restaurantName} termina en 3 días. Ya tienes los pagos configurados — elige un plan para que todo siga funcionando sin interrupciones.`
      : `La prueba gratuita de ${restaurantName} termina en 3 días. Después, funciones como pagos en línea, seguimiento de delivery y analíticas se pausarán. Suscríbete ahora para mantenerlas activas.`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#10b981;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:20px;overflow:hidden;border:1px solid rgba(234,179,8,0.3);">
      <div style="background:linear-gradient(135deg,#b45309 0%,#d97706 100%);padding:40px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">⏳</div>
        <h2 style="color:#fff;font-size:22px;font-weight:800;margin:0;">
          ${en ? 'Your trial ends in 3 days' : 'Tu prueba termina en 3 días'}
        </h2>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;font-size:16px;color:#f3f4f6;line-height:1.7;">${bodyText}</p>
        <a href="${ctaUrl}" style="display:block;padding:16px;background:linear-gradient(135deg,#b45309,#d97706);color:#fff;text-align:center;border-radius:14px;font-weight:700;font-size:16px;text-decoration:none;">
          ${ctaText}
        </a>
        <p style="margin:20px 0 0;font-size:13px;color:#6b7280;text-align:center;">
          ${en ? 'Questions? Reply to this email.' : '¿Preguntas? Responde a este correo.'}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
