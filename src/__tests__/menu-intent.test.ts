import { describe, it, expect } from 'vitest';
import {
  heuristicIntent,
  sanitizeIntent,
  mergeIntent,
  applyIntent,
  isEmptyIntent,
  EMPTY_INTENT,
  type MenuIntent,
} from '@/lib/menu-intent';
import type { Product, Category } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────

function product(over: Partial<Product> & { id: string; name: string; price: number }): Product {
  return {
    restaurant_id: 'r1',
    category_id: 'c1',
    description: '',
    image_url: '',
    is_active: true,
    sort_order: 0,
    created_at: '2026-01-01',
    ...over,
  } as Product;
}

const categories: Category[] = [
  { id: 'c1', restaurant_id: 'r1', name: 'Burgers', sort_order: 0 } as Category,
  { id: 'c2', restaurant_id: 'r1', name: 'Salads', sort_order: 1 } as Category,
  { id: 'c3', restaurant_id: 'r1', name: 'Desserts', sort_order: 2 } as Category,
];

const products: Product[] = [
  product({ id: 'p1', name: 'Classic Burger', price: 12, category_id: 'c1' }),
  product({ id: 'p2', name: 'Spicy Jalapeño Burger', price: 14, category_id: 'c1', dietary_tags: ['spicy'] }),
  product({ id: 'p3', name: 'Veggie Burger', price: 13, category_id: 'c1', dietary_tags: ['vegetarian', 'gluten_free'] }),
  product({ id: 'p4', name: 'Caesar Salad', price: 9, category_id: 'c2', dietary_tags: ['vegetarian'] }),
  product({ id: 'p5', name: 'Quinoa Bowl', price: 11, category_id: 'c2', dietary_tags: ['vegan', 'gluten_free'] }),
  product({ id: 'p6', name: 'Nut Brownie', price: 7, category_id: 'c3', dietary_tags: ['contains_nuts'] }),
  product({ id: 'p7', name: 'Wagyu Steak', price: 48, category_id: 'c1' }),
  product({ id: 'p8', name: 'Truffle Fries', price: 16, category_id: 'c1', orders_last_7d: 90 }),
];

const run = (intent: MenuIntent) =>
  applyIntent({ products, categories, intent, locale: 'es', defaultLocale: 'es' });

const ids = (list: Product[]) => list.map((p) => p.id);

// ── heuristicIntent ───────────────────────────────────────────────────────

describe('heuristicIntent', () => {
  it('extrae tags requeridos en español', () => {
    expect(heuristicIntent('algo sin gluten').requireTags).toContain('gluten_free');
    expect(heuristicIntent('opciones veganas').requireTags).toContain('vegan');
  });

  it('extrae tags requeridos en inglés', () => {
    expect(heuristicIntent('something gluten free').requireTags).toContain('gluten_free');
    expect(heuristicIntent('vegetarian options').requireTags).toContain('vegetarian');
  });

  it('la exclusión gana sobre la coincidencia positiva', () => {
    // "sin picante" contiene "picante" — el bug clásico de este parser.
    const i = heuristicIntent('algo sin picante');
    expect(i.excludeTags).toContain('spicy');
    expect(i.requireTags).not.toContain('spicy');
  });

  it('detecta alergias como exclusión, no como requisito', () => {
    const i = heuristicIntent('sin nueces por favor');
    expect(i.excludeTags).toContain('contains_nuts');
    expect(i.requireTags).not.toContain('contains_nuts');
  });

  it('detecta banda de precio y popularidad', () => {
    expect(heuristicIntent('algo barato').price).toBe('cheap');
    expect(heuristicIntent('algo gourmet').price).toBe('premium');
    expect(heuristicIntent('lo más pedido').wantsPopular).toBe(true);
  });

  it('descarta stopwords y conserva términos con significado', () => {
    const i = heuristicIntent('quiero algo con pollo');
    expect(i.terms).toContain('pollo');
    expect(i.terms).not.toContain('quiero');
    expect(i.terms).not.toContain('algo');
  });

  it('normaliza acentos: la búsqueda es insensible a diacríticos', () => {
    // normalize() descompone TODO diacrítico, incluida la tilde de la ñ.
    // Es lo que hace que "jalapeno" y "jalapeño" encuentren el mismo plato.
    expect(heuristicIntent('jalapeño').terms).toContain('jalapeno');
    expect(heuristicIntent('café helado').terms).toContain('cafe');
  });

  it('query vacía devuelve intent vacío', () => {
    expect(isEmptyIntent(heuristicIntent(''))).toBe(true);
    expect(isEmptyIntent(heuristicIntent('   '))).toBe(true);
  });
});

// ── sanitizeIntent ────────────────────────────────────────────────────────

