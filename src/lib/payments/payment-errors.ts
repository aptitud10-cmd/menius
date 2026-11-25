/**
 * Stable error codes returned by the payment routes next to `error`.
 * `error` keeps its legacy text for older clients; UIs translate by `code`.
 */

type Bilingual = { es: string; en: string };

// Spanish when the locale is 'es' or missing; English for any other locale
// (same rule as checkout-errors.ts).
function pick(locale: string | null | undefined, m: Bilingual): string {
  return !locale || locale === 'es' ? m.es : m.en;
}

// ── Diner-facing: /api/payments/intent, /checkout, /wompi ────────────────────

export type PaymentErrorCode =
  | 'rate_limited'
  | 'invalid_request'
  | 'order_not_found'
  | 'cash_order'
  | 'already_paid'
  | 'order_closed'
  | 'invalid_amount'
  | 'online_unavailable'
  | 'wompi_only'
  | 'wompi_unavailable'
  | 'payment_start_failed';

const PAYMENT_ERROR_TEXT: Record<PaymentErrorCode, Bilingual> = {
  rate_limited: {
    es: 'Demasiados intentos de pago. Espera un minuto e inténtalo de nuevo.',
    en: 'Too many payment attempts. Wait a minute and try again.',
  },
  invalid_request: {
    es: 'No pudimos preparar el pago. Recarga la página e inténtalo de nuevo.',
    en: "We couldn't set up the payment. Reload the page and try again.",
  },
  order_not_found: {
    es: 'No encontramos este pedido. Si ya pagaste, revisa tu correo o llama al restaurante.',
    en: "We couldn't find this order. If you already paid, check your email or call the restaurant.",
  },
  cash_order: {
    es: 'Este pedido se paga en efectivo. Paga al recibirlo.',
    en: 'This order is paid in cash. Pay when you get your order.',
  },
  already_paid: {
    es: 'Este pedido ya está pagado. No tienes que hacer nada más.',
    en: 'This order is already paid. Nothing else to do.',
  },
  order_closed: {
    es: 'Este pedido ya no acepta pagos. Si necesitas ayuda, llama al restaurante.',
    en: 'This order can no longer be paid. Call the restaurant if you need help.',
  },
  invalid_amount: {
    es: 'El total de este pedido no es válido. Llama al restaurante.',
    en: "This order's total isn't valid. Please call the restaurant.",
  },
  online_unavailable: {
    es: 'Este restaurante todavía no acepta pagos en línea. Paga en persona.',
    en: "This restaurant doesn't take online payments yet. Please pay in person.",
  },
  wompi_only: {
    es: 'El pago en línea no está disponible ahora. Paga en persona o llama al restaurante.',
    en: "Online payment isn't available right now. Pay in person or call the restaurant.",
  },
  wompi_unavailable: {
    es: 'El pago en línea no está disponible ahora. Paga en persona o llama al restaurante.',
    en: "Online payment isn't available right now. Pay in person or call the restaurant.",
  },
  payment_start_failed: {
    es: 'No pudimos iniciar el pago. Inténtalo de nuevo en un momento.',
    en: "We couldn't start the payment. Please try again in a moment.",
  },
};

/** Localized text for a payment error code, or null when the code is unknown/missing. */
export function paymentErrorText(code: unknown, locale: string | null | undefined): string | null {
  if (typeof code !== 'string' || !Object.prototype.hasOwnProperty.call(PAYMENT_ERROR_TEXT, code)) return null;
  return pick(locale, PAYMENT_ERROR_TEXT[code as PaymentErrorCode]);
}

// ── Owner-facing: /api/payments/refund (shown by the Counter) ────────────────

export type RefundErrorCode =
  | 'unauthenticated'
  | 'invalid_request'
  | 'order_not_found'
  | 'not_paid'
  | 'already_cancelled'
  | 'cancel_failed'
  | 'stripe_rejected'
  | 'stripe_failed'
  | 'refund_not_saved'
  | 'internal_error';

const REFUND_ERROR_TEXT: Record<RefundErrorCode, Bilingual> = {
  unauthenticated: {
    es: 'Tu sesión expiró o no eres el dueño. Inicia sesión con la cuenta del dueño.',
    en: "Your session expired or you're not the owner. Sign in with the owner account.",
  },
  invalid_request: {
    es: 'No pudimos leer este pedido. Recarga la pantalla e inténtalo de nuevo.',
    en: "We couldn't read this order. Reload the screen and try again.",
  },
  order_not_found: {
    es: 'No encontramos este pedido. Recarga la pantalla.',
    en: "We couldn't find this order. Reload the screen.",
  },
  not_paid: {
    es: 'Este pedido no tiene un pago confirmado. Cancélalo sin reembolso.',
    en: "This order has no confirmed payment. Cancel it without a refund.",
  },
  already_cancelled: {
    es: 'Este pedido ya estaba cancelado.',
    en: 'This order was already cancelled.',
  },
  cancel_failed: {
    es: 'No pudimos cancelar el pedido. Inténtalo de nuevo.',
    en: "We couldn't cancel the order. Please try again.",
  },
  stripe_rejected: {
    es: 'Stripe rechazó el reembolso. Si tu saldo en Stripe no alcanza, espera nuevos pagos o contacta a soporte.',
    en: "Stripe declined the refund. If your Stripe balance is too low, wait for new payments or contact support.",
  },
  stripe_failed: {
    es: 'El reembolso falló en Stripe. Hazlo desde tu panel de Stripe.',
    en: 'The refund failed in Stripe. Issue it from your Stripe dashboard.',
  },
  refund_not_saved: {
    es: 'El reembolso se hizo en Stripe, pero el pedido no se actualizó. Contacta a soporte.',
    en: "The refund went through in Stripe, but the order wasn't updated. Contact support.",
  },
  internal_error: {
    es: 'No pudimos procesar el reembolso. Inténtalo de nuevo.',
    en: "We couldn't process the refund. Please try again.",
  },
};

/** Localized text for a refund error code, or null when the code is unknown/missing. */
export function refundErrorText(code: unknown, locale: string | null | undefined): string | null {
  if (typeof code !== 'string' || !Object.prototype.hasOwnProperty.call(REFUND_ERROR_TEXT, code)) return null;
  return pick(locale, REFUND_ERROR_TEXT[code as RefundErrorCode]);
}
