import type Stripe from 'stripe';

/**
 * ¿La cuenta Connect del restaurante ya puede cobrar con tarjeta?
 * Una sola regla para /api/connect/status (al abrir Configuración) y para el
 * webhook de Connect (cuando Stripe avisa un cambio), así no se contradicen.
 */
export function isConnectAccountReady(account: Pick<Stripe.Account, 'capabilities' | 'requirements'>): boolean {
  const readyToProcessPayments = account.capabilities?.card_payments === 'active';
  const onboardingComplete =
    !account.requirements?.currently_due?.length &&
    !account.requirements?.past_due?.length;
  return onboardingComplete && readyToProcessPayments;
}
