import { getStripe } from '@/lib/stripe';

export { isStripePaymentIntent } from './stripe-ids';

export type StripeRefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer';

/**
 * Reembolso TOTAL de un pedido cobrado con destination charge.
 *
 * - Se emite desde la plataforma (sin header stripeAccount): el cobro nació ahí.
 * - reverse_transfer: sin esto el restaurante se queda con la plata y el
 *   reembolso sale del saldo de MENIUS (Stripe no revierte el transfer solo).
 *   Con reverse_transfer, si la cuenta del restaurante no alcanza, Stripe
 *   rechaza el reembolso con un error en vez de dejarlo pendiente.
 * - refund_application_fee: false: Stripe no devuelve su tarifa de
 *   procesamiento en un reembolso, y el application fee es lo que la cubre.
 */
export function refundStripePayment(
  paymentIntentId: string,
  opts: { reason: StripeRefundReason; idempotencyKey?: string; metadata?: Record<string, string> },
) {
  return getStripe().refunds.create(
    {
      payment_intent: paymentIntentId,
      reason: opts.reason,
      reverse_transfer: true,
      refund_application_fee: false,
      ...(opts.metadata ? { metadata: opts.metadata } : {}),
    },
    opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
  );
}

/** Stripe responde esto si el cobro ya estaba devuelto: para nosotros es éxito. */
export function isAlreadyRefundedError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 'charge_already_refunded';
}
