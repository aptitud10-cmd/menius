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

/**
 * Clave de idempotencia para un reembolso que se puede reintentar: cambia cada
 * hora (UTC). Stripe guarda 24 h la respuesta de una clave, errores incluidos:
 * con una clave fija o por día, un rechazo por saldo se "repetía" desde la
 * caché sin volver a intentarse hasta el día siguiente. Todos nuestros
 * reembolsos son totales, así que no se pueden duplicar: el segundo da
 * charge_already_refunded (Stripe cuenta también los pendientes).
 */
export function refundRetryKey(prefix: string, paymentIntentId: string, now = new Date()): string {
  return `${prefix}:${paymentIntentId}:${now.toISOString().slice(0, 13)}`;
}

/**
 * ¿Stripe ya intentó devolver este pago y el banco lo rechazó (tarjeta
 * cerrada, perdida, etc.)? Reintentar a la misma tarjeta vuelve a fallar: esos
 * casos los resuelve una persona (el webhook refund.failed avisa por email).
 */
export async function hasFailedRefund(paymentIntentId: string): Promise<boolean> {
  const refunds = await getStripe().refunds.list({ payment_intent: paymentIntentId, limit: 10 });
  return refunds.data.some((r) => r.status === 'failed');
}
