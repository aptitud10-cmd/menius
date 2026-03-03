import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  _stripe = new Stripe(key, { maxNetworkRetries: 3, timeout: 30_000 });
  return _stripe;
}

export function getWebhookSecret(): string {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}

export function getPaymentsWebhookSecret(): string {
  const secret = (process.env.STRIPE_PAYMENTS_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (!secret) throw new Error('STRIPE_PAYMENTS_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET) is not set');
  return secret;
}
