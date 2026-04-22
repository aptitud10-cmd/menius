export const dynamic = 'force-dynamic';

/**
 * Stripe Connect webhook handler.
 *
 * Listens for v2 thin events on connected accounts:
 *   - v2.core.account.updated
 *   - v2.core.account[requirements].updated
 *   - v2.core.account[configuration.merchant].capability_status_updated
 *
 * Setup in Stripe Dashboard → Developers → Event destinations → + Add destination:
 *   • Events from: Connected and v2 accounts
 *   • Events: v2.core.account.updated (or the ones above)
 *   • Payload style: Thin
 *   • URL: https://menius.app/api/connect/webhook
 *
 * Set the resulting webhook secret as STRIPE_CONNECT_WEBHOOK_SECRET in .env.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getConnectWebhookSecret } from '@/lib/stripe';
import { createLogger } from '@/lib/logger';

const logger = createLogger('connect-webhook');

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = getConnectWebhookSecret();

  let thinEvent: any;
  try {
    thinEvent = (stripe as any).parseThinEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    logger.warn('Invalid Connect webhook signature', { error: message });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    logger.info('Connect event received', { type: thinEvent.type });

    // All these events mean "something changed on a connected account" —
    // we just re-read the account status via v1 API and sync it.
    const accountEvents = [
      'v2.core.account.updated',
      'v2.core.account[requirements].updated',
      'v2.core.account[configuration.merchant].capability_status_updated',
    ];

    if (accountEvents.includes(thinEvent.type)) {
      const accountId: string | undefined =
        thinEvent.related_object?.id ?? thinEvent.data?.object?.id;

      if (accountId) {
        await syncAccountStatus(accountId, stripe);
      } else {
        logger.warn('No accountId in thin event', { type: thinEvent.type });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    logger.error('Connect webhook processing error', { error: message });
    return NextResponse.json({ received: true, warning: message });
  }
}

async function syncAccountStatus(stripeAccountId: string, stripe: any) {
  // Read via v1 API — our accounts are Express (v1)
  const account = await stripe.accounts.retrieve(stripeAccountId);

  const readyToReceivePayments = account.capabilities?.card_payments === 'active';
  const onboardingComplete =
    !account.requirements?.currently_due?.length &&
    !account.requirements?.past_due?.length;
  const isComplete = onboardingComplete && readyToReceivePayments;

  const adminDb = createAdminClient();
  const { error } = await adminDb
    .from('restaurants')
    .update({ stripe_onboarding_complete: isComplete })
    .eq('stripe_account_id', stripeAccountId);

  if (error) {
    logger.error('Failed to sync stripe_onboarding_complete', {
      stripeAccountId,
      error: error.message,
    });
  } else {
    logger.info('Synced stripe_onboarding_complete', { stripeAccountId, isComplete });
  }
}
