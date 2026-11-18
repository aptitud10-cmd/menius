import type { PaymentMethod } from '@/types';

interface PaymentRestaurant {
  payment_methods_enabled?: PaymentMethod[] | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | null;
  currency?: string | null;
  wompi_connected?: boolean | null;
}

/**
 * Métodos de pago que el comensal puede usar de verdad: 'online' solo cuenta
 * con Stripe Connect terminado o, en Colombia (COP), Wompi conectado (Stripe no
 * opera allí). Sin configurar → solo efectivo. Lo usan el checkout y el carrito
 * (aviso "solo efectivo" antes de llegar al checkout).
 */
export function usablePaymentMethods(r: PaymentRestaurant): PaymentMethod[] {
  const stripeReady = !!r.stripe_onboarding_complete && !!r.stripe_account_id;
  const wompiReady = r.currency?.toUpperCase() === 'COP' && !!r.wompi_connected;
  const methods = r.payment_methods_enabled?.length ? r.payment_methods_enabled : (['cash'] as PaymentMethod[]);
  return methods.filter((m) => m !== 'online' || stripeReady || wompiReady);
}
