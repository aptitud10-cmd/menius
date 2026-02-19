import type { SupabaseClient } from '@supabase/supabase-js';

const SEED_CATEGORIES = [
  { name: 'Desayunos', sort_order: 1 },
  { name: 'Almuerzos', sort_order: 2 },
  { name: 'Cenas', sort_order: 3 },
  { name: 'Aperitivos', sort_order: 4 },
  { name: 'Bebidas', sort_order: 5 },
  { name: 'Licores', sort_order: 6 },
  { name: 'Tortas', sort_order: 7 },
];

interface SeedProduct {
  name: string;
  description: string;
  price: number;
  variants?: Array<{ name: string; price_delta: number; sort_order: number }>;
  extras?: Array<{ name: string; price: number; sort_order: number }>;
}

const SEED_PRODUCTS: Record<string, SeedProduct[]> = {
  Desayunos: [
    {
      name: '[Ejemplo] Chilaquiles Verdes',
      description: 'Totopos bañados en salsa verde con crema, queso fresco, cebolla y huevo estrellado.',
      price: 8.99,
      variants: [
        { name: 'Con huevo estrellado', price_delta: 0, sort_order: 1 },
        { name: 'Con pollo deshebrado', price_delta: 3.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Huevos Rancheros',
      description: 'Huevos estrellados sobre tortilla con salsa roja, frijoles refritos y aguacate.',
      price: 7.99,
    },
    {
      name: '[Ejemplo] Hot Cakes',
      description: 'Tres hot cakes esponjosos con miel de maple, mantequilla y fruta fresca.',
      price: 6.99,
      extras: [
        { name: 'Nutella', price: 1.50, sort_order: 1 },
        { name: 'Plátano extra', price: 1.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Molletes Especiales',
      description: 'Bolillo abierto con frijoles refritos, queso gratinado, pico de gallo y aguacate.',
      price: 6.50,
    },
    {
      name: '[Ejemplo] Omelette de Verduras',
      description: 'Omelette relleno de champiñones, espinaca, pimiento y queso manchego.',
      price: 8.50,
      extras: [
        { name: 'Extra queso', price: 1.50, sort_order: 1 },
        { name: 'Tocino', price: 2.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Avena con Frutas',
      description: 'Avena caliente con leche, miel, granola, fresas y arándanos.',
      price: 5.99,
    },
  ],
  Almuerzos: [
    {
      name: '[Ejemplo] Hamburguesa Clásica',
      description: 'Carne de res 200g a la parrilla, lechuga, tomate, cebolla caramelizada, queso cheddar y papas.',
      price: 14.99,
      variants: [
        { name: 'Sencilla', price_delta: 0, sort_order: 1 },
        { name: 'Doble carne', price_delta: 5.00, sort_order: 2 },
      ],
      extras: [
        { name: 'Tocino', price: 2.50, sort_order: 1 },
        { name: 'Aguacate', price: 2.00, sort_order: 2 },
        { name: 'Aros de cebolla', price: 3.00, sort_order: 3 },
      ],
    },
    {
      name: '[Ejemplo] Pollo a la Plancha',
      description: 'Pechuga marinada a la plancha con arroz, ensalada y vegetales de temporada.',
      price: 12.99,
    },
    {
      name: '[Ejemplo] Ensalada César',
      description: 'Lechuga romana, crutones, parmesano y aderezo césar casero.',
      price: 10.99,
      extras: [
        { name: 'Con pollo', price: 3.00, sort_order: 1 },
        { name: 'Con camarones', price: 5.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Tacos al Pastor',
      description: 'Tres tacos de cerdo adobado con piña, cilantro y cebolla. Tortillas hechas a mano.',
      price: 9.99,
      variants: [
        { name: '3 piezas', price_delta: 0, sort_order: 1 },
        { name: '5 piezas', price_delta: 4.00, sort_order: 2 },
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
    {
      name: '[Ejemplo] Club Sándwich',
      description: 'Triple piso con pollo, tocino, lechuga, tomate, aguacate y papas a la francesa.',
      price: 11.99,
    },
  ],
  Cenas: [
    {
      name: '[Ejemplo] Salmón a la Parrilla',
      description: 'Filete de salmón con costra de hierbas, puré de camote y verduras salteadas.',
      price: 22.99,
    },
    {
      name: '[Ejemplo] Pizza Margherita',
      description: 'Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca.',
      price: 16.99,
      variants: [
        { name: 'Individual', price_delta: 0, sort_order: 1 },
        { name: 'Mediana', price_delta: 6.00, sort_order: 2 },
        { name: 'Familiar', price_delta: 12.00, sort_order: 3 },
      ],
    },
    {
      name: '[Ejemplo] Filete de Res',
      description: 'Corte grueso de res a la parrilla con puré de papa, espárragos y salsa de vino tinto.',
      price: 26.99,
      variants: [
        { name: 'Término medio', price_delta: 0, sort_order: 1 },
        { name: 'Bien cocido', price_delta: 0, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Enchiladas Suizas',
      description: 'Tortillas rellenas de pollo bañadas en salsa verde con crema y queso gratinado.',
      price: 13.99,
    },
    {
      name: '[Ejemplo] Sopa de Tortilla',
      description: 'Caldo de jitomate con tiras de tortilla, aguacate, crema, queso y chile pasilla.',
      price: 8.99,
    },
    {
      name: '[Ejemplo] Quesadillas de Flor de Calabaza',
      description: 'Tortillas de maíz rellenas de flor de calabaza, queso Oaxaca y epazote.',
      price: 9.99,
    },
  ],
  Aperitivos: [
    {
      name: '[Ejemplo] Guacamole con Totopos',
      description: 'Guacamole fresco preparado al momento con aguacate, cilantro, cebolla y limón.',
      price: 8.99,
      variants: [
        { name: 'Individual', price_delta: 0, sort_order: 1 },
        { name: 'Para compartir', price_delta: 4.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Ceviche de Camarón',
      description: 'Camarones frescos marinados en limón con pepino, cebolla morada y aguacate.',
      price: 12.99,
    },
    {
      name: '[Ejemplo] Nachos Supremos',
      description: 'Totopos con queso fundido, jalapeños, crema, guacamole y pico de gallo.',
      price: 10.99,
      extras: [
        { name: 'Con pollo', price: 3.50, sort_order: 1 },
        { name: 'Con carne', price: 4.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Empanadas de Queso',
      description: 'Tres empanadas crujientes rellenas de queso con salsa ranchera.',
      price: 7.99,
    },
    {
      name: '[Ejemplo] Aros de Cebolla',
      description: 'Aros de cebolla empanizados y crujientes con dip de chipotle.',
      price: 6.99,
    },
    {
      name: '[Ejemplo] Alitas BBQ',
      description: 'Alitas de pollo bañadas en salsa barbecue, servidas con apio y aderezo ranch.',
      price: 11.99,
      variants: [
        { name: '6 piezas', price_delta: 0, sort_order: 1 },
        { name: '12 piezas', price_delta: 6.00, sort_order: 2 },
      ],
    },
  ],
  Bebidas: [
    {
      name: '[Ejemplo] Limonada Natural',
      description: 'Limonada recién exprimida con hierbabuena y hielo.',
      price: 4.00,
      variants: [
        { name: 'Regular', price_delta: 0, sort_order: 1 },
        { name: 'Grande', price_delta: 1.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Café de Olla',
      description: 'Café de grano con piloncillo y canela, estilo tradicional.',
      price: 3.50,
      variants: [
        { name: 'Caliente', price_delta: 0, sort_order: 1 },
        { name: 'Frío', price_delta: 0.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Agua de Horchata',
      description: 'Agua fresca de arroz con canela y un toque de vainilla.',
      price: 3.50,
    },
    {
      name: '[Ejemplo] Jugo Natural',
      description: 'Jugo recién exprimido de naranja, zanahoria o verde.',
      price: 4.50,
    },
    {
      name: '[Ejemplo] Refresco',
      description: 'Coca-Cola, Sprite, Fanta o agua mineral con gas.',
      price: 2.99,
    },
    {
      name: '[Ejemplo] Agua Mineral',
      description: 'Botella de agua purificada o mineral de 500ml.',
      price: 2.50,
    },
  ],
  Licores: [
    {
      name: '[Ejemplo] Margarita Clásica',
      description: 'Tequila, triple sec, jugo de limón y sal en el borde.',
      price: 9.99,
      variants: [
        { name: 'Natural', price_delta: 0, sort_order: 1 },
        { name: 'De mango', price_delta: 1.50, sort_order: 2 },
        { name: 'De tamarindo', price_delta: 1.50, sort_order: 3 },
      ],
    },
    {
      name: '[Ejemplo] Cerveza Artesanal',
      description: 'Selección de cervezas artesanales locales. Pregunta por la carta.',
      price: 6.99,
    },
    {
      name: '[Ejemplo] Mezcal Oaxaqueño',
      description: 'Mezcal joven artesanal servido con naranja y sal de gusano.',
      price: 8.99,
    },
    {
      name: '[Ejemplo] Mojito',
      description: 'Ron blanco, hierbabuena fresca, limón, azúcar y soda.',
      price: 8.99,
    },
    {
      name: '[Ejemplo] Copa de Vino Tinto',
      description: 'Selección de vino tinto de casa. Consulta nuestras opciones.',
      price: 7.99,
    },
    {
      name: '[Ejemplo] Michelada Clásica',
      description: 'Cerveza con jugo de limón, sal, salsa picante y chamoy.',
      price: 6.99,
    },
  ],
  Tortas: [
    {
      name: '[Ejemplo] Flan Napolitano',
      description: 'Flan cremoso de vainilla con caramelo casero.',
      price: 5.50,
    },
    {
      name: '[Ejemplo] Churros con Chocolate',
      description: 'Churros crujientes espolvoreados con azúcar y canela, con salsa de chocolate belga.',
      price: 5.99,
      extras: [
        { name: 'Bola de helado', price: 2.00, sort_order: 1 },
        { name: 'Cajeta', price: 1.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Pastel de Tres Leches',
      description: 'Bizcocho empapado en leche condensada, evaporada y crema, decorado con fresas.',
      price: 6.99,
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
    {
      name: '[Ejemplo] Helado Artesanal',
      description: 'Dos bolas de helado artesanal. Sabores: vainilla, chocolate, fresa o mango.',
      price: 4.99,
    },
    {
      name: '[Ejemplo] Pay de Queso',
      description: 'Pay de queso estilo New York con base de galleta y mermelada de frutos rojos.',
      price: 6.99,
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

export async function seedRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
  restaurantSlug: string,
  appUrl: string
) {
  try {
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

    await Promise.all([
      allVariants.length ? supabase.from('product_variants').insert(allVariants) : null,
      allExtras.length ? supabase.from('product_extras').insert(allExtras) : null,
    ]);

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
