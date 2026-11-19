import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const logger = createLogger('seed-restaurant');

// ─────────────────────────────────────────────────────────────────────────────
// Menú de ejemplo que recibe cada restaurante nuevo al registrarse.
//
// Todo va como modifier_groups / modifier_options (el editor de productos dejó
// de usar product_variants / product_extras en agosto 2026). Los precios están
// escritos en USD y se convierten a la moneda del restaurante con
// convertSeedPrice() al insertar.
// ─────────────────────────────────────────────────────────────────────────────

interface SeedModifierOption {
  name: string;
  price_delta: number;
  is_default: boolean;
}

export interface SeedModifierGroup {
  name: string;
  selection_type: 'single' | 'multi';
  is_required: boolean;
  min_select: number;
  max_select: number;
  display_type: 'list' | 'grid';
  options: SeedModifierOption[];
}

interface SeedProduct {
  name: string;
  description: string;
  /** Precio base en USD. */
  price: number;
  image_url: string;
  modifier_groups?: SeedModifierGroup[];
}

/** [nombre, price_delta en USD] */
type Opt = readonly [name: string, priceDelta: number];

function toOptions(list: readonly Opt[], defaultIndex: number | null): SeedModifierOption[] {
  return list.map(([name, price_delta], i) => ({ name, price_delta, is_default: i === defaultIndex }));
}

/** Pregunta obligatoria con una sola respuesta (lo que antes eran "variantes"). */
function pick(
  name: string,
  list: readonly Opt[],
  { defaultIndex = 0, display = 'grid' }: { defaultIndex?: number; display?: 'list' | 'grid' } = {},
): SeedModifierGroup {
  return {
    name,
    selection_type: 'single',
    is_required: true,
    min_select: 1,
    max_select: 1,
    display_type: display,
    options: toOptions(list, defaultIndex),
  };
}

/** Pregunta opcional con una sola respuesta. */
function pickOptional(
  name: string,
  list: readonly Opt[],
  { defaultIndex = null, display = 'grid' }: { defaultIndex?: number | null; display?: 'list' | 'grid' } = {},
): SeedModifierGroup {
  return {
    name,
    selection_type: 'single',
    is_required: false,
    min_select: 0,
    max_select: 1,
    display_type: display,
    options: toOptions(list, defaultIndex),
  };
}

/** Obligatoria con varias respuestas (p. ej. sabores de helado). */
function pickMany(name: string, list: readonly Opt[], min: number, max: number): SeedModifierGroup {
  return {
    name,
    selection_type: 'multi',
    is_required: true,
    min_select: min,
    max_select: max,
    display_type: 'grid',
    options: toOptions(list, null),
  };
}

