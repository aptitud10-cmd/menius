import { describe, it, expect } from 'vitest';
import { contrast } from '@/lib/color-contrast';
import { normalizeBrandColor, trackerBrand, TRACKER_NEUTRAL } from '@/lib/tracker-brand';

describe('trackerBrand', () => {
  it('usa el color del restaurante cuando se lee sobre blanco', () => {
    const b = trackerBrand('#b8336a');
    expect(b.brand).toBe('#B8336A');
    expect(b.fallback).toBe(false);
    expect(b.ink).toBe('#FFFFFF');
  });

  it('sin color o con un color ilegible cae a tinta neutra, nunca al verde de los botones', () => {
    for (const raw of [null, undefined, '', 'rojo', '#05c8a7', '#f4d58d', '#fff']) {
      const b = trackerBrand(raw as string | null | undefined);
      expect(b.brand).toBe(TRACKER_NEUTRAL);
      expect(b.fallback).toBe(true);
    }
  });

  it('todo color aceptado cumple 3:1 sobre blanco y su texto 4.5:1 sobre el color', () => {
    for (const raw of ['#1b2a4a', '#a3271c', '#b8336a', '#047a65', '#6d28d9', '#767676', '#000000']) {
      const b = trackerBrand(raw);
      expect(contrast(b.brand, '#FFFFFF')).toBeGreaterThanOrEqual(3);
      expect(contrast(b.ink, b.brand)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('normaliza lo que llega del panel', () => {
    expect(normalizeBrandColor(' #b8336a ')).toBe('#B8336A');
    expect(normalizeBrandColor('#b8336')).toBeNull();
    expect(normalizeBrandColor(42)).toBeNull();
  });
});
