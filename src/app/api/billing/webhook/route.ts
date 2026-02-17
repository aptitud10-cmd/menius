import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPlanByStripePrice, getIntervalByStripePrice } from '@/lib/plans';

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createClient();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const restaurantId = sub.metadata?.restaurant_id;
        const customerId = sub.customer as string;

        if (!restaurantId && !customerId) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = priceId ? getPlanByStripePrice(priceId) : null;
        const interval = priceId ? getIntervalByStripePrice(priceId) : 'monthly';

        let status = sub.status;
        if (status === 'active' && sub.trial_end && new Date(sub.trial_end * 1000) > new Date()) {
          status = 'trialing';
        }

        const updateData: Record<string, any> = {
          stripe_subscription_id: sub.id,
          status,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (plan) {
          updateData.plan_id = plan.id;
          updateData.billing_interval = interval;
        }

        if (sub.trial_start) {
          updateData.trial_start = new Date(sub.trial_start * 1000).toISOString();
        }
        if (sub.trial_end) {
          updateData.trial_end = new Date(sub.trial_end * 1000).toISOString();
        }

        if (restaurantId) {
          await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('restaurant_id', restaurantId);
        } else {
          await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('stripe_customer_id', customerId);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const restaurantId = sub.metadata?.restaurant_id;
        const customerId = sub.customer as string;

        const updateData = {
          status: 'canceled',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        };

        if (restaurantId) {
          await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('restaurant_id', restaurantId);
        } else {
          await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('stripe_customer_id', customerId);
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        if (customerId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', customerId);
        }

        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        const subId = invoice.subscription as string;

        if (customerId && subId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', customerId)
            .eq('stripe_subscription_id', subId);
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Billing webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