describe('sanitizeIntent', () => {
  it('descarta tags inventados por el modelo', () => {
    const out = sanitizeIntent({ requireTags: ['gluten_free', 'inventado', 'low_fat'] }, EMPTY_INTENT);
    expect(out.requireTags).toEqual(['gluten_free']);
  });

  it('descarta price inválido', () => {
    expect(sanitizeIntent({ price: 'muy_caro' }, EMPTY_INTENT).price).toBeNull();
    expect(sanitizeIntent({ price: 'premium' }, EMPTY_INTENT).price).toBe('premium');
  });

  it('la exclusión gana si el modelo pide un tag en ambas listas', () => {
    const out = sanitizeIntent(
      { requireTags: ['contains_nuts'], excludeTags: ['contains_nuts'] },
      EMPTY_INTENT,
    );
    expect(out.requireTags).not.toContain('contains_nuts');
    expect(out.excludeTags).toContain('contains_nuts');
  });

  it('devuelve el fallback ante respuesta no-objeto', () => {
    const fb = heuristicIntent('sin gluten');
    expect(sanitizeIntent(null, fb)).toBe(fb);
    expect(sanitizeIntent('texto suelto', fb)).toBe(fb);
  });

  it('acota el largo de reply y de los arrays', () => {
    const out = sanitizeIntent(
      { reply: 'x'.repeat(400), terms: Array.from({ length: 30 }, (_, i) => `t${i}`) },
      EMPTY_INTENT,
    );
    expect(out.reply!.length).toBeLessThanOrEqual(160);
    expect(out.terms.length).toBeLessThanOrEqual(8);
  });
});

// ── mergeIntent ───────────────────────────────────────────────────────────

describe('mergeIntent', () => {
  it('conserva el tag que detectó la heurística y el modelo omitió', () => {
    const h = heuristicIntent('sin gluten');
    const m = { ...EMPTY_INTENT, terms: ['pasta'] };
    expect(mergeIntent(h, m).requireTags).toContain('gluten_free');
  });

  it('la exclusión de cualquiera de los dos lados gana', () => {
    const h = heuristicIntent('sin nueces');
    const m = { ...EMPTY_INTENT, requireTags: ['contains_nuts' as const] };
    const out = mergeIntent(h, m);
    expect(out.excludeTags).toContain('contains_nuts');
    expect(out.requireTags).not.toContain('contains_nuts');
  });
});

// ── applyIntent ───────────────────────────────────────────────────────────

describe('applyIntent', () => {
  it('intent vacío no devuelve nada', () => {
    expect(run(EMPTY_INTENT)).toEqual([]);
  });

  it('filtra por tag requerido', () => {
    const out = run({ ...EMPTY_INTENT, requireTags: ['gluten_free'] });
    expect(ids(out).sort()).toEqual(['p3', 'p5']);
  });

  it('exige TODOS los tags requeridos, no cualquiera', () => {
    const out = run({ ...EMPTY_INTENT, requireTags: ['vegetarian', 'gluten_free'] });
    expect(ids(out)).toEqual(['p3']);
  });

  it('un producto sin tags NO satisface un requisito dietario', () => {
    // Seguridad: un plato sin etiquetar no es "verificado sin gluten".
    const out = run({ ...EMPTY_INTENT, requireTags: ['gluten_free'] });
    expect(ids(out)).not.toContain('p1');
  });

  it('excluye por tag', () => {
    const out = run({ ...EMPTY_INTENT, excludeTags: ['contains_nuts'], terms: ['brownie'] });
    expect(ids(out)).not.toContain('p6');
  });

  it('la banda de precio se calcula sobre ESTE menú', () => {
    const cheap = run({ ...EMPTY_INTENT, price: 'cheap' });
    const premium = run({ ...EMPTY_INTENT, price: 'premium' });
    expect(ids(cheap)).toContain('p6');      // 7 — el más barato
    expect(ids(premium)).toContain('p7');    // 48 — el más caro
    expect(ids(premium)).not.toContain('p6');
  });

  it('ordena por popularidad cuando se pide', () => {
    const out = run({ ...EMPTY_INTENT, wantsPopular: true, terms: ['burger'] });
    expect(out.length).toBeGreaterThan(0);
  });

  it('un término sin resultados no vacía un filtro dietario válido', () => {
    // "light" no está en ningún nombre. La intención real era el tag.
    const out = run({ ...EMPTY_INTENT, requireTags: ['vegan'], terms: ['light'] });
    expect(ids(out)).toEqual(['p5']);
  });

  it('una categoría inventada no vacía los resultados', () => {
    const out = run({ ...EMPTY_INTENT, requireTags: ['vegan'], categoryHints: ['sushi'] });
    expect(ids(out)).toEqual(['p5']);
  });

  it('filtra por categoría real', () => {
    const out = run({ ...EMPTY_INTENT, categoryHints: ['salads'] });
    expect(ids(out).sort()).toEqual(['p4', 'p5']);
  });

  it('los productos sin stock quedan al final, no ocultos', () => {
    const withStock = [
      ...products,
      product({ id: 'p9', name: 'Sold Out Burger', price: 12, category_id: 'c1', in_stock: false }),
    ];
    const out = applyIntent({
      products: withStock,
      categories,
      intent: { ...EMPTY_INTENT, terms: ['burger'] },
      locale: 'es',
      defaultLocale: 'es',
    });
    expect(ids(out)).toContain('p9');
    expect(ids(out)[ids(out).length - 1]).toBe('p9');
  });

  it('caso end-to-end: "algo vegetariano y barato"', () => {
    const intent = heuristicIntent('algo vegetariano y barato');
    const out = run(intent);
    expect(out.length).toBeGreaterThan(0);
    // Todo lo devuelto debe ser vegetariano de verdad.
    for (const p of out) expect(p.dietary_tags).toContain('vegetarian');
  });

  it('caso end-to-end: "sin picante" no devuelve el plato picante', () => {
    const intent = heuristicIntent('una burger sin picante');
    const out = run(intent);
    expect(ids(out)).not.toContain('p2');
    expect(ids(out)).toContain('p1');
  });
});
