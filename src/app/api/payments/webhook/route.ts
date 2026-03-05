export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getPaymentsWebhookSecret } from '@/lib/stripe';
import { captureError } from '@/lib/error-reporting';
import { sendPaymentConfirmedNotifications } from '@/lib/notifications/order-notifications';

const logger = createLogger('payments-webhook');

async function updateOrderPayment(orderId: string, status: 'paid' | 'failed', paymentIntent?: string) {
  const adminDb = createAdminClient();
  const { error } = await adminDb
    .from('orders')
    .update({
      payment_status: status,
      ...(paymentIntent ? { payment_intent_id: paymentIntent } : {}),
    })
    .eq('id', orderId);

  if (error) {
    logger.error('Failed to update order payment status', { orderId, status, error: error.message });
    return;
  }

  // Send payment confirmed notifications (non-blocking)
  if (status === 'paid') {
    sendPaymentConfirmedNotifications(orderId).catch((err) => {
      logger.error('sendPaymentConfirmedNotifications failed', { orderId, error: err?.message });
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = getPaymentsWebhookSecret();

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const session = event.data.object as any;
    const orderId = session.metadata?.order_id;

    switch (event.type) {
      case 'checkout.session.completed': {
        if (orderId && session.payment_status === 'paid') {
          await updateOrderPayment(orderId, 'paid', session.payment_intent ?? '');
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        if (orderId) {
          await updateOrderPayment(orderId, 'paid', session.payment_intent ?? '');
          logger.info('Async payment succeeded (OXXO/SPEI)', { orderId });
        }
        break;
      }

      case 'checkout.session.async_payment_failed': {
        if (orderId) {
          await updateOrderPayment(orderId, 'failed');
          logger.warn('Async payment failed (OXXO/SPEI)', { orderId });
        }
        break;
      }

      case 'checkout.session.expired': {
        if (orderId) {
          await updateOrderPayment(orderId, 'failed');
          logger.info('Checkout session expired', { orderId });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        if (orderId) {
          await updateOrderPayment(orderId, 'paid', session.id ?? '');
          logger.info('PaymentIntent succeeded (Apple Pay / Google Pay)', { orderId });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        if (orderId) {
          await updateOrderPayment(orderId, 'failed', session.id ?? '');
          logger.warn('PaymentIntent failed', { orderId });
        }
        break;
      }

      default:
        logger.info('Unhandled event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    logger.error('Webhook processing error', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/payments/webhook' });
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
