import { describe, it, expect } from 'vitest';
import { formatOrderSubmitError } from '@/lib/checkout-errors';

describe('formatOrderSubmitError', () => {
  it('never shows the raw Spanish 500 text to an English diner', () => {
    for (const raw of ['Error interno', 'Error guardando items', 'No se pudo crear la orden. Intenta de nuevo.']) {
      const msg = formatOrderSubmitError(500, raw, 'en');
      expect(msg).toBe("We couldn't send your order. Nothing was charged — please try again.");
    }
  });

  it('localizes the 500 message in Spanish too', () => {
    expect(formatOrderSubmitError(500, 'Error interno', 'es')).toBe(
      'No pudimos enviar tu pedido. No se cobró nada: inténtalo de nuevo.',
    );
  });

  it('keeps the server message for paused/closed (503) and payment start (502)', () => {
    const closed = 'This restaurant is currently closed. You can schedule an order for later.';
    expect(formatOrderSubmitError(503, closed, 'en')).toBe(closed);
    const pay = 'Payment could not be initialized. Please try again or choose a different payment method.';
    expect(formatOrderSubmitError(502, pay, 'en')).toBe(pay);
  });
});
