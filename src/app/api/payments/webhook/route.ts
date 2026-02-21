export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

const logger = createLogger('payments-webhook');

async function updateOrderPayment(orderId: string, status: 'paid' | 'failed', paymentIntent?: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: status,
      ...(paymentIntent ? { payment_intent_id: paymentIntent } : {}),
    })
    .eq('id', orderId);

  if (error) {
    logger.error('Failed to update order payment status', { orderId, status, error: error.message });
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });

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

      default:
        logger.info('Unhandled event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    logger.error('Webhook processing error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
