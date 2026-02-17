import type { SupabaseClient } from '@supabase/supabase-js';

const SEED_CATEGORIES = [
  { name: 'Entradas', sort_order: 1 },
  { name: 'Platos Fuertes', sort_order: 2 },
  { name: 'Bebidas', sort_order: 3 },
  { name: 'Postres', sort_order: 4 },
];

const SEED_PRODUCTS: Record<string, Array<{ name: string; description: string; price: number }>> = {
  'Entradas': [
    {
      name: '[Ejemplo] Guacamole con Totopos',
      description: 'Guacamole fresco preparado al momento con aguacate, cilantro, cebolla y limón. Servido con totopos crujientes.',
      price: 8.99,
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
    },
    {
      name: '[Ejemplo] Pollo a la Plancha',
      description: 'Pechuga de pollo marinada a la plancha, servida con arroz, ensalada y vegetales de temporada.',
      price: 12.99,
    },
    {
      name: '[Ejemplo] Pasta Alfredo',
      description: 'Fettuccine en cremosa salsa alfredo con parmesano, acompañado de pan de ajo.',
      price: 13.50,
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
    },
  ],
};

const SEED_TABLES = [
  { name: 'Mesa 1' },
  { name: 'Mesa 2' },
  { name: 'Mesa 3' },
];

/**
 * Seeds a new restaurant with example categories, products, and tables
 * so the owner sees a populated menu and dashboard right away.
 */
export async function seedRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
  restaurantSlug: string,
  appUrl: string
) {
  try {
    // 1. Insert categories and get their IDs
    const categoryMap: Record<string, string> = {};

    for (const cat of SEED_CATEGORIES) {
      const { data } = await supabase
        .from('categories')
        .insert({
          restaurant_id: restaurantId,
          name: cat.name,
          sort_order: cat.sort_order,
          is_active: true,
        })
        .select('id, name')
        .single();

      if (data) {
        categoryMap[data.name] = data.id;
      }
    }

    // 2. Insert products for each category
    for (const [categoryName, products] of Object.entries(SEED_PRODUCTS)) {
      const categoryId = categoryMap[categoryName];
      if (!categoryId) continue;

      for (const product of products) {
        await supabase.from('products').insert({
          restaurant_id: restaurantId,
          category_id: categoryId,
          name: product.name,
          description: product.description,
          price: product.price,
          is_active: true,
        });
      }
    }

    // 3. Insert tables with QR values
    for (const table of SEED_TABLES) {
      const qrValue = `${appUrl}/r/${restaurantSlug}?table=${encodeURIComponent(table.name)}`;
      await supabase.from('tables').insert({
        restaurant_id: restaurantId,
        name: table.name,
        qr_code_value: qrValue,
      });
    }
  } catch {
    // Seed failure should not block restaurant creation
    console.error('Failed to seed restaurant data — continuing without seed.');
  }
}
