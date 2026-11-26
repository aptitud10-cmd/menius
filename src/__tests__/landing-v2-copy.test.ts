import { describe, it, expect } from 'vitest';
import { calcKeep, getLandingV2Copy, resolveLandingV2Locale, usd, type LandingV2Copy } from '@/lib/landing-v2-copy';
import { PLANS } from '@/lib/plans';

/** Todas las rutas de texto del diccionario, con su valor. */
function leaves(obj: unknown, prefix = ''): [string, string][] {
  if (typeof obj === 'string') return [[prefix, obj]];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => leaves(v, `${prefix}[${i}]`));
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

describe('landing v2 — diccionario', () => {
  const en = getLandingV2Copy('en');
  const es = getLandingV2Copy('es');

  it('inglés por defecto; español solo con la cookie es', () => {
    expect(resolveLandingV2Locale(undefined)).toBe('en');
    expect(resolveLandingV2Locale('fr')).toBe('en');
    expect(resolveLandingV2Locale('es')).toBe('es');
  });

  it('EN y ES tienen exactamente las mismas claves y ninguna vacía', () => {
    const keys = (c: LandingV2Copy) => leaves(c).map(([k]) => k);
    expect(keys(es)).toEqual(keys(en));
    for (const [k, v] of [...leaves(en), ...leaves(es)]) expect(v.trim(), k).not.toBe('');
  });

  it('el texto en inglés es el de la maqueta aprobada', () => {
    expect(`${en.hero.h1} ${en.hero.h1Voice}`).toBe('Your own online ordering, without the app cut.');
    expect(en.story.h2).toBe('One order, start to finish.');
    expect(`${en.closing.h2} ${en.closing.h2Voice}`).toBe('The next order is yours.');
    expect(en.faq.items).toHaveLength(6);
  });

  it('el español usa tuteo, no voseo', () => {
    const text = leaves(es).map(([, v]) => v).join(' ');
    const words = new Set(text.toLowerCase().split(/[^a-záéíóúñü]+/));
    for (const vos of ['probá', 'pedí', 'hablá', 'tenés', 'podés', 'querés', 'mirá', 'elegí', 'empezá', 'cancelá', 'sos', 'vos']) {
      expect(words.has(vos), vos).toBe(false);
    }
  });

  it('los precios salen de plans.ts', () => {
    const pro = usd(PLANS.pro.price.monthly);
    expect(en.hero.leadWide).toContain(pro);
    expect(es.hero.leadWide).toContain(pro);
    expect(en.pricing.altBold).toContain(usd(PLANS.pro.price.annual));
  });
});

describe('landing v2 — calculadora', () => {
  it('reproduce la cuenta de la maqueta: $10,000 al 20% → $1,551; un tercio ≈ $418; equilibrio ≈ $880', () => {
    const r = calcKeep(10000, 20, 149);
    expect(Math.round(r.commission)).toBe(2000);
    expect(Math.round(r.card)).toBe(300);
    expect(Math.round(r.keep)).toBe(1551);
    expect(Math.round(r.third)).toBe(418);
    expect(r.breakeven).toBe(880);
  });

  it('formatea montos negativos con signo menos tipográfico', () => {
    expect(usd(-300)).toBe('−$300');
    expect(usd(1490)).toBe('$1,490');
  });
});
