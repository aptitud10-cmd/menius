export const dynamic = 'force-dynamic';

/**
 * Stripe Connect webhook handler for Express accounts (v1 API).
 *
 * Listens for:
 *   - account.updated  (requirements changed, capabilities updated)
 *
 * Setup in Stripe Dashboard → Developers → Webhooks → + Add endpoint:
 *   • URL: https://menius.app/api/connect/webhook
 *   • Events from: Connected accounts
 *   • Events: account.updated
 *
 * Set the resulting webhook secret as STRIPE_CONNECT_WEBHOOK_SECRET in .env.
 *
 * Local testing:
 *   stripe listen --forward-to http://localhost:3000/api/connect/webhook
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getConnectWebhookSecret } from '@/lib/stripe';
import { createLogger } from '@/lib/logger';
import Stripe from 'stripe';

const logger = createLogger('connect-webhook');

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = getConnectWebhookSecret();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    logger.warn('Invalid Connect webhook signature', { error: message });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    logger.info('Connect event received', { type: event.type });

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      await syncAccountStatus(account);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    logger.error('Connect webhook processing error', { error: message });
    return NextResponse.json({ received: true, warning: message });
  }
}

async function syncAccountStatus(account: Stripe.Account) {
  const readyToReceivePayments = account.capabilities?.card_payments === 'active';
  const onboardingComplete =
    !account.requirements?.currently_due?.length &&
    !account.requirements?.past_due?.length;
  const isComplete = onboardingComplete && readyToReceivePayments;

  const adminDb = createAdminClient();
  const { error } = await adminDb
    .from('restaurants')
    .update({ stripe_onboarding_complete: isComplete })
    .eq('stripe_account_id', account.id);

  if (error) {
    logger.error('Failed to sync stripe_onboarding_complete', {
      stripeAccountId: account.id,
      error: error.message,
    });
  } else {
    logger.info('Synced stripe_onboarding_complete', { stripeAccountId: account.id, isComplete });
  }
}
