export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { PLANS, type PlanId, type BillingInterval } from '@/lib/plans';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';

const logger = createLogger('billing-checkout');

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const planId = body.plan_id as PlanId;
    const interval = (body.interval as BillingInterval) || 'monthly';

    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 });
    }

    const priceId = plan.stripePriceId[interval];
    if (!priceId) {
      return NextResponse.json({ error: 'Precio no configurado para este plan' }, { status: 400 });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, trial_end, status')
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', tenant.restaurantId)
        .maybeSingle();

      const customer = await stripe.customers.create({
        email: (await supabase.auth.getUser()).data.user?.email,
        name: restaurant?.name ?? '',
        metadata: {
          restaurant_id: tenant.restaurantId,
          user_id: tenant.userId,
        },
      });
      customerId = customer.id;

      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('restaurant_id', tenant.restaurantId);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

    // Only redirect to Stripe billing portal if subscription is currently active/trialing
    const isLiveSubscription =
      subscription?.stripe_subscription_id &&
      (subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'past_due');

    if (isLiveSubscription) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/app/billing`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    // Transfer remaining trial days only if user is still within their original trial window
    const hasValidTrial =
      !subscription?.stripe_subscription_id &&
      subscription?.status === 'trialing' &&
      subscription?.trial_end &&
      new Date(subscription.trial_end) > new Date();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/app/billing?checkout=success`,
      cancel_url: `${appUrl}/app/billing?checkout=cancel`,
      subscription_data: {
        ...(hasValidTrial
          ? { trial_end: Math.floor(new Date(subscription!.trial_end!).getTime() / 1000) }
          : {}),
        metadata: {
          restaurant_id: tenant.restaurantId,
          plan_id: planId,
        },
      },
      metadata: {
        restaurant_id: tenant.restaurantId,
        plan_id: planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.constructor.name : 'Unknown';
    logger.error('Billing checkout error', { error: message, type: name, stack: err instanceof Error ? err.stack : undefined });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
