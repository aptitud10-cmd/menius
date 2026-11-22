import { describe, it, expect } from 'vitest';
import { isBigChange, parsePrice } from '@/lib/price-change';

describe('parsePrice (lo que escribe la persona en la tablet)', () => {
  it('acepta punto, coma, signo $ y enteros', () => {
    expect(parsePrice('13.95')).toBe(13.95);
    expect(parsePrice('13,95')).toBe(13.95);
    expect(parsePrice('$13.95')).toBe(13.95);
    expect(parsePrice(' 14 ')).toBe(14);
    expect(parsePrice('14.')).toBe(14);
    expect(parsePrice('0.5')).toBe(0.5);
  });

  it('rechaza lo que no es un precio', () => {
    for (const bad of ['', 'abc', '0', '0.00', '-3', '13.955', '1.395', '1.395.00', '100000000', '1e3', '13 95']) {
      expect(parsePrice(bad), bad).toBeNull();
    }
  });

  it('acepta precios de tiendas en pesos (5–6 cifras)', () => {
    expect(parsePrice('18000.00')).toBe(18000);
    expect(parsePrice('245000')).toBe(245000);
  });
});

describe('isBigChange (pide confirmar dos veces)', () => {
  it('más de ±50 % es grande', () => {
    expect(isBigChange(13.95, 1.395)).toBe(true); // el dedo gordo
    expect(isBigChange(10, 15.01)).toBe(true);
    expect(isBigChange(10, 4.99)).toBe(true);
  });

  it('un ajuste normal no', () => {
    expect(isBigChange(12.5, 13.95)).toBe(false);
    expect(isBigChange(10, 15)).toBe(false);
    expect(isBigChange(10, 5)).toBe(false);
  });
});
