export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, buildDunningEmail } from '@/lib/notifications/email';
import { createLogger } from '@/lib/logger';
import { PAST_DUE_GRACE_DAYS } from '@/lib/auth/check-plan';
import { PLANS } from '@/lib/plans';

const logger = createLogger('cron:dunning');

// Dunning email sequence for past_due subscriptions. Runs hourly.
// Stage timing (days since past_due_since) → dunning_stage to advance to:
//   day 0 → stage 1 (sent immediately by the webhook, but covered here as a fallback)
//   day 1 → stage 2 (reminder)
//   day 4 → stage 3 (urgent / last chance)
//   day 7 → stage 4 (downgraded to free)
// dunning_stage tracks the highest email already sent so the hourly run never repeats.
const STAGE_THRESHOLDS: { day: number; stage: 1 | 2 | 3 | 4 }[] = [
  { day: 0, stage: 1 },
  { day: 1, stage: 2 },
  { day: 4, stage: 3 },
  { day: PAST_DUE_GRACE_DAYS, stage: 4 },
];

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminDb = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const billingUrl = `${appUrl}/app/billing`;

  try {
    const { data: subs } = await adminDb
      .from('subscriptions')
      .select('id, plan_id, past_due_since, dunning_stage, restaurants(name, slug, locale, notification_email)')
      .eq('status', 'past_due')
      .not('past_due_since', 'is', null);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'No past_due subscriptions', sent: 0 });
    }

    const now = Date.now();
    let sent = 0;
    let errors = 0;

    for (const sub of subs) {
      const since = (sub as any).past_due_since as string;
      const currentStage = ((sub as any).dunning_stage as number) ?? 0;
      const daysElapsed = (now - new Date(since).getTime()) / 86400_000;

      // Highest stage whose day-threshold has been reached.
      let targetStage: 1 | 2 | 3 | 4 | 0 = 0;
      for (const t of STAGE_THRESHOLDS) {
        if (daysElapsed >= t.day) targetStage = t.stage;
      }

      // Nothing new to send for this subscription.
      if (targetStage === 0 || targetStage <= currentStage) continue;

      const rest = (sub as any).restaurants as
        | { name: string; slug: string; locale: string; notification_email: string | null }
        | null;

      if (!rest?.notification_email) {
        // No address to mail, but still advance the stage so we don't re-check forever.
        await adminDb.from('subscriptions').update({ dunning_stage: targetStage }).eq('id', (sub as any).id);
        continue;
      }

      const planId = ((sub as any).plan_id as string) ?? 'pro';
      const planName = (PLANS[planId as keyof typeof PLANS]?.name) ?? planId.charAt(0).toUpperCase() + planId.slice(1);
      const en = rest.locale === 'en';

      const subjectByStage: Record<number, string> = {
        1: en ? `Payment failed — ${rest.name}` : `Pago fallido — ${rest.name}`,
        2: en ? `Reminder: update your card — ${rest.name}` : `Recordatorio: actualiza tu tarjeta — ${rest.name}`,
        3: en ? `🚨 Last chance to keep your plan — ${rest.name}` : `🚨 Última oportunidad para conservar tu plan — ${rest.name}`,
        4: en ? `Your account moved to Free — ${rest.name}` : `Tu cuenta pasó a Free — ${rest.name}`,
      };

      try {
        const ok = await sendEmail({
          to: rest.notification_email,
          subject: subjectByStage[targetStage],
          html: buildDunningEmail({
            ownerName: rest.name,
            restaurantName: rest.name,
            planName,
            billingUrl,
            stage: targetStage,
            graceDays: PAST_DUE_GRACE_DAYS,
            locale: rest.locale,
          }),
        });

        // Advance the stage regardless of send success — a failed send shouldn't
        // wedge the whole sequence; the next stage will still fire on schedule.
        await adminDb.from('subscriptions').update({ dunning_stage: targetStage }).eq('id', (sub as any).id);

        if (ok) {
          sent++;
          logger.info('Dunning email sent', { restaurantSlug: rest.slug, stage: targetStage });
        } else {
          errors++;
          logger.warn('Dunning email send returned false', { restaurantSlug: rest.slug, stage: targetStage });
        }
      } catch (err) {
        errors++;
        logger.error('Dunning email failed', {
          restaurantSlug: rest.slug,
          stage: targetStage,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ message: `Dunning run complete`, sent, errors });
  } catch (err) {
    logger.error('Dunning cron failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
