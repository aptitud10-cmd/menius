import type Stripe from 'stripe';

/**
 * ¿La cuenta Connect del restaurante ya puede cobrar con tarjeta?
 * Una sola regla para /api/connect/status (al abrir Configuración) y para el
 * webhook de Connect (cuando Stripe avisa un cambio), así no se contradicen.
 *
 * Se mira lo mismo que mira Stripe para dejar cobrar: charges_enabled, más las
 * dos capacidades que usa un destination charge (card_payments por
 * on_behalf_of, transfers por transfer_data). Antes también exigía
 * `currently_due` vacío: cuando Stripe pide un dato nuevo con plazo, sigue
 * dejando cobrar hasta la fecha límite, y nosotros apagábamos la tarjeta en el
 * acto. Si el plazo vence, Stripe apaga charges_enabled y el webhook lo refleja.
 */
export function isConnectAccountReady(
  account: Pick<Stripe.Account, 'charges_enabled' | 'capabilities'>,
): boolean {
  return account.charges_enabled === true
    && account.capabilities?.card_payments === 'active'
    && account.capabilities?.transfers === 'active';
}
