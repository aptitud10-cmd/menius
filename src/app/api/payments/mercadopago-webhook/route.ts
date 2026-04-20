/**
 * POST /api/payments/mercadopago-webhook
 *
 * Receives MercadoPago IPN (Instant Payment Notification) events.
 * Configure this URL in MP Dashboard → Tu negocio → Configuraciones → Webhooks.
 *
 * MP sends a notification with the payment id; we query MP's API to verify
 * the actual payment status (never trust the webhook payload alone).
 *
 * Signature verification uses the x-signature header (HMAC-SHA256).
 * Required env var:
 *   MP_WEBHOOK_SECRET — the secret from MP Dashboard → Webhooks → Clave secreta
 *
 * Each restaurant has their own MP Access Token stored in restaurants.mp_access_token.
 * We load it to make the verification request against that restaurant's MP account.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { sendPaymentConfirmedNotifications } from '@/lib/notifications/order-notifications';
import { createHmac } from 'crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const logger = createLogger('mp-webhook');

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.MP_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      logger.error('MP_WEBHOOK_SECRET not configured — rejecting to prevent spoofed confirmations');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    // ── Signature verification ────────────────────────────────────────────────
    // MP sends: x-signature: ts=<timestamp>,v1=<hmac>
    // Signed string: "id:<id>;request-id:<x-request-id>;ts:<timestamp>;"
    const xSignature = req.headers.get('x-signature') ?? '';
    const xRequestId = req.headers.get('x-request-id') ?? '';
    const { searchParams } = new URL(req.url);
    const dataId = searchParams.get('data.id') ?? '';

    const tsMatch = xSignature.match(/ts=([^,]+)/);
    const v1Match = xSignature.match(/v1=([^,]+)/);
    const ts = tsMatch?.[1] ?? '';
    const receivedHmac = v1Match?.[1] ?? '';

    if (ts && receivedHmac && dataId) {
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const computed = createHmac('sha256', webhookSecret).update(manifest).digest('hex');
      if (computed !== receivedHmac) {
        logger.warn('MP webhook signature mismatch', { dataId });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const type: string = body?.type ?? body?.action ?? '';
    const paymentId: string = String(body?.data?.id ?? body?.id ?? '');

    logger.info('MP webhook received', { type, paymentId });

    // We only care about payment confirmations
    if (!['payment', 'payment.created', 'payment.updated'].some(t => type.includes(t))) {
      return NextResponse.json({ received: true });
    }

    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    // ── Fetch payment from MP to verify status (never trust payload alone) ───
    // We need the order to find which restaurant's token to use.
    // First: find the order by payment_intent_id (preference id) or by looking
    // up the external_reference from MP's payment object.
    // Strategy: fetch payment with the platform token if configured,
    // fallback: find order by external_reference returned in the payload.

    const adminDb = createAdminClient();

    // MP sends external_reference in some notification types
    const externalRef: string = body?.data?.external_reference ?? '';

    let order: { id: string; payment_status: string; restaurant_id: string } | null = null;

    if (externalRef) {
      const { data } = await adminDb
        .from('orders')
        .select('id, payment_status, restaurant_id')
        .eq('order_number', externalRef)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      // Try by payment_intent_id = preference id stored at checkout creation
      // MP payment object has metadata.order_id
      // We'll look up order after fetching the payment using any available token
      // For now, return 200 — MP will retry and we'll catch it when external_reference is included
      logger.warn('MP webhook: could not identify order', { paymentId, externalRef });
      return NextResponse.json({ received: true });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ received: true }); // idempotent
    }

    // Load restaurant MP token to verify payment against their account
    const { data: restaurant } = await adminDb
      .from('restaurants')
      .select('mp_access_token, mp_enabled')
      .eq('id', order.restaurant_id)
      .maybeSingle();

    if (!restaurant?.mp_enabled || !restaurant?.mp_access_token) {
      logger.warn('MP webhook: restaurant MP not enabled', { restaurantId: order.restaurant_id });
      return NextResponse.json({ received: true });
    }

    // Verify payment status with MP API
    const mpClient = new MercadoPagoConfig({ accessToken: restaurant.mp_access_token });
    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: paymentId });

    if (payment.status !== 'approved') {
      logger.info('MP payment not approved', { paymentId, status: payment.status });
      return NextResponse.json({ received: true });
    }

    // Mark order as paid
    const { error } = await adminDb
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_intent_id: String(payment.id),
      })
      .eq('id', order.id);

    if (error) {
      logger.error('Failed to update order payment', { orderId: order.id, error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    sendPaymentConfirmedNotifications(order.id).catch((err) => {
      logger.error('sendPaymentConfirmedNotifications failed', { orderId: order.id, error: err?.message });
    });

    logger.info('Order marked as paid via MercadoPago', { orderId: order.id, paymentId });

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    captureError(err, { route: '/api/payments/mercadopago-webhook' });
    logger.error('MP webhook error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
