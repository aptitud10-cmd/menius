export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';
import { captureError } from '@/lib/error-reporting';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`pay-checkout:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const stripe = getStripe();

    const body = await request.json();
    const { order_id, slug } = body;
    if (!order_id || typeof order_id !== 'string' || !/^[0-9a-f-]{36}$/.test(order_id)) {
      return NextResponse.json({ error: 'Valid order_id required' }, { status: 400 });
    }
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Fetch order with restaurant info — no need to re-fetch order_items since
    // we use the already-validated order.total (includes delivery, tip, discounts, tax)
    const { data: order, error } = await adminDb
      .from('orders')
      .select(`
        id, order_number, total, customer_name, restaurant_id, payment_status,
        restaurants ( currency, stripe_account_id, stripe_onboarding_complete, name, commission_plan )
      `)
      .eq('id', order_id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Don't create a new Stripe session if already paid
    if ((order as any).payment_status === 'paid') {
      return NextResponse.json({ error: 'Este pedido ya fue pagado.' }, { status: 409 });
    }

    const rest = (order as any).restaurants;
    const currency = (rest?.currency || 'usd').toLowerCase();
    const connectedAccount = rest?.stripe_onboarding_complete ? rest?.stripe_account_id : null;

    if (currency === 'cop') {
      return NextResponse.json(
        { error: 'This restaurant uses Wompi for online payments.' },
        { status: 400 }
      );
    }

    if (!connectedAccount) {
      return NextResponse.json(
        {
          error:
            'El pago en línea no está disponible para este restaurante aún. Por favor paga en persona.',
        },
        { status: 400 }
      );
    }

    // Use the server-validated order total as a single line item.
    // This guarantees the charged amount matches the DB total (subtotal + delivery +
    // tip + tax - discounts) and avoids re-summing items which could miss fees.
    const lineItems: import('stripe').Stripe.Checkout.SessionCreateParams['line_items'] = [
      {
        price_data: {
          currency,
          product_data: { name: rest?.name ?? 'Pedido' },
          unit_amount: Math.round(Number(order.total) * 100),
        },
        quantity: 1,
      },
    ];

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

    // Commission-plan restaurants pay 4% per order; all others pay 0% from this route.
    const commissionBps = (rest as any)?.commission_plan === true ? 400 : 0;
    const applicationFeeAmount = commissionBps > 0
      ? Math.round(Number(order.total) * 100 * commissionBps / 10000)
      : undefined;

    // Use destination charge (same model as /api/orders) so the webhook fires
    // on the platform account and the order gets marked as paid correctly.
    const sessionParams: import('stripe').Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: `${appUrl}/${slug}/orden/${order.order_number}?paid=true`,
      cancel_url: `${appUrl}/${slug}/orden/${order.order_number}?paid=false`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
      payment_intent_data: {
        transfer_data: { destination: connectedAccount },
        metadata: { order_id: order.id, order_number: order.order_number },
        ...(applicationFeeAmount && applicationFeeAmount > 0 && {
          application_fee_amount: applicationFeeAmount,
        }),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    captureError(err, { route: '/api/payments/checkout' });
    return NextResponse.json({ error: err.message ?? 'Error creando sesión de pago' }, { status: 500 });
  }
}
