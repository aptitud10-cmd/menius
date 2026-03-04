export const dynamic = 'force-dynamic';

/**
 * Stripe Connect V2 Thin Events webhook handler.
 *
 * This endpoint receives thin event notifications for connected accounts.
 * Thin events contain only the event ID — the actual payload is fetched
 * from the Stripe API to prevent replay attacks and ensure fresh data.
 *
 * Listens for:
 *   - v2.core.account[requirements].updated
 *   - v2.core.account[configuration.recipient].capability_status_updated
 *
 * Setup in Stripe Dashboard → Developers → Webhooks → + Add destination:
 *   • Events from: Connected accounts
 *   • Show advanced options → Payload style: Thin
 *   • Events: v2.core.account[requirements].updated
 *             v2.core.account[configuration.recipient].capability_status_updated
 *
 * Set the resulting webhook secret as STRIPE_CONNECT_WEBHOOK_SECRET in .env.
 *
 * Local testing with Stripe CLI:
 *   stripe listen \
 *     --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' \
 *     --forward-thin-to http://localhost:3000/api/connect/webhook
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

  // parseThinEvent verifies the HMAC signature and returns the thin event shell.
  // It does NOT contain the full event payload — we must fetch that separately.
  let thinEvent: any;
  try {
    thinEvent = (stripe as any).parseThinEvent(body, signature, webhookSecret);
  } catch (err: any) {
    logger.warn('Invalid Connect webhook signature', { error: err.message });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // Fetch the full event data from the Stripe API.
    // This ensures we always work with the latest state (not stale cached data).
    const event = await (stripe as any).v2.core.events.retrieve(thinEvent.id);
    const accountId: string | undefined = (event as any).related_object?.id ?? (event as any).data?.object?.id;

    logger.info('Connect event received', { type: event.type, accountId });

    switch (event.type) {
      case 'v2.core.account[requirements].updated': {
        // Stripe is notifying us that requirements on a connected account have
        // changed — for example, new documents are needed or previously-due
        // items have been resolved.
        if (accountId) {
          await syncAccountStatus(accountId, stripe);
        }
        break;
      }

      case 'v2.core.account[configuration.merchant].capability_status_updated': {
        // The card_payments capability status changed on the merchant config.
        if (accountId) {
          await syncAccountStatus(accountId, stripe);
        }
        break;
      }

      default:
        logger.info('Unhandled Connect event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error('Connect webhook processing error', { error: err.message });
    // Return 200 so Stripe doesn't keep retrying a transient error.
    // Log the error for investigation instead.
    return NextResponse.json({ received: true, warning: err.message });
  }
}

/**
 * Fetches fresh account status from Stripe V2 and syncs stripe_onboarding_complete
 * in the restaurants table.
 */
async function syncAccountStatus(stripeAccountId: string, stripe: any) {
  const account = await stripe.v2.core.accounts.retrieve(
    stripeAccountId,
    { include: ['configuration.merchant', 'requirements'] }
  );

  const readyToReceivePayments =
    account?.configuration?.merchant?.capabilities
      ?.card_payments?.status === 'active';

  const requirementsStatus =
    account?.requirements?.summary?.minimum_deadline?.status;
  const onboardingComplete =
    requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

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
    logger.info('Synced stripe_onboarding_complete', {
      stripeAccountId,
      isComplete,
      requirementsStatus,
    });
  }
}
