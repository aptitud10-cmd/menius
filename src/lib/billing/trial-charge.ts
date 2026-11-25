import { getPlanByStripePrice, getIntervalByStripePrice } from '@/lib/plans';

/**
 * Fecha y monto del primer cobro para quien se suscribió durante la prueba
 * (Stripe deja la suscripción en trialing y cobra solo al terminar).
 */
export function trialChargeNotice(
  trialEndIso: string,
  stripePriceId: string | null,
  en: boolean,
  timezone?: string | null,
): { chargeDateLabel: string; amountLabel: string } {
  const plan = stripePriceId ? getPlanByStripePrice(stripePriceId) : null;
  const annual = stripePriceId ? getIntervalByStripePrice(stripePriceId) === 'annual' : false;
  const price = plan ? (annual ? plan.price.annual : plan.price.monthly) : null;
  const amountLabel = price
    ? `$${price.toLocaleString('en-US')}${annual ? (en ? '/yr' : '/año') : (en ? '/mo' : '/mes')}`
    : (en ? 'your Pro plan' : 'tu plan Pro');
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const locale = en ? 'en-US' : 'es-MX';
  let chargeDateLabel: string;
  try {
    chargeDateLabel = new Date(trialEndIso).toLocaleDateString(locale, { ...opts, ...(timezone ? { timeZone: timezone } : {}) });
  } catch {
    chargeDateLabel = new Date(trialEndIso).toLocaleDateString(locale, opts);
  }
  return { chargeDateLabel, amountLabel };
}
