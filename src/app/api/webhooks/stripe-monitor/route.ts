export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAlert } from '@/lib/dev-tool/alerts';
import { createLogger } from '@/lib/logger';

const logger = createLogger('webhook-stripe-monitor');

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_MONITOR_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' });
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
      : JSON.parse(rawBody) as Stripe.Event;
  } catch (err) {
    logger.warn('Stripe webhook signature failed', { error: String(err) });
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const amount = (pi.amount / 100).toFixed(2);
      const currency = pi.currency.toUpperCase();
      const reason = pi.last_payment_error?.message ?? pi.last_payment_error?.code ?? 'Unknown';
      await createAlert({
        severity: 'warning',
        source: 'stripe',
        title: `Pago fallido: ${currency} $${amount}`,
        description: `PaymentIntent ${pi.id} falló. Razón: ${reason}. Cliente: ${pi.customer ?? 'desconocido'}.`,
        data: { paymentIntentId: pi.id, amount: pi.amount, currency: pi.currency, reason },
      });
      break;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      const amount = ((inv.amount_due ?? 0) / 100).toFixed(2);
      const customer = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
      await createAlert({
        severity: 'critical',
        source: 'stripe',
        title: `Factura de subscripción no pagada: $${amount}`,
        description: `La factura ${inv.id} no pudo cobrarse. El cliente puede perder acceso. Customer: ${customer}.`,
        data: { invoiceId: inv.id, customerId: customer, amount: inv.amount_due },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      await createAlert({
        severity: 'warning',
        source: 'stripe',
        title: `Subscripción cancelada`,
        description: `La subscripción ${sub.id} fue cancelada. Customer: ${customer}. Plan: ${sub.items.data[0]?.price?.id ?? 'unknown'}.`,
        data: { subscriptionId: sub.id, customerId: customer },
      });
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toLocaleDateString('es-MX') : 'pronto';
      await createAlert({
        severity: 'info',
        source: 'stripe',
        title: `Trial termina el ${trialEnd}`,
        description: `La subscripción ${sub.id} está por terminar su trial. Customer: ${customer}. Oportunidad de conversión.`,
        data: { subscriptionId: sub.id, customerId: customer, trialEnd: sub.trial_end },
      });
      break;
    }

    default:
      // Ignore unhandled events
      break;
  }

  return NextResponse.json({ ok: true });
}
