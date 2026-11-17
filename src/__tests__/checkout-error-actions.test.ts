import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { errorActionFor } from '@/lib/checkout-errors';

describe('errorActionFor: cada error del pedido trae una salida', () => {
  it('fuera de zona → cambiar dirección', () => {
    expect(errorActionFor('OUT_OF_ZONE')).toBe('address');
  });

  it('cerrado ahora → programar; cerrado a esa hora → cambiar hora', () => {
    expect(errorActionFor('CLOSED_NOW')).toBe('schedule');
    expect(errorActionFor('CLOSED_AT_TIME')).toBe('when');
    expect(errorActionFor('SCHEDULE_TOO_SOON')).toBe('when');
  });

  it('plato agotado, fuera de horario, sin stock o retirado → revisar el pedido acá', () => {
    for (const c of ['PRODUCT_SOLD_OUT', 'PRODUCT_UNAVAILABLE', 'PRODUCT_OUT_OF_HOURS', 'STOCK_LIMIT']) {
      expect(errorActionFor(c), c).toBe('items');
    }
  });

  it('opciones de un plato → se editan en el carrito del menú', () => {
    for (const c of ['MODIFIERS_CHANGED', 'MODIFIER_MAX', 'MODIFIER_REQUIRED', 'OPTION_UNAVAILABLE']) {
      expect(errorActionFor(c), c).toBe('menu');
    }
  });

  it('sin código, código desconocido o PREPAY_REQUIRED (ya cambia el método solo) → sin botón', () => {
    expect(errorActionFor(undefined)).toBeNull();
    expect(errorActionFor(null)).toBeNull();
    expect(errorActionFor('WHATEVER')).toBeNull();
    expect(errorActionFor('PREPAY_REQUIRED')).toBeNull();
  });

  it('/api/orders sigue mandando los códigos que el checkout espera (guarda de regresión)', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/orders/route.ts'), 'utf8');
    for (const c of [
      'OUT_OF_ZONE', 'CLOSED_NOW', 'CLOSED_AT_TIME', 'SCHEDULE_TOO_SOON', 'PAUSED',
      'PRODUCT_SOLD_OUT', 'PRODUCT_UNAVAILABLE', 'PRODUCT_OUT_OF_HOURS', 'STOCK_LIMIT',
      'MODIFIERS_CHANGED', 'MODIFIER_MAX', 'MODIFIER_REQUIRED', 'OPTION_UNAVAILABLE',
    ]) {
      expect(src, c).toContain(`code: "${c}"`);
    }
  });
});
