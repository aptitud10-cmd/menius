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
import type { PaymentErrorCode } from '@/lib/payments/payment-errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `code` is stable; the checkout translates it (lib/payments/payment-errors).
const fail = (code: PaymentErrorCode, error: string, status: number) =>
  NextResponse.json({ error, code }, { status });

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const { allowed } = await checkRateLimitAsync(`mp-checkout:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return fail('rate_limited', 'Too many requests', 429);
    }

    const body = await req.json().catch(() => ({}));
    const { order_id, slug, t } = body as { order_id?: string; slug?: string; t?: string };

    if (!order_id || !UUID_RE.test(order_id)) {
      return fail('invalid_request', 'Valid order_id required', 400);
    }
    if (!slug || typeof slug !== 'string') {
      return fail('invalid_request', 'slug required', 400);
    }

    const adminDb = createAdminClient();

    // Load order + restaurant MP config in one query
    const { data: order, error } = await adminDb
      .from('orders')
      .select(`
        id, order_number, total, customer_name, customer_email, customer_phone,
        status, payment_status, payment_method, restaurant_id, customer_token,
        restaurants ( currency, mp_access_token, mp_enabled, name, locale )
      `)
      .eq('id', order_id)
      .maybeSingle();

    // The return URLs carry the customer's tracking token: only whoever
    // placed the order (it has the token) can start the payment. Same answer
    // as a missing order, so a guessed id learns nothing.
    const customerToken = (order as { customer_token?: string | null } | null)?.customer_token;
    if (error || !order || !customerToken || t !== customerToken) {
      return fail('order_not_found', 'Order not found', 404);
    }
    if ((order as { payment_method?: string | null }).payment_method === 'cash') {
      return fail('cash_order', 'This order is paid in cash.', 409);
    }

    if (order.payment_status === 'paid') {
      return fail('already_paid', 'Order already paid', 409);
    }
    // W10: un pedido cancelado (por el restaurante o por expiración) no se cobra.
    if ((order as { status?: string }).status === 'cancelled') {
      return fail('order_closed', 'This order no longer accepts payments.', 409);
    }
    if (!(Number(order.total) > 0)) {
      return fail('invalid_amount', 'Invalid order total', 409);
    }

    const restaurant = (order as any).restaurants as {
      currency: string;
      mp_access_token: string | null;
      mp_enabled: boolean;
      name: string;
      locale: string | null;
    } | null;

    if (!restaurant?.mp_enabled || !restaurant?.mp_access_token) {
      return fail('online_unavailable', 'MercadoPago not configured for this restaurant', 503);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    // VIEW-ONLY customer_token — the driver action token never rides redirect URLs.
    const tokenQs = `&t=${encodeURIComponent(customerToken)}`;
    const successUrl = `${appUrl}/${encodeURIComponent(slug)}/orden/${order.order_number}?paid=true${tokenQs}`;
    const failureUrl = `${appUrl}/${encodeURIComponent(slug)}/orden/${order.order_number}?paid=false${tokenQs}`;
    const pendingUrl = `${appUrl}/${encodeURIComponent(slug)}/orden/${order.order_number}?paid=pending${tokenQs}`;

    // Initialize MP client with restaurant's own token
    const mpClient = new MercadoPagoConfig({ accessToken: restaurant.mp_access_token });
    const preferenceClient = new Preference(mpClient);

    const preference = await preferenceClient.create({
      body: {
        // Order UUID, NOT order_number: order_number is not unique (prod has
        // duplicates), the webhook must resolve the exact order.
        external_reference: order.id,
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
        // ?oid=: el aviso de MP solo trae el id del pago; el pedido dice con
        // qué token (el del restaurante) verificarlo. MP agrega data.id y type.
        notification_url: `${appUrl}/api/payments/mercadopago-webhook?oid=${order.id}`,
        metadata: {
          order_id: order.id,
          restaurant_id: order.restaurant_id,
        },
      },
    });

    const checkoutUrl = preference.init_point;
    if (!checkoutUrl) {
      return fail('payment_start_failed', 'Failed to create MP preference', 502);
    }

    // Save preference ID so we can match the webhook later
    await adminDb
      .from('orders')
      .update({ payment_intent_id: preference.id ?? null })
      .eq('id', order.id);

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (err: unknown) {
    captureError(err, { route: '/api/payments/mercadopago' });
    // Never echo the provider's message (it can carry account details).
    return fail('payment_start_failed', 'Internal error', 500);
  }
}
