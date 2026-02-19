import type { SupabaseClient } from '@supabase/supabase-js';

const SEED_CATEGORIES = [
  { name: 'Entradas', sort_order: 1 },
  { name: 'Platos Fuertes', sort_order: 2 },
  { name: 'Bebidas', sort_order: 3 },
  { name: 'Postres', sort_order: 4 },
];

interface SeedProduct {
  name: string;
  description: string;
  price: number;
  variants?: Array<{ name: string; price_delta: number; sort_order: number }>;
  extras?: Array<{ name: string; price: number; sort_order: number }>;
}

const SEED_PRODUCTS: Record<string, SeedProduct[]> = {
  'Entradas': [
    {
      name: '[Ejemplo] Guacamole con Totopos',
      description: 'Guacamole fresco preparado al momento con aguacate, cilantro, cebolla y limón. Servido con totopos crujientes.',
      price: 8.99,
      variants: [
        { name: 'Individual', price_delta: 0, sort_order: 1 },
        { name: 'Para compartir', price_delta: 4.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Sopa del Día',
      description: 'Pregunta a tu mesero por la sopa del día. Preparada con ingredientes frescos de temporada.',
      price: 6.50,
    },
  ],
  'Platos Fuertes': [
    {
      name: '[Ejemplo] Hamburguesa Clásica',
      description: 'Carne de res 200g a la parrilla, lechuga, tomate, cebolla caramelizada, queso cheddar y papas fritas.',
      price: 14.99,
      variants: [
        { name: 'Sencilla', price_delta: 0, sort_order: 1 },
        { name: 'Doble carne', price_delta: 5.00, sort_order: 2 },
      ],
      extras: [
        { name: 'Tocino extra', price: 2.50, sort_order: 1 },
        { name: 'Aguacate', price: 2.00, sort_order: 2 },
        { name: 'Aros de cebolla', price: 3.00, sort_order: 3 },
      ],
    },
    {
      name: '[Ejemplo] Pollo a la Plancha',
      description: 'Pechuga de pollo marinada a la plancha, servida con arroz, ensalada y vegetales de temporada.',
      price: 12.99,
      extras: [
        { name: 'Porción extra de arroz', price: 2.00, sort_order: 1 },
        { name: 'Ensalada extra', price: 2.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Pasta Alfredo',
      description: 'Fettuccine en cremosa salsa alfredo con parmesano, acompañado de pan de ajo.',
      price: 13.50,
      variants: [
        { name: 'Sin proteína', price_delta: 0, sort_order: 1 },
        { name: 'Con pollo', price_delta: 3.00, sort_order: 2 },
        { name: 'Con camarones', price_delta: 5.00, sort_order: 3 },
      ],
    },
  ],
  'Bebidas': [
    {
      name: '[Ejemplo] Agua Natural / Mineral',
      description: 'Botella de agua purificada o mineral de 500ml.',
      price: 2.50,
    },
    {
      name: '[Ejemplo] Limonada Fresca',
      description: 'Limonada natural preparada al momento con hierbabuena.',
      price: 4.00,
      variants: [
        { name: 'Regular', price_delta: 0, sort_order: 1 },
        { name: 'Grande', price_delta: 1.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Refresco',
      description: 'Coca-Cola, Sprite, Fanta o agua mineral con gas.',
      price: 3.00,
    },
  ],
  'Postres': [
    {
      name: '[Ejemplo] Flan Napolitano',
      description: 'Flan casero con caramelo, receta tradicional.',
      price: 5.50,
    },
    {
      name: '[Ejemplo] Brownie con Helado',
      description: 'Brownie de chocolate caliente con helado de vainilla y salsa de chocolate.',
      price: 7.99,
      extras: [
        { name: 'Bola extra de helado', price: 2.00, sort_order: 1 },
        { name: 'Crema batida', price: 1.50, sort_order: 2 },
      ],
    },
  ],
};

const SEED_TABLES = [
  { name: 'Mesa 1' },
  { name: 'Mesa 2' },
  { name: 'Mesa 3' },
  { name: 'Mesa 4' },
  { name: 'Delivery' },
  { name: 'Para llevar' },
];

/**
 * Seeds a new restaurant with example categories, products, and tables
 * so the owner sees a populated menu and dashboard right away.
 * Uses batch inserts (5 queries total) instead of sequential ones for speed.
 */
export async function seedRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
  restaurantSlug: string,
  appUrl: string
) {
  try {
    // Query 1: Batch insert all categories
    const { data: categories } = await supabase
      .from('categories')
      .insert(SEED_CATEGORIES.map((c) => ({
        restaurant_id: restaurantId,
        name: c.name,
        sort_order: c.sort_order,
        is_active: true,
      })))
      .select('id, name');

    if (!categories?.length) return;

    const categoryMap: Record<string, string> = {};
    for (const c of categories) categoryMap[c.name] = c.id;

    // Query 2: Batch insert all products
    const productRows: Array<{
      restaurant_id: string;
      category_id: string;
      name: string;
      description: string;
      price: number;
      is_active: boolean;
      _key: string;
    }> = [];

    for (const [catName, products] of Object.entries(SEED_PRODUCTS)) {
      const catId = categoryMap[catName];
      if (!catId) continue;
      for (const p of products) {
        productRows.push({
          restaurant_id: restaurantId,
          category_id: catId,
          name: p.name,
          description: p.description,
          price: p.price,
          is_active: true,
          _key: p.name,
        });
      }
    }

    const { data: createdProducts } = await supabase
      .from('products')
      .insert(productRows.map(({ _key, ...row }) => row))
      .select('id, name');

    if (!createdProducts?.length) return;

    const productMap: Record<string, string> = {};
    for (const p of createdProducts) productMap[p.name] = p.id;

    // Flatten all variants and extras using the product IDs we just got
    const allVariants: Array<{ product_id: string; name: string; price_delta: number; sort_order: number }> = [];
    const allExtras: Array<{ product_id: string; name: string; price: number; sort_order: number }> = [];

    for (const products of Object.values(SEED_PRODUCTS)) {
      for (const p of products) {
        const productId = productMap[p.name];
        if (!productId) continue;

        if (p.variants) {
          for (const v of p.variants) {
            allVariants.push({ product_id: productId, name: v.name, price_delta: v.price_delta, sort_order: v.sort_order });
          }
        }
        if (p.extras) {
          for (const e of p.extras) {
            allExtras.push({ product_id: productId, name: e.name, price: e.price, sort_order: e.sort_order });
          }
        }
      }
    }

    // Query 3 & 4: Batch insert variants and extras in parallel
    await Promise.all([
      allVariants.length ? supabase.from('product_variants').insert(allVariants) : null,
      allExtras.length ? supabase.from('product_extras').insert(allExtras) : null,
    ]);

    // Query 5: Batch insert all tables
    await supabase.from('tables').insert(
      SEED_TABLES.map((t) => ({
        restaurant_id: restaurantId,
        name: t.name,
        qr_code_value: `${appUrl}/r/${restaurantSlug}?table=${encodeURIComponent(t.name)}`,
      }))
    );
  } catch {
    console.error('Failed to seed restaurant data — continuing without seed.');
  }
}
