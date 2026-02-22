export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`pay-intent:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });

    const { amount, currency, order_id, order_number } = await request.json();

    if (!amount || !currency) {
      return NextResponse.json({ error: 'amount and currency required' }, { status: 400 });
    }

    const intentParams: any = {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata: {
        order_id: order_id ?? '',
        order_number: order_number ?? '',
      },
    };

    if (order_id) {
      const supabase = createClient();
      const { data: order } = await supabase
        .from('orders')
        .select('restaurant_id, restaurants ( stripe_account_id, stripe_onboarding_complete )')
        .eq('id', order_id)
        .maybeSingle();

      const rest = (order as any)?.restaurants;
      if (rest?.stripe_onboarding_complete && rest?.stripe_account_id) {
        intentParams.transfer_data = { destination: rest.stripe_account_id };
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error creating payment intent' }, { status: 500 });
  }
}
