export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { PLANS, type PlanId, type BillingInterval } from '@/lib/plans';
import { getTenant } from '@/lib/auth/get-tenant';

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });

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
      .select('stripe_customer_id, stripe_subscription_id')
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (subscription?.stripe_subscription_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/app/billing`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/app/billing?checkout=success`,
      cancel_url: `${appUrl}/app/billing?checkout=cancel`,
      subscription_data: {
        trial_period_days: subscription?.stripe_subscription_id ? undefined : 13,
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
  } catch (err: any) {
    console.error('Billing checkout error:', err);
    return NextResponse.json({ error: err.message ?? 'Error creando sesión' }, { status: 500 });
  }
}
