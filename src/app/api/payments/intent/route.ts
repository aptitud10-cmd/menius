export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';

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

    const stripe = getStripe();

    const { order_id } = await request.json();

    if (!order_id) {
      return NextResponse.json({ error: 'order_id requerido' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: order } = await supabase
      .from('orders')
      .select('id, total, order_number, restaurant_id, restaurants ( currency, stripe_account_id, stripe_onboarding_complete )')
      .eq('id', order_id)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const rest = (order as any)?.restaurants;
    const currency = (rest?.currency || 'mxn').toLowerCase();
    const amount = Math.round(Number(order.total) * 100);

    if (amount <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const intentParams: any = {
      amount,
      currency,
      metadata: {
        order_id: order.id,
        order_number: order.order_number ?? '',
      },
    };

    if (rest?.stripe_onboarding_complete && rest?.stripe_account_id) {
      intentParams.transfer_data = { destination: rest.stripe_account_id };
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error creating payment intent' }, { status: 500 });
  }
}
