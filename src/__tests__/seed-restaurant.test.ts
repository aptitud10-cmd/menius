import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { convertSeedPrice, seedRestaurant } from '@/lib/seed-restaurant';

// ─── Cliente Supabase simulado: registra cada insert y devuelve ids falsos ───

type Row = Record<string, unknown>;

interface Recorder {
  client: SupabaseClient;
  inserts: Record<string, Row[]>;
  insertCalls: string[];
}

function createRecorder(): Recorder {
  const inserts: Record<string, Row[]> = {};
  const insertCalls: string[] = [];
  let seq = 0;

  const from = (table: string) => ({
    insert(payload: Row | Row[]) {
      const rows = (Array.isArray(payload) ? payload : [payload]).map((r) => ({ id: `${table}-${++seq}`, ...r }));
      insertCalls.push(table);
      (inserts[table] ??= []).push(...rows);
      const result = { data: null, error: null };
      return {
        select: () => Promise.resolve({ data: rows, error: null }),
        then: (resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject),
      };
    },
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  });

  return { client: { from } as unknown as SupabaseClient, inserts, insertCalls };
}

async function runSeed(locale: 'es' | 'en', currency: string) {
  const rec = createRecorder();
  await seedRestaurant(rec.client, 'rest-1', 'mi-tienda', 'https://menius.app', locale, currency);
  return rec;
}

function groupsOf(rec: Recorder, productName: string) {
  const product = rec.inserts.products.find((p) => p.name === productName);
  if (!product) throw new Error(`Producto no sembrado: ${productName}`);
  return (rec.inserts.modifier_groups ?? []).filter((g) => g.product_id === product.id);
}

function optionsOf(rec: Recorder, groupId: unknown) {
  return (rec.inserts.modifier_options ?? []).filter((o) => o.group_id === groupId);
}

const BANNED_GROUP_NAMES = ['opciones', 'options', 'variante', 'variantes', 'extras', 'estilo del huevo', 'egg style'];

// Productos que antes tenían `variants` (tabla legacy): ahora deben tener una
// pregunta obligatoria de una sola respuesta.
const FORMER_VARIANTS_ES = [
  'Chilaquiles Verdes', 'Hamburguesa Clásica', 'Tacos al Pastor', 'Pasta Alfredo', 'Pizza Margherita',
  'Filete de Res', 'Guacamole con Totopos', 'Alitas BBQ', 'Limonada Natural', 'Café de Olla', 'Margarita Clásica',
];
const FORMER_VARIANTS_EN = [
  'Classic Burger', 'Fish Tacos', 'Pasta Alfredo', 'Grilled Ribeye Steak', 'Margherita Pizza',
  'Buffalo Wings', 'Fresh-Squeezed Lemonade', 'House Coffee', 'Classic Margarita',
];

