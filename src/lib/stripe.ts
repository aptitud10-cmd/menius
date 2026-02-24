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
  return (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
}
