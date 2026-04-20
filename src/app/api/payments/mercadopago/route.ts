/**
 * POST /api/payments/mercadopago
 *
 * Creates a MercadoPago Preference for a given order and returns the
 * checkout URL (init_point for production, sandbox_init_point for testing).
 *
 * Each restaurant configures their own MP Access Token in Settings.
 * Menius does NOT split the payment — the full amount goes to the restaurant.
 * Commission is handled separately via invoice/plan fee, like Wompi.
 *
 * Required per-restaurant DB columns (migration-mercadopago.sql):
 *   restaurants.mp_access_token  — restaurant's own MP access token
 *   restaurants.mp_enabled       — must be true to accept MP payments
 *
 * No platform-level env vars needed for MP (unlike Stripe).
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const { allowed } = await checkRateLimitAsync(`mp-checkout:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { order_id, slug } = body as { order_id?: string; slug?: string };

    if (!order_id || !UUID_RE.test(order_id)) {
      return NextResponse.json({ error: 'Valid order_id required' }, { status: 400 });
    }
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Load order + restaurant MP config in one query
    const { data: order, error } = await adminDb
      .from('orders')
      .select(`
        id, order_number, total, customer_name, customer_email, customer_phone,
        payment_status, restaurant_id,
        restaurants ( currency, mp_access_token, mp_enabled, name, locale )
      `)
      .eq('id', order_id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 409 });
    }

    const restaurant = (order as any).restaurants as {
      currency: string;
      mp_access_token: string | null;
      mp_enabled: boolean;
      name: string;
      locale: string | null;
    } | null;

    if (!restaurant?.mp_enabled || !restaurant?.mp_access_token) {
      return NextResponse.json({ error: 'MercadoPago not configured for this restaurant' }, { status: 503 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const successUrl = `${appUrl}/${slug}/orden/${order.order_number}?paid=true`;
    const failureUrl = `${appUrl}/${slug}/orden/${order.order_number}?paid=false`;
    const pendingUrl = `${appUrl}/${slug}/orden/${order.order_number}?paid=pending`;

    // Initialize MP client with restaurant's own token
    const mpClient = new MercadoPagoConfig({ accessToken: restaurant.mp_access_token });
    const preferenceClient = new Preference(mpClient);

    const preference = await preferenceClient.create({
      body: {
        external_reference: order.order_number,
        items: [
          {
            id: order.id,
            title: `Pedido #${order.order_number} — ${restaurant.name}`,
            quantity: 1,
            unit_price: Number(order.total),
            currency_id: restaurant.currency.toUpperCase(),
          },
        ],
        payer: {
          name: order.customer_name || undefined,
          email: order.customer_email || undefined,
          phone: order.customer_phone
            ? { number: order.customer_phone.replace(/[^0-9]/g, '') }
            : undefined,
        },
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        auto_return: 'approved',
        // Webhook to confirm payment server-side
        notification_url: `${appUrl}/api/payments/mercadopago-webhook`,
        metadata: {
          order_id: order.id,
          restaurant_id: order.restaurant_id,
        },
      },
    });

    const checkoutUrl = preference.init_point;
    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Failed to create MP preference' }, { status: 502 });
    }

    // Save preference ID so we can match the webhook later
    await adminDb
      .from('orders')
      .update({ payment_intent_id: preference.id ?? null })
      .eq('id', order.id);

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (err: unknown) {
    captureError(err, { route: '/api/payments/mercadopago' });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
