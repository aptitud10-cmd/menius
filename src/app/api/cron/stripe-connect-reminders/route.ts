export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/notifications/email';
import { createLogger } from '@/lib/logger';

const logger = createLogger('cron:stripe-connect-reminders');

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminDb = createAdminClient();

  try {
    const { data: restaurants } = await adminDb
      .from('restaurants')
      .select('id, name, slug, notification_email, locale, stripe_account_id, stripe_onboarding_complete, created_at')
      .eq('is_active', true)
      .or('stripe_onboarding_complete.is.null,stripe_onboarding_complete.eq.false')
      .not('notification_email', 'is', null);

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ message: 'No restaurants need Stripe Connect reminders', sent: 0 });
    }

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    let sentCount = 0;

    for (const rest of restaurants) {
      if (new Date(rest.created_at) > new Date(threeDaysAgo)) continue;

      const { count } = await adminDb
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', rest.id)
        .limit(1);

      if (!count || count === 0) continue;

      const en = rest.locale === 'en';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

      try {
        await sendEmail({
          to: rest.notification_email!,
          subject: en
            ? `${rest.name}: Accept online payments from your customers`
            : `${rest.name}: Acepta pagos en línea de tus clientes`,
          html: buildStripeReminderEmail(rest.name, appUrl, en),
        });
        sentCount++;
      } catch (err) {
        logger.error('Failed to send Stripe Connect reminder', {
          restaurant: rest.slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ message: `Sent ${sentCount} Stripe Connect reminders`, sent: sentCount });
  } catch (err) {
    logger.error('Stripe Connect reminders cron failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function buildStripeReminderEmail(restaurantName: string, appUrl: string, en: boolean): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#10b981;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:20px;overflow:hidden;border:1px solid rgba(99,102,241,0.2);">
      <div style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);padding:40px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">💳</div>
        <h2 style="color:#fff;font-size:22px;font-weight:800;margin:0;">
          ${en ? 'Start accepting online payments' : 'Empieza a cobrar en línea'}
        </h2>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;font-size:16px;color:#f3f4f6;line-height:1.7;">
          ${en
    ? `${restaurantName} is receiving orders but isn't set up for online payments yet. Your customers want to pay with their card — don't make them go to the ATM.`
    : `${restaurantName} está recibiendo pedidos pero aún no cobra en línea. Tus clientes quieren pagar con tarjeta — no los hagas ir al cajero.`}
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;">
          ${en
    ? 'It takes 5 minutes. Connect your bank account and start receiving payments directly.'
    : 'Toma 5 minutos. Conecta tu cuenta bancaria y empieza a recibir pagos directamente.'}
        </p>
        <a href="${appUrl}/app/settings" style="display:block;padding:16px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;text-align:center;border-radius:14px;font-weight:700;font-size:16px;text-decoration:none;">
          ${en ? 'Set up payments →' : 'Configurar pagos →'}
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
