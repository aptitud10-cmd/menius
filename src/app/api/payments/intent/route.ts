export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';
import { captureError } from '@/lib/error-reporting';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`pay-intent:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const stripe = getStripe();

    const body = await request.json();
    const order_id = body.order_id;

    if (!order_id || typeof order_id !== 'string' || !/^[0-9a-f-]{36}$/.test(order_id)) {
      return NextResponse.json({ error: 'Valid order_id required' }, { status: 400 });
    }

    const adminDb = createAdminClient();
    const { data: order } = await adminDb
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

    const connectedAccount: string | null = rest?.stripe_onboarding_complete
      ? (rest?.stripe_account_id ?? null)
      : null;

    if (!connectedAccount) {
      return NextResponse.json(
        {
          error:
            'El pago en línea no está disponible para este restaurante aún. Por favor paga en persona.',
        },
        { status: 400 }
      );
    }

    const intentParams: import('stripe').Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      metadata: {
        order_id: order.id,
        order_number: order.order_number ?? '',
      },
    };

    const paymentIntent = await stripe.paymentIntents.create(intentParams, {
      stripeAccount: connectedAccount,
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    captureError(err, { route: '/api/payments/intent' });
    return NextResponse.json({ error: err.message ?? 'Error creating payment intent' }, { status: 500 });
  }
}
