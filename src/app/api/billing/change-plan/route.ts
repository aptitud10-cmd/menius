export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { PLANS, type PlanId, type BillingInterval } from '@/lib/plans';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { getStripe } from '@/lib/stripe';
import { captureError } from '@/lib/error-reporting';
import { withRetry } from '@/lib/retry';
import { changePlanSchema } from '@/lib/validations';

const logger = createLogger('billing-change-plan');

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const supabase = await createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const parsed = changePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const planId = parsed.data.plan_id as PlanId;
    const interval = parsed.data.interval as BillingInterval;

    const plan = PLANS[planId];
    if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    const priceId = plan.stripePriceId[interval];
    if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 400 });

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, plan_id, status')
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription to change' }, { status: 400 });
    }

    const stripeSubId = subscription.stripe_subscription_id;

    logger.info('Changing plan', { from: subscription.plan_id, to: planId, interval });

    const stripeSub = await withRetry(
      () => stripe.subscriptions.retrieve(stripeSubId),
      { context: 'retrieve-subscription' },
    );
    const currentItem = stripeSub.items.data[0];
    if (!currentItem) {
      return NextResponse.json({ error: 'Subscription has no items' }, { status: 400 });
    }

    if (currentItem.price.id === priceId) {
      return NextResponse.json({ error: 'Already on this plan' }, { status: 400 });
    }

    await withRetry(
      () => stripe.subscriptions.update(stripeSubId, {
        items: [{ id: currentItem.id, price: priceId }],
        proration_behavior: 'create_prorations',
        metadata: { ...stripeSub.metadata, plan_id: planId },
      }),
      { context: 'update-subscription' },
    );

    const { error: dbError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: planId,
        stripe_price_id: priceId,
        updated_at: new Date().toISOString(),
      })
      .eq('restaurant_id', tenant.restaurantId);

    if (dbError) {
      logger.error('DB update failed after Stripe plan change', { error: dbError.message, planId, restaurantId: tenant.restaurantId });
      captureError(new Error(dbError.message), { route: '/api/billing/change-plan', context: 'db-update' });
      return NextResponse.json({
        error: 'Plan changed in Stripe but DB sync failed. Will reconcile shortly.',
        plan_id: planId,
        pending: true,
      }, { status: 500 });
    }

    logger.info('Plan changed successfully', { planId, interval });

    return NextResponse.json({ success: true, plan_id: planId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Change plan error', { error: message });
    captureError(err, { route: '/api/billing/change-plan' });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
