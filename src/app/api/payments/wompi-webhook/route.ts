export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { sendPaymentConfirmedNotifications } from '@/lib/notifications/order-notifications';

const logger = createLogger('wompi-webhook');

/**
 * POST /api/payments/wompi-webhook
 * Receives Wompi transaction events.
 * Configure this URL in Wompi dashboard → Desarrolladores → Eventos.
 *
 * Required env vars:
 *   WOMPI_EVENTS_SECRET — the events secret from Wompi dashboard
 */
export async function POST(request: NextRequest) {
  try {
    // Fail-closed: reject all requests if the secret is not configured.
    // Without this guard, any HTTP client can forge a payment confirmation.
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET?.trim();
    if (!eventsSecret) {
      logger.error('WOMPI_EVENTS_SECRET is not configured — rejecting webhook to prevent spoofed payment confirmations');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    const body = await request.json();

    // Wompi sends: { event, data: { transaction }, timestamp, signature: { properties, checksum } }
    // Verify checksum: SHA256(properties.map(p => body[p]).join('') + eventsSecret)
    const sig = body?.signature;
    if (!sig?.properties || !sig?.checksum) {
      logger.warn('Wompi webhook missing signature fields');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const toHash = sig.properties
      .map((prop: string) => {
        const parts = prop.split('.');
        let val: unknown = body;
        for (const p of parts) val = (val as Record<string, unknown>)?.[p];
        return String(val ?? '');
      })
      .join('') + eventsSecret;
    const computed = createHash('sha256').update(toHash).digest('hex');
    if (computed !== sig.checksum) {
      logger.warn('Wompi webhook signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: string = body?.event ?? '';
    const transaction = body?.data?.transaction;

    if (!transaction) {
      return NextResponse.json({ received: true });
    }

    logger.info('Wompi event received', { event, reference: transaction.reference, status: transaction.status });

    if (event === 'transaction.updated' && transaction.status === 'APPROVED') {
      const reference: string = transaction.reference;
      if (!reference) return NextResponse.json({ received: true });

      const adminDb = createAdminClient();

      const { data: order } = await adminDb
        .from('orders')
        .select('id, payment_status')
        .eq('order_number', reference)
        .maybeSingle();

      if (!order) {
        logger.warn('Order not found for Wompi reference', { reference });
        return NextResponse.json({ received: true });
      }

      if (order.payment_status === 'paid') {
        return NextResponse.json({ received: true }); // idempotent
      }

      const { error } = await adminDb
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_intent_id: transaction.id,
        })
        .eq('id', order.id);

      if (error) {
        logger.error('Failed to update order payment', { orderId: order.id, error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      sendPaymentConfirmedNotifications(order.id).catch((err) => {
        logger.error('sendPaymentConfirmedNotifications failed', { orderId: order.id, error: err?.message });
      });

      logger.info('Order marked as paid via Wompi', { orderId: order.id, reference });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    captureError(err, { route: '/api/payments/wompi-webhook' });
    logger.error('Webhook processing failed', { error: err?.message });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
