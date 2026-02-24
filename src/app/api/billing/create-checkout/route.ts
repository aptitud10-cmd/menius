export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { PLANS, type PlanId, type BillingInterval } from '@/lib/plans';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';

const logger = createLogger('billing-checkout');

function getStripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { maxNetworkRetries: 3, timeout: 30_000 });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();

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
      logger.error('Price ID is empty', { planId, interval });
      return NextResponse.json({ error: 'Precio no configurado para este plan' }, { status: 400 });
    }

    logger.info('Creating checkout', { planId, interval, priceId: priceId.substring(0, 12) + '...' });

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

      logger.info('Creating Stripe customer');
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

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app').trim();
    logger.info('App URL', { appUrl });

    if (!appUrl.startsWith('http')) {
      return NextResponse.json({ error: `APP_URL inválida: ${appUrl}` }, { status: 500 });
    }

    const isLiveSubscription =
      subscription?.stripe_subscription_id &&
      (subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'past_due');

    if (isLiveSubscription) {
      logger.info('Redirecting to billing portal');
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/app/billing`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    const hasValidTrial =
      !subscription?.stripe_subscription_id &&
      subscription?.status === 'trialing' &&
      subscription?.trial_end &&
      new Date(subscription.trial_end) > new Date();

    logger.info('Creating checkout session', { customerId, hasValidTrial });
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
    const stripeCode = (err as any)?.code ?? (err as any)?.type ?? '';
    logger.error('Billing checkout error', {
      error: message,
      type: name,
      stripeCode,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: message, code: stripeCode || name },
      { status: 500 },
    );
  }
}