describe('convertSeedPrice', () => {
  it('MXN: ×18 redondeado al 5 más cercano', () => {
    expect(convertSeedPrice(16.99, 'MXN')).toBe(305);
    expect(convertSeedPrice(14.99, 'MXN')).toBe(270);
    expect(convertSeedPrice(1.5, 'MXN')).toBe(25);
    expect(convertSeedPrice(0.5, 'MXN')).toBe(10);
  });

  it('MXN: mínimo 5 para cualquier delta positivo', () => {
    expect(convertSeedPrice(0.1, 'MXN')).toBe(5);
    expect(convertSeedPrice(0.01, 'MXN')).toBe(5);
  });

  it('COP: ×4000 redondeado al 1000 más cercano, mínimo 1000', () => {
    expect(convertSeedPrice(16.99, 'COP')).toBe(68000);
    expect(convertSeedPrice(2.99, 'COP')).toBe(12000);
    expect(convertSeedPrice(0.5, 'COP')).toBe(2000);
    expect(convertSeedPrice(0.1, 'COP')).toBe(1000);
  });

  it('cero sigue siendo cero en todas las monedas', () => {
    expect(convertSeedPrice(0, 'MXN')).toBe(0);
    expect(convertSeedPrice(0, 'COP')).toBe(0);
    expect(convertSeedPrice(0, 'USD')).toBe(0);
  });

  it('otras monedas (o ninguna) no cambian', () => {
    expect(convertSeedPrice(16.99, 'USD')).toBe(16.99);
    expect(convertSeedPrice(16.99, 'EUR')).toBe(16.99);
    expect(convertSeedPrice(16.99, 'PEN')).toBe(16.99);
    expect(convertSeedPrice(16.99, '')).toBe(16.99);
    expect(convertSeedPrice(16.99, null)).toBe(16.99);
    expect(convertSeedPrice(16.99, undefined)).toBe(16.99);
  });

  it('acepta el código en minúsculas o con espacios', () => {
    expect(convertSeedPrice(16.99, 'mxn')).toBe(305);
    expect(convertSeedPrice(16.99, ' cop ')).toBe(68000);
  });

  it('bordes de redondeo: .5 del paso sube', () => {
    // 0.25 × 18 = 4.5 → 4.5 / 5 = 0.9 → 5
    expect(convertSeedPrice(0.25, 'MXN')).toBe(5);
    // 0.125 × 4000 = 500 → justo medio paso → 1000
    expect(convertSeedPrice(0.125, 'COP')).toBe(1000);
    // 0.375 × 4000 = 1500 → 2000
    expect(convertSeedPrice(0.375, 'COP')).toBe(2000);
  });

  it('negativos conservan el signo; NaN e Infinity pasan sin tocar', () => {
    expect(convertSeedPrice(-1.5, 'MXN')).toBe(-25);
    expect(convertSeedPrice(Number.NaN, 'MXN')).toBeNaN();
    expect(convertSeedPrice(Number.POSITIVE_INFINITY, 'COP')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('seedRestaurant (cliente simulado, sin DB)', () => {
  const cases = [
    { locale: 'es' as const, currency: 'MXN' },
    { locale: 'es' as const, currency: 'COP' },
    { locale: 'en' as const, currency: 'USD' },
  ];

  for (const { locale, currency } of cases) {
    describe(`${locale} + ${currency}`, () => {
      it('no escribe en las tablas legacy product_variants / product_extras', async () => {
        const rec = await runSeed(locale, currency);
        expect(rec.insertCalls).not.toContain('product_variants');
        expect(rec.insertCalls).not.toContain('product_extras');
        expect(rec.insertCalls).toEqual(
          expect.arrayContaining(['categories', 'products', 'modifier_groups', 'modifier_options', 'tables']),
        );
      });

      it('ningún grupo con nombre genérico ni "estilo del huevo"', async () => {
        const rec = await runSeed(locale, currency);
        const names = rec.inserts.modifier_groups.map((g) => String(g.name).trim().toLowerCase());
        for (const banned of BANNED_GROUP_NAMES) expect(names).not.toContain(banned);
      });

      it('cada grupo tiene opciones y cada opción apunta a un grupo existente', async () => {
        const rec = await runSeed(locale, currency);
        const groupIds = new Set(rec.inserts.modifier_groups.map((g) => g.id));
        for (const g of rec.inserts.modifier_groups) expect(optionsOf(rec, g.id).length).toBeGreaterThan(0);
        for (const o of rec.inserts.modifier_options) expect(groupIds.has(o.group_id)).toBe(true);
      });

      it('los adicionales son multi opcionales con max_select = número de opciones', async () => {
        const rec = await runSeed(locale, currency);
        const addOnName = locale === 'en' ? 'Add-ons' : 'Adicionales';
        const addOnGroups = rec.inserts.modifier_groups.filter((g) => g.name === addOnName);
        expect(addOnGroups.length).toBeGreaterThan(0);
        for (const g of addOnGroups) {
          expect(g.selection_type).toBe('multi');
          expect(g.is_required).toBe(false);
          expect(g.min_select).toBe(0);
          expect(g.max_select).toBe(optionsOf(rec, g.id).length);
        }
      });

      it('las preguntas obligatorias de una sola respuesta tienen exactamente una opción por defecto', async () => {
        const rec = await runSeed(locale, currency);
        const singles = rec.inserts.modifier_groups.filter((g) => g.is_required && g.selection_type === 'single');
        for (const g of singles) {
          expect(g.min_select).toBe(1);
          expect(g.max_select).toBe(1);
          expect(optionsOf(rec, g.id).filter((o) => o.is_default)).toHaveLength(1);
        }
      });

      it('sort_order de grupos es único por producto (enlace grupo → opciones)', async () => {
        const rec = await runSeed(locale, currency);
        const keys = rec.inserts.modifier_groups.map((g) => `${g.product_id}:${g.sort_order}`);
        expect(new Set(keys).size).toBe(keys.length);
      });
    });
  }

  it('categorías ES en el orden aprobado', async () => {
    const rec = await runSeed('es', 'MXN');
    expect(rec.inserts.categories.map((c) => c.name)).toEqual(
      ['Desayunos', 'Almuerzos', 'Cenas', 'Entradas', 'Bebidas', 'Bar', 'Postres'],
    );
  });

  it('categorías EN en el orden aprobado', async () => {
    const rec = await runSeed('en', 'USD');
    expect(rec.inserts.categories.map((c) => c.name)).toEqual(
      ['Breakfast', 'Lunch', 'Dinner', 'Appetizers', 'Beverages', 'Bar', 'Desserts'],
    );
  });

  it('cada categoría tiene productos y no hay nombres de producto repetidos', async () => {
    for (const [locale, currency] of [['es', 'MXN'], ['en', 'USD']] as const) {
      const rec = await runSeed(locale, currency);
      const names = rec.inserts.products.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
      for (const c of rec.inserts.categories) {
        expect(rec.inserts.products.some((p) => p.category_id === c.id)).toBe(true);
      }
    }
  });

  it('el omelette ya no pregunta el estilo del huevo', async () => {
    const es = await runSeed('es', 'MXN');
    expect(groupsOf(es, 'Omelette de Verduras').map((g) => g.name)).not.toContain('Estilo del huevo');
    const en = await runSeed('en', 'USD');
    expect(groupsOf(en, 'Western Omelette').map((g) => g.name)).not.toContain('Egg Style');
  });

  it('ES: cada producto que tenía variantes tiene una pregunta obligatoria de una sola respuesta', async () => {
    const rec = await runSeed('es', 'MXN');
    for (const name of FORMER_VARIANTS_ES) {
      const required = groupsOf(rec, name).filter((g) => g.is_required && g.selection_type === 'single');
      expect(required.length, name).toBeGreaterThan(0);
    }
  });

  it('EN: cada producto que tenía variantes tiene una pregunta obligatoria de una sola respuesta', async () => {
    const rec = await runSeed('en', 'USD');
    for (const name of FORMER_VARIANTS_EN) {
      const required = groupsOf(rec, name).filter((g) => g.is_required && g.selection_type === 'single');
      expect(required.length, name).toBeGreaterThan(0);
    }
  });

  it('precios convertidos: Pizza Margherita 16.99 USD → 305 MXN → 68000 COP', async () => {
    const mxn = await runSeed('es', 'MXN');
    const cop = await runSeed('es', 'COP');
    const pizzaMxn = mxn.inserts.products.find((p) => p.name === 'Pizza Margherita');
    const pizzaCop = cop.inserts.products.find((p) => p.name === 'Pizza Margherita');
    expect(pizzaMxn?.price).toBe(305);
    expect(pizzaCop?.price).toBe(68000);

    // Deltas de opción: Mediana +6.00 USD → +110 MXN → +24000 COP; Individual sigue en 0.
    const sizeMxn = groupsOf(mxn, 'Pizza Margherita').find((g) => g.name === 'Tamaño');
    const sizeCop = groupsOf(cop, 'Pizza Margherita').find((g) => g.name === 'Tamaño');
    expect(optionsOf(mxn, sizeMxn?.id).map((o) => o.price_delta)).toEqual([0, 110, 215]);
    expect(optionsOf(cop, sizeCop?.id).map((o) => o.price_delta)).toEqual([0, 24000, 48000]);
  });

  it('precios convertidos: adicionales (antes extras) también', async () => {
    const mxn = await runSeed('es', 'MXN');
    const cop = await runSeed('es', 'COP');
    const addMxn = groupsOf(mxn, 'Ensalada César').find((g) => g.name === 'Adicionales');
    const addCop = groupsOf(cop, 'Ensalada César').find((g) => g.name === 'Adicionales');
    // Pollo 3.00, Camarones 5.00
    expect(optionsOf(mxn, addMxn?.id).map((o) => o.price_delta)).toEqual([55, 90]);
    expect(optionsOf(cop, addCop?.id).map((o) => o.price_delta)).toEqual([12000, 20000]);
  });

  it('MXN y COP: todos los precios y deltas son enteros en el paso de su moneda', async () => {
    for (const [currency, step] of [['MXN', 5], ['COP', 1000]] as const) {
      const rec = await runSeed('es', currency);
      for (const p of rec.inserts.products) expect(Number(p.price) % step, String(p.name)).toBe(0);
      for (const o of rec.inserts.modifier_options) expect(Number(o.price_delta) % step, String(o.name)).toBe(0);
    }
  });

  it('USD: precios sin tocar', async () => {
    const rec = await runSeed('en', 'USD');
    expect(rec.inserts.products.find((p) => p.name === 'Margherita Pizza')?.price).toBe(18.99);
  });

  it('solo usa columnas que existen en supabase/schema.sql', async () => {
    const rec = await runSeed('es', 'MXN');
    const allowed: Record<string, string[]> = {
      modifier_groups: ['id', 'product_id', 'name', 'selection_type', 'min_select', 'max_select', 'is_required', 'sort_order', 'display_type'],
      modifier_options: ['id', 'group_id', 'name', 'price_delta', 'is_default', 'sort_order'],
    };
    for (const [table, cols] of Object.entries(allowed)) {
      for (const row of rec.inserts[table]) {
        for (const key of Object.keys(row)) expect(cols, `${table}.${key}`).toContain(key);
      }
    }
  });
});
