export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { captureWarning } from '@/lib/error-reporting';
import { getStripe } from '@/lib/stripe';
import { getPlanByStripePrice } from '@/lib/plans';

const logger = createLogger('billing-reconciliation');

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const results = {
    orphaned_fixed: 0,
    expired_trials_marked: 0,
    stripe_synced: 0,
    stripe_mismatches: 0,
    errors: 0,
  };

  try {
    // Step 1: Find restaurants without subscription records and create a canceled row (free tier, no trial)
    // Limit to 2000 to prevent unbounded memory usage; run more often if needed
    const { data: allRestaurants } = await supabase
      .from('restaurants')
      .select('id, created_at')
      .limit(2000);

    const now = new Date();

    if (allRestaurants) {
      const { data: allSubs } = await supabase
        .from('subscriptions')
        .select('restaurant_id')
        .limit(2000);

      const subSet = new Set((allSubs ?? []).map(s => s.restaurant_id));
      for (const r of allRestaurants) {
        if (!subSet.has(r.id)) {
          const { error } = await supabase.from('subscriptions').insert({
            restaurant_id: r.id,
            plan_id: 'starter',
            status: 'canceled',
            current_period_end: now.toISOString(),
          });

          if (!error) {
            results.orphaned_fixed++;
            logger.warn('Repaired orphaned restaurant', { restaurantId: r.id, status: 'canceled' });
          } else {
            results.errors++;
            logger.error('Failed to repair orphan', { restaurantId: r.id, error: error.message });
          }
        }
      }
    }

    // Step 2: Mark expired trials
    const nowIso = now.toISOString();
    const { data: expiredTrials } = await supabase
      .from('subscriptions')
      .select('id, restaurant_id, trial_end')
      .eq('status', 'trialing')
      .lt('trial_end', nowIso)
      .is('stripe_subscription_id', null);

    if (expiredTrials) {
      for (const sub of expiredTrials) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: nowIso })
          .eq('id', sub.id);

        if (!error) {
          results.expired_trials_marked++;
        } else {
          results.errors++;
        }
      }
    }

    // Step 3: Sync active Stripe subscriptions with DB
    const { data: stripeSubs } = await supabase
      .from('subscriptions')
      .select('id, restaurant_id, stripe_subscription_id, status, plan_id, current_period_end')
      .not('stripe_subscription_id', 'is', null)
      .neq('stripe_subscription_id', '')
      .in('status', ['active', 'past_due', 'trialing']);

    if (stripeSubs && stripeSubs.length > 0) {
      const stripe = getStripe();

      const syncOne = async (dbSub: typeof stripeSubs[number]) => {
        const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id!) as any;
        let mismatch = false;
        const updates: Record<string, unknown> = { updated_at: nowIso };

        if (stripeSub.status !== dbSub.status) {
          updates.status = stripeSub.status === 'incomplete_expired' ? 'canceled' : stripeSub.status;
          mismatch = true;
        }

        const stripePeriodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
        if (dbSub.current_period_end !== stripePeriodEnd) {
          updates.current_period_end = stripePeriodEnd;
          mismatch = true;
        }

        const priceId = stripeSub.items?.data?.[0]?.price?.id;
        const stripePlan = priceId ? getPlanByStripePrice(priceId) : null;
        if (stripePlan && stripePlan.id !== dbSub.plan_id) {
          updates.plan_id = stripePlan.id;
          mismatch = true;
        }

        if (mismatch) {
          await supabase.from('subscriptions').update(updates).eq('id', dbSub.id);
          await supabase.from('subscription_audit_log').insert({
            restaurant_id: dbSub.restaurant_id,
            action: 'reconciliation_sync',
            old_status: dbSub.status,
            new_status: updates.status ?? dbSub.status,
            metadata: { source: 'cron', updates },
          }).then(() => {});
          logger.warn('Fixed Stripe mismatch', {
            restaurantId: dbSub.restaurant_id,
            dbStatus: dbSub.status,
            stripeStatus: stripeSub.status,
          });
          return { mismatch: true };
        }
        return { mismatch: false };
      };

      // Process in chunks of 10 to avoid Stripe rate-limit bursts (100 req/s)
      const CHUNK_SIZE = 10;
      for (let i = 0; i < stripeSubs.length; i += CHUNK_SIZE) {
        const chunk = stripeSubs.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.allSettled(chunk.map(syncOne));
        for (const result of chunkResults) {
          if (result.status === 'fulfilled') {
            results.stripe_synced++;
            if (result.value.mismatch) results.stripe_mismatches++;
          } else {
            results.errors++;
            logger.error('Stripe sync error', {
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            });
          }
        }
      }
    }

    if (results.orphaned_fixed > 0 || results.stripe_mismatches > 0) {
      captureWarning('Billing reconciliation found anomalies', {
        route: '/api/cron/billing-reconciliation',
        ...results,
      });
    }

    logger.info('Reconciliation complete', results);
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Reconciliation failed', { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
