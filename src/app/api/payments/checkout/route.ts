export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

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

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Pagos no configurados' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });

    const { order_id, slug } = await request.json();
    if (!order_id || !slug) {
      return NextResponse.json({ error: 'order_id y slug requeridos' }, { status: 400 });
    }

    const supabase = createClient();

    // Fetch order with items + restaurant currency
    const { data: order, error } = await supabase
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

    if (connectedAccount) {
      sessionParams.payment_intent_data = {
        transfer_data: { destination: connectedAccount },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error creando sesión de pago' }, { status: 500 });
  }
}
