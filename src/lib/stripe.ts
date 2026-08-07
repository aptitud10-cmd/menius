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

export function getConnectWebhookSecret(): string {
  const secret = (process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? '').trim();
  if (!secret) throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET is not set');
  return secret;
}

/* ── Shape helpers: API version drift (Basil, 2025-03-31) ──────────────────
 *
 * Stripe moved fields between API versions and the SDK pins its own
 * (`2026-01-28.clover` in v20). Reading the old paths yielded `undefined`, and
 * `new Date(undefined * 1000).toISOString()` throws RangeError — which killed
 * the subscription webhook and the reconciliation cron before any write.
 *
 * The payload shape also depends on the version pinned on each webhook endpoint
 * in the Stripe dashboard, which we don't control from code. These helpers read
 * the new location first and fall back to the old one, so both shapes work.
 */

type UnixSeconds = number | null | undefined;

interface SubscriptionShape {
  current_period_start?: UnixSeconds;
  current_period_end?: UnixSeconds;
  items?: { data?: Array<{ current_period_start?: UnixSeconds; current_period_end?: UnixSeconds }> };
}

/** Unix seconds → ISO string, or null when the field is absent/invalid. */
export function unixToIso(value: UnixSeconds): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const d = new Date(value * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Basil moved the billing period from the subscription onto its items. */
export function getSubscriptionPeriod(sub: SubscriptionShape): {
  startIso: string | null;
  endIso: string | null;
} {
  const item = sub.items?.data?.[0];
  return {
    startIso: unixToIso(item?.current_period_start ?? sub.current_period_start),
    endIso: unixToIso(item?.current_period_end ?? sub.current_period_end),
  };
}

/** Basil replaced `invoice.subscription` with `invoice.parent.subscription_details.subscription`. */
export function getInvoiceSubscriptionId(invoice: {
  subscription?: string | { id?: string } | null;
  parent?: { subscription_details?: { subscription?: string | { id?: string } | null } | null } | null;
}): string | null {
  const candidate =
    invoice.parent?.subscription_details?.subscription ?? invoice.subscription ?? null;
  if (!candidate) return null;
  return typeof candidate === 'string' ? candidate : (candidate.id ?? null);
}
