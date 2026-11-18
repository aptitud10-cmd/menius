/** Un PaymentIntent de Stripe (Wompi y Mercado Pago guardan otros ids). Sin dependencias: lo usan funciones puras. */
export function isStripePaymentIntent(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.startsWith('pi_');
}
