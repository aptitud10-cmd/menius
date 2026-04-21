export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, buildTrialEndingEmail } from '@/lib/notifications/email';
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
      .select('restaurant_id, trial_end, restaurants(name, slug, locale, notification_email)')
      .eq('status', 'trialing')
      .gte('trial_end', windowStart)
      .lte('trial_end', windowEnd);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'No trials ending in 3 days', sent: 0 });
    }

    const billingUrl = `${appUrl}/app/billing`;

    const results = await Promise.allSettled(
      subs
        .filter((sub) => !!(sub.restaurants as any)?.notification_email)
        .map((sub) => {
          const rest = sub.restaurants as { name: string; slug: string; locale: string; notification_email: string };
          const en = rest.locale === 'en';
          return sendEmail({
            to: rest.notification_email,
            subject: en
              ? `Your MENIUS trial ends in 3 days — ${rest.name}`
              : `Tu prueba de MENIUS termina en 3 días — ${rest.name}`,
            html: buildTrialEndingEmail({
              ownerName: rest.name,
              restaurantName: rest.name,
              daysLeft: 3,
              billingUrl,
              locale: rest.locale,
            }),
          }).then(() => {
            logger.info('Trial ending reminder sent', { restaurantSlug: rest.slug });
          });
        })
    );

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        logger.error('Failed to send trial ending reminder', {
          index: i,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    });

    return NextResponse.json({ message: `Sent ${sentCount} trial ending reminders`, sent: sentCount });
  } catch (err) {
    logger.error('Trial ending reminders cron failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
