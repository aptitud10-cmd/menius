export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';
import { captureError } from '@/lib/error-reporting';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`pay-checkout:${ip}`, { limit: 10, windowSec: 60 });
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

    // Fetch order with items + restaurant currency
    const { data: order, error } = await adminDb
      .from('orders')
      .select(`
        id, order_number, total, customer_name, restaurant_id,
        restaurants ( currency, stripe_account_id, stripe_onboarding_complete ),
        order_items ( qty, unit_price, line_total, products ( name ) )
      `)
      .eq('id', order_id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const rest = (order as any).restaurants;
    const currency = (rest?.currency || 'usd').toLowerCase();
    const connectedAccount = rest?.stripe_onboarding_complete ? rest?.stripe_account_id : null;

    const lineItems = (order.order_items ?? []).map((item: any) => ({
      price_data: {
        currency,
        product_data: {
          name: item.products?.name ?? 'Producto',
        },
        unit_amount: Math.round(Number(item.unit_price) * 100),
      },
      quantity: item.qty,
    }));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

    const sessionParams: any = {
      line_items: lineItems,
      mode: 'payment',
      payment_method_options: {
        oxxo: { expires_after_days: 3 },
      },
      success_url: `${appUrl}/r/${slug}/orden/${order.order_number}?paid=true`,
      cancel_url: `${appUrl}/r/${slug}/orden/${order.order_number}?paid=false`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
    };

    // Direct charge: create the Checkout Session on the connected account directly.
    // With merchant config + fees_collector/losses_collector: 'stripe', the restaurant
    // processes the payment themselves — Stripe handles fees and chargebacks.
    // When no connected account is set up yet, the charge falls back to the platform account.
    const requestOptions = connectedAccount ? { stripeAccount: connectedAccount } : undefined;

    const session = await stripe.checkout.sessions.create(sessionParams, requestOptions as any);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    captureError(err, { route: '/api/payments/checkout' });
    return NextResponse.json({ error: err.message ?? 'Error creando sesión de pago' }, { status: 500 });
  }
}
