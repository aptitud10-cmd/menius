import type { PaymentMethod } from '@/types';
import { resolveCommission, type SubscriptionSnapshot } from '@/lib/order-pricing';

interface PaymentRestaurant {
  payment_methods_enabled?: PaymentMethod[] | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | null;
  currency?: string | null;
  wompi_connected?: boolean | null;
  /**
   * Derived server-side (not a DB column): false when the plan has no online
   * payments, so /api/orders would reject a card order with 403. Undefined means
   * the caller did not evaluate the plan (no plan gate applied).
   */
  online_payments_allowed?: boolean | null;
}

/**
 * Same plan rule /api/orders applies before accepting an online payment
 * (resolveCommission → isFreeTier): commission_plan, an active subscription,
 * past_due inside the grace window, or a valid trial.
 */
export function onlinePaymentsAllowedByPlan(
  commissionPlan: boolean,
  sub: SubscriptionSnapshot | null,
  now: Date = new Date(),
): boolean {
  return !resolveCommission(commissionPlan, sub, now).isFreeTier;
}

/**
 * Payment methods a customer can actually use. 'online' counts only with Stripe
 * Connect ready (or Wompi connected for COP, where Stripe does not operate) and
 * a plan that allows online payments. Nothing configured → cash only.
 * The result can be empty (an online-only store that cannot take cards right
 * now); the checkout then blocks the order with a clear message.
 * Used by the checkout and the cart.
 */
export function usablePaymentMethods(r: PaymentRestaurant): PaymentMethod[] {
  const stripeReady = !!r.stripe_onboarding_complete && !!r.stripe_account_id;
  const wompiReady = r.currency?.toUpperCase() === 'COP' && !!r.wompi_connected;
  const planAllows = r.online_payments_allowed !== false;
  const methods = r.payment_methods_enabled?.length ? r.payment_methods_enabled : (['cash'] as PaymentMethod[]);
  return methods.filter((m) => m !== 'online' || (planAllows && (stripeReady || wompiReady)));
}