/** Adicionales opcionales (lo que antes eran "extras"): se puede marcar cualquiera. */
function addOns(name: string, list: readonly Opt[]): SeedModifierGroup {
  return {
    name,
    selection_type: 'multi',
    is_required: false,
    min_select: 0,
    max_select: list.length,
    display_type: 'list',
    options: toOptions(list, null),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversión de precios
// ─────────────────────────────────────────────────────────────────────────────

const PRICE_RULES: Record<string, { rate: number; step: number }> = {
  MXN: { rate: 18, step: 5 },
  COP: { rate: 4000, step: 1000 },
};

/**
 * Convierte un precio de ejemplo escrito en USD a la moneda del restaurante.
 * - MXN: ×18, redondeado al múltiplo de 5 más cercano (mínimo 5 si es positivo).
 * - COP: ×4000, redondeado al múltiplo de 1000 más cercano (mínimo 1000 si es positivo).
 * - Cualquier otra moneda: sin cambios.
 * Cero sigue siendo cero.
 */
export function convertSeedPrice(usd: number, currency: string | null | undefined): number {
  if (!Number.isFinite(usd) || usd === 0) return usd;
  const rule = PRICE_RULES[(currency ?? '').trim().toUpperCase()];
  if (!rule) return usd;
  const sign = usd < 0 ? -1 : 1;
  // toFixed(6) evita que 0.1 * 18 = 1.8000000000000003 cambie el redondeo en un borde.
  const raw = Number((Math.abs(usd) * rule.rate).toFixed(6));
  const rounded = Math.round(raw / rule.step) * rule.step;
  return sign * Math.max(rule.step, rounded);
}

// --------------- SPANISH ---------------

export const SEED_CATEGORIES_ES = [
  { name: 'Desayunos', sort_order: 1 },
  { name: 'Almuerzos', sort_order: 2 },
  { name: 'Cenas', sort_order: 3 },
  { name: 'Entradas', sort_order: 4 },
  { name: 'Bebidas', sort_order: 5 },
  { name: 'Bar', sort_order: 6 },
  { name: 'Postres', sort_order: 7 },
];

const TERMINO_ES: readonly Opt[] = [
  ['Poco cocido', 0],
  ['Término medio', 0],
  ['Tres cuartos', 0],
  ['Bien cocido', 0],
];

export const SEED_PRODUCTS_ES: Record<string, SeedProduct[]> = {
  Desayunos: [
    {
      name: 'Chilaquiles Verdes',
      description: 'Totopos bañados en salsa verde con crema, queso fresco y cebolla. Con huevo estrellado o pollo deshebrado.',
      price: 8.99,
      image_url: '/seed/es/chilaquiles.webp',
      modifier_groups: [
        pick('¿Con qué los quieres?', [['Con huevo estrellado', 0], ['Con pollo deshebrado', 3.0]], { display: 'list' }),
      ],
    },
    {
      name: 'Huevos Rancheros',
      description: 'Huevos estrellados sobre tortilla con salsa roja, frijoles refritos y aguacate.',
      price: 7.99,
      image_url: '/seed/es/huevos-rancheros.webp',
    },
    {
      name: 'Pancakes con Fruta',
      description: 'Tres pancakes esponjosos con miel de maple, mantequilla y fruta fresca.',
      price: 6.99,
      image_url: '/seed/es/hotcakes.webp',
      modifier_groups: [
        addOns('Adicionales', [['Nutella', 1.5], ['Fresas extra', 1.0]]),
      ],
    },
    {
      name: 'Molletes Especiales',
      description: 'Bolillo abierto con frijoles refritos, queso gratinado, pico de gallo y aguacate.',
      price: 6.5,
      image_url: '/seed/es/molletes.webp',
    },
    {
      name: 'Omelette de Verduras',
      description: 'Omelette de tres huevos con champiñones, espinaca y pimiento, con el queso que prefieras.',
      price: 8.5,
      image_url: '/seed/es/omelette.webp',
      modifier_groups: [
        pick('Queso', [['Manchego', 0], ['Cheddar', 0], ['Oaxaca', 0], ['Mozzarella', 0]]),
        pickOptional('Agrega proteína', [['Tocino', 2.5], ['Jamón', 2.0], ['Chorizo', 2.5]], { display: 'list' }),
      ],
    },
    {
      name: 'Avena con Frutas',
      description: 'Avena caliente con leche, miel, granola, fresas y arándanos.',
      price: 5.99,
      image_url: '/seed/es/avena.webp',
    },
  ],
  Almuerzos: [
    {
      name: 'Hamburguesa Clásica',
      description: 'Carne de res de 200 g a la parrilla con queso, lechuga, tomate y cebolla caramelizada. Con papas fritas.',
      price: 14.99,
      image_url: '/seed/es/hamburguesa.webp',
      modifier_groups: [
        pick('¿Sencilla o doble?', [['Sencilla', 0], ['Doble', 5.0]]),
        pick('Término', TERMINO_ES, { defaultIndex: 1 }),
        pickOptional('Queso', [['Cheddar', 0], ['Americano', 0], ['Suizo', 0], ['Pepper Jack', 1.0]], { defaultIndex: 0 }),
        addOns('Adicionales', [['Tocino', 2.5], ['Aguacate', 2.0], ['Aros de cebolla', 3.0]]),
      ],
    },
    {
      name: 'Pollo a la Plancha',
      description: 'Pechuga marinada a la plancha con arroz, ensalada y vegetales de temporada.',
      price: 12.99,
      image_url: '/seed/es/pollo.webp',
    },
    {
      name: 'Ensalada César',
      description: 'Lechuga romana, crutones, parmesano y aderezo César casero.',
      price: 10.99,
      image_url: '/seed/es/ensalada.webp',
      modifier_groups: [
        addOns('Adicionales', [['Pollo', 3.0], ['Camarones', 5.0]]),
      ],
    },
    {
      name: 'Tacos al Pastor',
      description: 'Tacos de cerdo adobado con piña, cilantro y cebolla, en tortillas hechas a mano.',
      price: 9.99,
      image_url: '/seed/es/tacos.webp',
      modifier_groups: [
        pick('¿Cuántos tacos?', [['3 tacos', 0], ['5 tacos', 4.0]]),
      ],
    },
    {
      name: 'Pasta Alfredo',
      description: 'Fettuccine en salsa Alfredo cremosa con parmesano, acompañado de pan de ajo.',
      price: 13.5,
      image_url: '/seed/es/pasta.webp',
      modifier_groups: [
        pick('Proteína', [['Sin proteína', 0], ['Pollo', 3.0], ['Camarones', 5.0]]),
      ],
    },
    {
      name: 'Club Sándwich',
      description: 'Sándwich de tres pisos con pollo, tocino, lechuga, tomate y aguacate. Con papas fritas.',
      price: 11.99,
      image_url: '/seed/es/club-sandwich.webp',
    },
  ],
  Cenas: [
    {
      name: 'Salmón a la Parrilla',
      description: 'Filete de salmón con costra de hierbas, puré de camote y verduras salteadas.',
      price: 22.99,
      image_url: '/seed/es/salmon.webp',
    },
    {
      name: 'Pizza Margherita',
      description: 'Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca.',
      price: 16.99,
      image_url: '/seed/es/pizza.webp',
      modifier_groups: [
        pick('Tamaño', [['Individual (20 cm)', 0], ['Mediana (30 cm)', 6.0], ['Familiar (40 cm)', 12.0]]),
      ],
    },
    {
      name: 'Filete de Res',
      description: 'Corte grueso de res a la parrilla con puré de papa, espárragos y salsa de vino tinto.',
      price: 26.99,
      image_url: '/seed/es/filete.webp',
      modifier_groups: [
        pick('Término', TERMINO_ES, { defaultIndex: 1 }),
      ],
    },
    {
      name: 'Enchiladas Suizas',
      description: 'Tortillas rellenas de pollo bañadas en salsa verde con crema y queso gratinado.',
      price: 13.99,
      image_url: '/seed/es/enchiladas.webp',
    },
    {
      name: 'Sopa de Tortilla',
      description: 'Caldo de tomate con tiras de tortilla, aguacate, crema, queso y chile pasilla.',
      price: 8.99,
      image_url: '/seed/es/sopa.webp',
    },
    {
      name: 'Quesadillas de Flor de Calabaza',
      description: 'Tortillas de maíz rellenas de flor de calabaza, queso Oaxaca y epazote.',
      price: 9.99,
      image_url: '/seed/es/quesadillas.webp',
    },
  ],
  Entradas: [
    {
      name: 'Guacamole con Totopos',
      description: 'Guacamole preparado al momento con aguacate, cilantro, cebolla y limón. Con totopos.',
      price: 8.99,
      image_url: '/seed/es/guacamole.webp',
      modifier_groups: [
        pick('Porción', [['Individual', 0], ['Para compartir', 4.0]]),
      ],
    },
    {
      name: 'Ceviche de Camarón',
      description: 'Camarones frescos marinados en limón con pepino, cebolla morada y aguacate.',
      price: 12.99,
      image_url: '/seed/es/ceviche.webp',
    },
    {
      name: 'Nachos Supremos',
      description: 'Totopos con queso fundido, jalapeños, crema, guacamole y pico de gallo.',
      price: 10.99,
      image_url: '/seed/es/nachos.webp',
      modifier_groups: [
        addOns('Adicionales', [['Pollo', 3.5], ['Carne de res', 4.0]]),
      ],
    },
    {
      name: 'Empanadas de Queso',
      description: 'Tres empanadas crujientes rellenas de queso con salsa ranchera.',
      price: 7.99,
      image_url: '/seed/es/empanadas.webp',
    },
    {
      name: 'Aros de Cebolla',
      description: 'Aros de cebolla empanizados y crujientes con dip de chipotle.',
      price: 6.99,
      image_url: '/seed/es/aros-cebolla.webp',
    },
    {
      name: 'Alitas BBQ',
      description: 'Alitas de pollo bañadas en salsa barbecue, servidas con apio y aderezo ranch.',
      price: 11.99,
      image_url: '/seed/es/alitas.webp',
      modifier_groups: [
        pick('¿Cuántas piezas?', [['6 piezas', 0], ['12 piezas', 6.0]]),
      ],
    },
  ],
  Bebidas: [
    {
      name: 'Limonada Natural',
      description: 'Limonada recién exprimida con hierbabuena y hielo.',
      price: 4.0,
      image_url: '/seed/es/limonada.webp',
      modifier_groups: [
        pick('Tamaño', [['Regular (350 ml)', 0], ['Grande (500 ml)', 1.5]]),
      ],
    },
    {
      name: 'Café de Olla',
      description: 'Café de grano con piloncillo y canela, estilo tradicional.',
      price: 3.5,
      image_url: '/seed/es/cafe.webp',
      modifier_groups: [
        pick('¿Caliente o frío?', [['Caliente', 0], ['Frío', 0.5]]),
      ],
    },
    {
      name: 'Agua de Horchata',
      description: 'Agua fresca de arroz con canela y un toque de vainilla.',
      price: 3.5,
      image_url: '/seed/es/horchata.webp',
    },
    {
      name: 'Jugo Natural',
      description: 'Jugo recién exprimido de naranja, zanahoria o verde.',
      price: 4.5,
      image_url: '/seed/es/jugo.webp',
      modifier_groups: [
        pick('Sabor', [['Naranja', 0], ['Zanahoria', 0], ['Verde', 0]]),
      ],
    },
    {
      name: 'Refresco',
      description: 'Refresco en lata de 355 ml, bien frío.',
      price: 2.99,
      image_url: '/seed/es/sprite.webp',
      modifier_groups: [
        pick('Sabor', [['Cola', 0], ['Lima-limón', 0], ['Naranja', 0]]),
      ],
    },
    {
      name: 'Agua Embotellada',
      description: 'Botella de 500 ml, natural o mineral.',
      price: 2.5,
      image_url: '/seed/es/agua.webp',
      modifier_groups: [
        pick('¿Con o sin gas?', [['Sin gas', 0], ['Con gas', 0]]),
      ],
    },
  ],
  Bar: [
    {
      name: 'Margarita Clásica',
      description: 'Tequila, triple sec, jugo de limón y sal en el borde.',
      price: 9.99,
      image_url: '/seed/es/margarita.webp',
      modifier_groups: [
        pick('Sabor', [['Clásica', 0], ['De mango', 1.5], ['De tamarindo', 1.5]]),
      ],
    },
    {
      name: 'Cerveza Artesanal',
      description: 'Cerveza artesanal local de temporada.',
      price: 6.99,
      image_url: '/seed/es/cerveza.webp',
    },
    {
      name: 'Mezcal Oaxaqueño',
      description: 'Mezcal joven artesanal servido con naranja y sal de gusano.',
      price: 8.99,
      image_url: '/seed/es/mezcal.webp',
    },
    {
      name: 'Mojito',
      description: 'Ron blanco, hierbabuena fresca, limón, azúcar y soda.',
      price: 8.99,
      image_url: '/seed/es/mojito.webp',
    },
    {
      name: 'Copa de Vino Tinto',
      description: 'Vino tinto de la casa, servido por copa.',
      price: 7.99,
      image_url: '/seed/es/vino.webp',
    },
    {
      name: 'Michelada Clásica',
      description: 'Cerveza con jugo de limón, sal, salsa picante y chamoy.',
      price: 6.99,
      image_url: '/seed/es/michelada.webp',
    },
  ],
  Postres: [
    {
      name: 'Flan Napolitano',
      description: 'Flan cremoso de vainilla con caramelo casero.',
      price: 5.5,
      image_url: '/seed/es/flan.webp',
    },
    {
      name: 'Churros con Chocolate',
      description: 'Churros crujientes espolvoreados con azúcar y canela, con salsa de chocolate belga.',
      price: 5.99,
      image_url: '/seed/es/churros.webp',
      modifier_groups: [
        addOns('Adicionales', [['Bola de helado', 2.0], ['Dulce de leche', 1.5]]),
      ],
    },
    {
      name: 'Pastel de Tres Leches',
      description: 'Bizcocho empapado en leche condensada, evaporada y crema, decorado con fresas.',
      price: 6.99,
      image_url: '/seed/es/tres-leches.webp',
    },
    {
      name: 'Brownie con Helado',
      description: 'Brownie de chocolate caliente con helado de vainilla y salsa de chocolate.',
      price: 7.99,
      image_url: '/seed/es/brownie.webp',
      modifier_groups: [
        addOns('Adicionales', [['Bola extra de helado', 2.0], ['Crema batida', 1.5]]),
      ],
    },
    {
      name: 'Helado Artesanal',
      description: 'Dos bolas de helado artesanal.',
      price: 4.99,
      image_url: '/seed/es/helado.webp',
      modifier_groups: [
        pickMany('Elige hasta 2 sabores', [['Vainilla', 0], ['Chocolate', 0], ['Fresa', 0], ['Mango', 0]], 1, 2),
      ],
    },
    {
      name: 'Cheesecake',
      description: 'Cheesecake estilo Nueva York con base de galleta y mermelada de frutos rojos.',
      price: 6.99,
      image_url: '/seed/es/pay-queso.webp',
    },
  ],
};

const SEED_TABLES_ES = [
  { name: 'Mesa 1' },
  { name: 'Mesa 2' },
  { name: 'Mesa 3' },
  { name: 'Mesa 4' },
  { name: 'Delivery' },
  { name: 'Para llevar' },
];

// --------------- ENGLISH ---------------

export const SEED_CATEGORIES_EN = [
  { name: 'Breakfast', sort_order: 1 },
  { name: 'Lunch', sort_order: 2 },
  { name: 'Dinner', sort_order: 3 },
  { name: 'Appetizers', sort_order: 4 },
  { name: 'Beverages', sort_order: 5 },
  { name: 'Bar', sort_order: 6 },
  { name: 'Desserts', sort_order: 7 },
];

const DONENESS_EN: readonly Opt[] = [
  ['Medium Rare', 0],
  ['Medium', 0],
  ['Well Done', 0],
];

export const SEED_PRODUCTS_EN: Record<string, SeedProduct[]> = {
  Breakfast: [
    {
      name: 'Buttermilk Pancakes',
      description: 'Fluffy buttermilk pancakes with maple syrup, butter, and fresh berries.',
      price: 10.99,
      image_url: '/seed/en/pancakes.webp',
      modifier_groups: [
        addOns('Add-ons', [['Nutella drizzle', 1.5], ['Sliced banana', 1.0]]),
      ],
    },
    {
      name: 'Eggs Benedict',
      description: 'Poached eggs on toasted English muffins with Canadian bacon and hollandaise sauce.',
      price: 13.99,
      image_url: '/seed/en/eggs-benedict.webp',
    },
    {
      name: 'French Toast',
      description: 'Thick-cut brioche dipped in vanilla-cinnamon batter, dusted with powdered sugar.',
      price: 11.49,
      image_url: '/seed/en/french-toast.webp',
    },
    {
      name: 'Western Omelette',
      description: 'Three-egg omelette with ham, bell peppers, and onions, plus your choice of cheese.',
      price: 12.49,
      image_url: '/seed/en/omelette.webp',
      modifier_groups: [
        pick('Cheese', [['Cheddar', 0], ['American', 0], ['Swiss', 0], ['Pepper Jack', 0]]),
        pickOptional('Add a protein', [['Bacon', 2.5], ['Turkey Sausage', 2.5]], { display: 'list' }),
      ],
    },
    {
      name: 'Belgian Waffles',
      description: 'Crispy Belgian waffles topped with whipped cream, strawberries, and maple syrup.',
      price: 11.99,
      image_url: '/seed/en/waffles.webp',
    },
    {
      name: 'Avocado Toast',
      description: 'Sourdough toast with smashed avocado, cherry tomatoes, feta, and a poached egg.',
      price: 12.99,
      image_url: '/seed/en/avocado-toast.webp',
    },
  ],
  Lunch: [
    {
      name: 'Classic Burger',
      description: 'Half-pound Angus beef patty with lettuce, tomato, caramelized onions, and your choice of cheese. Served with fries.',
      price: 14.99,
      image_url: '/seed/en/burger.webp',
      modifier_groups: [
        pick('Single or double?', [['Single', 0], ['Double', 5.0]]),
        pick('How would you like it cooked?', DONENESS_EN, { defaultIndex: 1 }),
        pickOptional('Cheese', [['Cheddar', 0], ['American', 0], ['Swiss', 0], ['Pepper Jack', 1.0]], { defaultIndex: 0 }),
        addOns('Add-ons', [['Bacon', 2.5], ['Avocado', 2.0], ['Onion Rings', 3.0]]),
      ],
    },
    {
      name: 'Caesar Salad',
      description: 'Crisp romaine, shaved parmesan, garlic croutons, and house-made Caesar dressing.',
      price: 11.49,
      image_url: '/seed/en/caesar-salad.webp',
      modifier_groups: [
        addOns('Add-ons', [['Grilled chicken', 3.0], ['Shrimp', 5.0]]),
      ],
    },
    {
      name: 'Club Sandwich',
      description: 'Triple-decker with turkey, bacon, lettuce, tomato, and mayo, served with fries.',
      price: 13.49,
      image_url: '/seed/en/club-sandwich.webp',
    },
    {
      name: 'Grilled Chicken Plate',
      description: 'Herb-marinated chicken breast with rice, grilled vegetables, and chimichurri.',
      price: 15.99,
      image_url: '/seed/en/grilled-chicken.webp',
    },
    {
      name: 'Fish Tacos',
      description: 'Beer-battered fish tacos with cabbage slaw, pico de gallo, and chipotle crema.',
      price: 14.49,
      image_url: '/seed/en/fish-tacos.webp',
      modifier_groups: [
        pick('How many?', [['3 Tacos', 0], ['5 Tacos', 4.0]]),
      ],
    },
    {
      name: 'Pasta Alfredo',
      description: 'Fettuccine in a creamy parmesan Alfredo sauce, served with garlic bread.',
      price: 13.99,
      image_url: '/seed/en/pasta.webp',
      modifier_groups: [
        pick('Protein', [['None', 0], ['Grilled Chicken', 3.0], ['Shrimp', 5.0]]),
      ],
    },
  ],
  Dinner: [
    {
      name: 'Grilled Ribeye Steak',
      description: '12 oz ribeye grilled to order, with mashed potatoes, asparagus, and red wine jus.',
      price: 28.99,
      image_url: '/seed/en/steak.webp',
      modifier_groups: [
        pick('How would you like it cooked?', DONENESS_EN, { defaultIndex: 0 }),
      ],
    },
    {
      name: 'Pan-Seared Salmon',
      description: 'Atlantic salmon with lemon-dill sauce, quinoa, and roasted seasonal vegetables.',
      price: 24.99,
      image_url: '/seed/en/salmon.webp',
    },
    {
      name: 'Baby Back Ribs',
      description: 'Slow-smoked pork ribs glazed with house BBQ sauce, served with coleslaw and cornbread.',
      price: 29.99,
      image_url: '/seed/en/ribs.webp',
    },
    {
      name: 'Lobster Tail',
      description: 'Butter-poached lobster tail with roasted potatoes, asparagus, and drawn butter.',
      price: 34.99,
      image_url: '/seed/en/lobster.webp',
    },
    {
      name: 'Margherita Pizza',
      description: 'Wood-fired crust, San Marzano tomato sauce, fresh mozzarella, and basil.',
      price: 18.99,
      image_url: '/seed/en/pizza.webp',
      modifier_groups: [
        pick('Size', [['Personal (10")', 0], ['Medium (14")', 6.0], ['Large (16")', 12.0]]),
      ],
    },
    {
      name: 'Garlic Shrimp',
      description: 'Jumbo shrimp sautéed in garlic butter with white wine, served over linguine.',
      price: 19.99,
      image_url: '/seed/en/shrimp.webp',
    },
  ],
  Appetizers: [
    {
      name: 'Buffalo Wings',
      description: 'Crispy chicken wings tossed in Buffalo sauce, served with celery and ranch.',
      price: 12.99,
      image_url: '/seed/en/wings.webp',
      modifier_groups: [
        pick('How many?', [['6 Pieces', 0], ['12 Pieces', 6.0]]),
      ],
    },
    {
      name: 'Loaded Nachos',
      description: 'Tortilla chips topped with melted cheese, jalapeños, guacamole, sour cream, and pico de gallo.',
      price: 11.49,
      image_url: '/seed/en/nachos.webp',
      modifier_groups: [
        addOns('Add-ons', [['Chicken', 3.5], ['Seasoned beef', 4.0]]),
      ],
    },
    {
      name: 'Spring Rolls',
      description: 'Crispy vegetable spring rolls served with sweet chili dipping sauce.',
      price: 9.99,
      image_url: '/seed/en/spring-rolls.webp',
    },
    {
      name: 'Beef Sliders',
      description: 'Three mini Angus beef burgers with pickles, cheddar, and special sauce.',
      price: 13.99,
      image_url: '/seed/en/sliders.webp',
    },
    {
      name: 'Fried Calamari',
      description: 'Lightly breaded calamari rings served with marinara and lemon aioli.',
      price: 14.99,
      image_url: '/seed/en/calamari.webp',
    },
    {
      name: 'Onion Rings',
      description: 'Thick-cut, beer-battered onion rings with chipotle dipping sauce.',
      price: 10.99,
      image_url: '/seed/en/onion-rings.webp',
    },
  ],
  Beverages: [
    {
      name: 'Fresh-Squeezed Lemonade',
      description: 'Hand-squeezed lemonade with fresh mint, served over ice.',
      price: 4.49,
      image_url: '/seed/en/lemonade.webp',
      modifier_groups: [
        pick('Size', [['Regular', 0], ['Large', 1.5]]),
      ],
    },
    {
      name: 'House Coffee',
      description: 'Single-origin medium roast, served hot or iced.',
      price: 4.99,
      image_url: '/seed/en/coffee.webp',
      modifier_groups: [
        pick('Hot or iced?', [['Hot', 0], ['Iced', 0.5]]),
      ],
    },
    {
      name: 'Tropical Smoothie',
      description: 'Mango, pineapple, banana, and coconut milk blended smooth.',
      price: 6.49,
      image_url: '/seed/en/smoothie.webp',
    },
    {
      name: 'Bottled Water',
      description: 'Still or sparkling, 500 ml bottle.',
      price: 3.49,
      image_url: '/seed/en/water.webp',
      modifier_groups: [
        pick('Still or sparkling?', [['Still', 0], ['Sparkling', 0]]),
      ],
    },
    {
      name: 'Fresh Juice',
      description: 'Freshly squeezed orange, carrot, or green juice.',
      price: 5.49,
      image_url: '/seed/en/orange-juice.webp',
      modifier_groups: [
        pick('Flavor', [['Orange', 0], ['Carrot', 0], ['Green', 0]]),
      ],
    },
    {
      name: 'Iced Tea',
      description: 'House-brewed iced tea with lemon.',
      price: 3.99,
      image_url: '/seed/en/lemonade.webp',
      modifier_groups: [
        pick('Sweetened or unsweetened?', [['Unsweetened', 0], ['Sweetened', 0]]),
      ],
    },
  ],
  Bar: [
    {
      name: 'Classic Margarita',
      description: 'Tequila, Cointreau, and fresh lime juice with a salted rim.',
      price: 11.99,
      image_url: '/seed/en/margarita.webp',
      modifier_groups: [
        pick('Flavor', [['Classic', 0], ['Mango', 1.5], ['Spicy', 1.5]]),
      ],
    },
    {
      name: 'Craft Beer',
      description: 'Local craft beer on tap, rotating with the season.',
      price: 7.99,
      image_url: '/seed/en/beer.webp',
    },
    {
      name: 'Whiskey Sour',
      description: 'Bourbon, fresh lemon juice, simple syrup, and a dash of bitters.',
      price: 13.99,
      image_url: '/seed/en/whiskey.webp',
    },
    {
      name: 'Mojito',
      description: 'White rum, fresh muddled mint, lime, sugar, and soda water.',
      price: 11.49,
      image_url: '/seed/en/mojito.webp',
    },
    {
      name: 'House Wine',
      description: 'Our house red, white, or rosé, by the glass.',
      price: 9.99,
      image_url: '/seed/en/wine.webp',
      modifier_groups: [
        pick('Red, white, or rosé?', [['Red', 0], ['White', 0], ['Rosé', 0]]),
      ],
    },
    {
      name: 'Long Island Iced Tea',
      description: 'Vodka, rum, gin, tequila, triple sec, sour mix, and a splash of cola.',
      price: 13.49,
      image_url: '/seed/en/mojito.webp',
    },
  ],
  Desserts: [
    {
      name: 'New York Cheesecake',
      description: 'Classic creamy cheesecake on a graham cracker crust with berry compote.',
      price: 8.99,
      image_url: '/seed/en/cheesecake.webp',
    },
    {
      name: 'Brownie Sundae',
      description: 'Warm fudge brownie topped with vanilla ice cream, chocolate sauce, and whipped cream.',
      price: 9.49,
      image_url: '/seed/en/brownie.webp',
      modifier_groups: [
        addOns('Add-ons', [['Extra scoop of ice cream', 2.0], ['Extra whipped cream', 1.5]]),
      ],
    },
    {
      name: 'Tiramisu',
      description: 'Espresso-soaked ladyfingers layered with mascarpone cream and cocoa powder.',
      price: 9.99,
      image_url: '/seed/en/tiramisu.webp',
    },
    {
      name: 'Crème Brûlée',
      description: 'Classic vanilla custard with a caramelized sugar crust.',
      price: 8.49,
      image_url: '/seed/en/creme-brulee.webp',
    },
    {
      name: 'House-Made Ice Cream',
      description: 'Two scoops of house-made ice cream.',
      price: 7.99,
      image_url: '/seed/en/ice-cream.webp',
      modifier_groups: [
        pickMany('Pick up to 2 flavors', [['Vanilla', 0], ['Chocolate', 0], ['Strawberry', 0], ['Mango', 0]], 1, 2),
      ],
    },
    {
      name: 'Apple Pie à la Mode',
      description: 'Warm spiced apple pie with a scoop of vanilla ice cream and a caramel drizzle.',
      price: 7.99,
      image_url: '/seed/en/apple-pie.webp',
    },
  ],
};

const SEED_TABLES_EN = [
  { name: 'Table 1' },
  { name: 'Table 2' },
  { name: 'Table 3' },
  { name: 'Table 4' },
  { name: 'Delivery' },
  { name: 'Takeout' },
];

const BANNER_URL = '/seed/banner-default.webp';

function logInsertError(step: string, restaurantId: string, error: { message: string } | null) {
  if (error) logger.error(`Seed insert failed: ${step}`, { restaurantId, error: error.message });
}

export async function seedRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
  restaurantSlug: string,
  appUrl: string,
  locale: string = 'es',
  currency: string = 'USD',
) {
  const isEn = locale === 'en';
  const seedCategories = isEn ? SEED_CATEGORIES_EN : SEED_CATEGORIES_ES;
  const seedProducts = isEn ? SEED_PRODUCTS_EN : SEED_PRODUCTS_ES;
  const seedTables = isEn ? SEED_TABLES_EN : SEED_TABLES_ES;
  const price = (usd: number) => convertSeedPrice(usd, currency);

  try {
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .insert(seedCategories.map((c) => ({
        restaurant_id: restaurantId,
        name: c.name,
        sort_order: c.sort_order,
        is_active: true,
      })))
      .select('id, name');
    logInsertError('categories', restaurantId, catError);

    if (!categories?.length) return;

    const categoryMap: Record<string, string> = {};
    for (const c of categories as Array<{ id: string; name: string }>) categoryMap[c.name] = c.id;

    const productRows: Array<{
      restaurant_id: string;
      category_id: string;
      name: string;
      description: string;
      price: number;
      image_url: string;
      is_active: boolean;
    }> = [];

    for (const [catName, products] of Object.entries(seedProducts)) {
      const catId = categoryMap[catName];
      if (!catId) continue;
      for (const p of products) {
        productRows.push({
          restaurant_id: restaurantId,
          category_id: catId,
          name: p.name,
          description: p.description,
          price: price(p.price),
          image_url: p.image_url,
          is_active: true,
        });
      }
    }

    const { data: createdProducts, error: prodError } = await supabase
      .from('products')
      .insert(productRows)
      .select('id, name');
    logInsertError('products', restaurantId, prodError);

    if (!createdProducts?.length) return;

    const productMap: Record<string, string> = {};
    for (const p of createdProducts as Array<{ id: string; name: string }>) productMap[p.name] = p.id;

    // Grupos: un solo insert para todos. Cada grupo se identifica por
    // (product_id, sort_order), único dentro del producto, para enlazar sus
    // opciones sin depender del orden en que la DB devuelva las filas.
    const groupRows: Array<{
      product_id: string;
      name: string;
      selection_type: 'single' | 'multi';
      is_required: boolean;
      min_select: number;
      max_select: number;
      display_type: 'list' | 'grid';
      sort_order: number;
    }> = [];
    const optionsByGroupKey = new Map<string, SeedModifierOption[]>();

    for (const products of Object.values(seedProducts)) {
      for (const p of products) {
        const productId = productMap[p.name];
        if (!productId || !p.modifier_groups?.length) continue;
        p.modifier_groups.forEach((g, gi) => {
          const sortOrder = gi + 1;
          groupRows.push({
            product_id: productId,
            name: g.name,
            selection_type: g.selection_type,
            is_required: g.is_required,
            min_select: g.min_select,
            max_select: g.max_select,
            display_type: g.display_type,
            sort_order: sortOrder,
          });
          optionsByGroupKey.set(`${productId}:${sortOrder}`, g.options);
        });
      }
    }

    if (groupRows.length) {
      const { data: createdGroups, error: groupError } = await supabase
        .from('modifier_groups')
        .insert(groupRows)
        .select('id, product_id, sort_order');
      logInsertError('modifier_groups', restaurantId, groupError);

      const optionRows: Array<{
        group_id: string;
        name: string;
        price_delta: number;
        is_default: boolean;
        sort_order: number;
      }> = [];
      for (const g of (createdGroups ?? []) as Array<{ id: string; product_id: string; sort_order: number }>) {
        const options = optionsByGroupKey.get(`${g.product_id}:${g.sort_order}`) ?? [];
        options.forEach((o, oi) => {
          optionRows.push({
            group_id: g.id,
            name: o.name,
            price_delta: price(o.price_delta),
            is_default: o.is_default,
            sort_order: oi + 1,
          });
        });
      }

      if (optionRows.length) {
        const { error: optError } = await supabase.from('modifier_options').insert(optionRows);
        logInsertError('modifier_options', restaurantId, optError);
      }
    }

    const { error: tableError } = await supabase.from('tables').insert(
      seedTables.map((t) => ({
        restaurant_id: restaurantId,
        name: t.name,
        qr_code_value: `${appUrl}/${restaurantSlug}?table=${encodeURIComponent(t.name)}`,
      }))
    );
    logInsertError('tables', restaurantId, tableError);

    await supabase
      .from('restaurants')
      .update({ cover_image_url: BANNER_URL })
      .eq('id', restaurantId);
  } catch (err) {
    logger.error('Failed to seed restaurant data — continuing without seed', {
      restaurantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
