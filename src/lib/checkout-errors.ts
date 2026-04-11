/**
 * User-facing checkout / order error strings.
 * Maps HTTP status + raw API messages to clear, localized copy.
 */

import type { Locale } from '@/lib/translations';

type Bilingual = { es: string; en: string };

function pick(locale: Locale, m: Bilingual): string {
  return locale === 'es' ? m.es : m.en;
}

/** Exact API error strings we normalize (server must stay stable or update this map). */
const ORDER_API_EXACT: Record<string, Bilingual> = {
  'Too many requests. Please try again in a minute.': {
    es: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    en: 'Too many requests. Please wait a minute and try again.',
  },
  'Invalid restaurant_id': {
    es: 'No se pudo identificar el restaurante. Recarga la página.',
    en: 'We could not identify the restaurant. Please reload the page.',
  },
  'Idempotency-Key too long (max 128 chars)': {
    es: 'Algo salió mal al enviar el pedido. Recarga la página e inténtalo de nuevo.',
    en: 'Something went wrong sending your order. Please reload and try again.',
  },
};

/** Substrings for technical errors — never show raw English to Spanish users. */
const ORDER_SUBSTRINGS: { test: (s: string) => boolean; msg: Bilingual }[] = [
  {
    test: (s) => s.includes('Invalid restaurant_id'),
    msg: ORDER_API_EXACT['Invalid restaurant_id']!,
  },
];

const PAYMENT_EXACT: Record<string, Bilingual> = {
  'Too many requests': {
    es: 'Demasiados intentos de pago. Espera un minuto e inténtalo de nuevo.',
    en: 'Too many payment attempts. Please wait a minute and try again.',
  },
  'Valid order_id required': {
    es: 'No se encontró el pedido. Vuelve al resumen e inténtalo de nuevo.',
    en: 'Order not found. Go back and try again.',
  },
  'slug required': {
    es: 'Error al preparar el pago. Recarga la página.',
    en: 'Could not prepare payment. Please reload the page.',
  },
  'Orden no encontrada': {
    es: 'No encontramos este pedido. Si ya pagaste, revisa tu correo o contacta al restaurante.',
    en: 'We could not find this order. If you already paid, check your email or contact the restaurant.',
  },
  'Este pedido ya fue pagado.': {
    es: 'Este pedido ya fue pagado.',
    en: 'This order was already paid.',
  },
  'El pago en línea no está disponible para este restaurante aún. Por favor paga en persona.': {
    es: 'El pago en línea no está disponible aún. Elige pago en persona o contacta al restaurante.',
    en: 'Online payment is not available yet. Pay in person or contact the restaurant.',
  },
};

function normalizePaymentRaw(raw: string, locale: Locale): string {
  const t = raw.trim();
  if (!t) return pick(locale, { es: 'No se pudo iniciar el pago. Intenta de nuevo.', en: 'Could not start payment. Please try again.' });

  if (PAYMENT_EXACT[t]) return pick(locale, PAYMENT_EXACT[t]);

  // Stripe / server sometimes returns English technical messages
  if (
    t.includes('No such checkout.session') ||
    t.includes('resource_missing') ||
    t.includes('Stripe')
  ) {
    return pick(locale, {
      es: 'El enlace de pago expiró o no es válido. Vuelve a intentar desde tu pedido.',
      en: 'The payment link expired or is invalid. Try again from your order.',
    });
  }

  // Already user-friendly Spanish from API
  if (locale === 'es') return t;

  // Short known Spanish strings → English for EN locale
  const esToEn: Record<string, string> = {
    'Orden no encontrada': 'We could not find this order.',
    'Este pedido ya fue pagado.': 'This order was already paid.',
    'Error creando sesión de pago': 'Could not create the payment session.',
  };
  if (esToEn[t]) return esToEn[t];

  return t;
}

/**
 * Error after POST /api/orders (place order).
 */
export function formatOrderSubmitError(
  status: number,
  apiError: string | undefined,
  locale: Locale
): string {
  const raw = (apiError ?? '').trim();

  if (raw && ORDER_API_EXACT[raw]) return pick(locale, ORDER_API_EXACT[raw]);
  for (const { test, msg } of ORDER_SUBSTRINGS) {
    if (test(raw)) return pick(locale, msg);
  }

  if (!raw) {
    if (status === 429) {
      return pick(locale, {
        es: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
        en: 'Too many attempts. Please wait a moment and try again.',
      });
    }
    if (status === 503) {
      return pick(locale, {
        es: 'El restaurante no puede tomar pedidos ahora. Intenta más tarde o programa tu pedido.',
        en: 'This restaurant cannot take orders right now. Try again later or schedule for later.',
      });
    }
    if (status === 403) {
      return pick(locale, {
        es: 'Tu sesión expiró. Recarga la página del menú e inténtalo de nuevo.',
        en: 'Your session expired. Reload the menu page and try again.',
      });
    }
    if (status === 404) {
      return pick(locale, {
        es: 'No encontramos el restaurante.',
        en: 'Restaurant not found.',
      });
    }
    if (status >= 500) {
      return pick(locale, {
        es: 'Error del servidor. Intenta de nuevo en unos minutos.',
        en: 'Server error. Please try again in a few minutes.',
      });
    }
    return pick(locale, {
      es: 'No se pudo enviar el pedido. Revisa tu conexión e inténtalo de nuevo.',
      en: 'Could not send your order. Check your connection and try again.',
    });
  }

  // Server often returns Spanish-only inventory/validation messages — keep as-is for es
  return raw;
}

/**
 * Error starting Stripe (or similar) checkout after order exists.
 */
export function formatPaymentStartError(
  status: number,
  apiError: string | undefined,
  locale: Locale
): string {
  const raw = (apiError ?? '').trim();
  const base = normalizePaymentRaw(raw, locale);

  if (!raw && status === 429) {
    return pick(locale, {
      es: 'Demasiados intentos de pago. Espera un minuto.',
      en: 'Too many payment attempts. Please wait a minute.',
    });
  }
  if (!raw && status >= 500) {
    return pick(locale, {
      es: 'No se pudo conectar con el sistema de pagos. Intenta de nuevo en un momento.',
      en: 'Could not reach the payment system. Please try again shortly.',
    });
  }
  if (!raw && status === 409) {
    return pick(locale, PAYMENT_EXACT['Este pedido ya fue pagado.']!);
  }

  return base;
}

/**
 * Safe JSON parse for fetch responses — avoids crashing on HTML error pages.
 */
export function safeParseJson<T = Record<string, unknown>>(text: string): { ok: true; data: T } | { ok: false } {
  if (!text || !text.trim()) return { ok: false };
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false };
  }
}
