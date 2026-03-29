/**
 * Seeds default style anchors for a restaurant when they upgrade to Pro or Business.
 * Uses the Buccaneer Diner's AI-generated images as reference visuals for
 * the standard seed categories (ES + EN). ON CONFLICT DO NOTHING ensures
 * existing anchors set by the user are never overwritten.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const logger = createLogger('seed-style-anchors');

const BASE = 'https://hdlhmqvbaxzhmhtablwt.supabase.co/storage/v1/object/public/product-images/admin-regen/a1f5af6a-1805-49d2-b494-f074ac657357';

// Reference images from Buccaneer Diner — professional AI-generated photos
// used as visual style anchors for each food/drink category.
const ANCHOR_URLS: Record<string, string> = {
  breakfast:   `${BASE}/1d2484ca-fa7c-4ad3-aa2a-68744706a806-1774736990806.jpg`, // Buttermilk Pancakes
  lunch:       `${BASE}/9f3cc334-1295-4868-b993-a81f9854cdb9-1774736770255.jpg`, // Entrees
  dinner:      `${BASE}/aa9b95a4-b143-4349-a44e-bdadc81ccfde-1774736785800.jpg`, // Steak and Eggs
  appetizers:  `${BASE}/35f577bc-d3eb-4f39-9e00-c96595e8444e-1774736774422.jpg`, // Appetizers
  beverages:   `${BASE}/876a9944-2c07-45da-bbd8-138137715e81-1774736817910.jpg`, // From the Fountain
  cocktails:   `${BASE}/f2bee22e-40e5-4d9d-9aa9-349617b2c126-1774737018162.jpg`, // Coffee and Drinks Bar
  desserts:    `${BASE}/4f3f5052-7a33-424a-b3e2-6a362d71ad8b-1774736832296.jpg`, // Desserts
  pasta:       `${BASE}/3eda3854-e9bc-4906-90a3-d4c74e352694-1774737003364.jpg`, // Pasta Specialties
  omelettes:   `${BASE}/8486d232-157f-4bbf-a03f-1f9b4320153b-1774736710471.jpg`, // Egg Omelettes
  bakeshop:    `${BASE}/822945c9-082f-49ea-aadd-d839a3988933-1774736846627.jpg`, // The Bake Shop
  seafood:     `${BASE}/bc191e42-215a-48bf-9b91-f37b426c68ad-1774737004253.jpg`, // Sauteed Specialties
  juices:      'https://hdlhmqvbaxzhmhtablwt.supabase.co/storage/v1/object/public/product-images/6f18a1cf-991c-4855-ba4b-d10a6a501cc8/ai-1774726361908.jpg',
};

// Maps each seed category name (ES + EN) to a reference anchor
const CATEGORY_ANCHOR_MAP: Array<{ category_name: string; anchor_key: keyof typeof ANCHOR_URLS }> = [
  // ── Spanish (seed-restaurant.ts SEED_CATEGORIES_ES) ──────────────────────
  { category_name: 'Desayunos',         anchor_key: 'breakfast'  },
  { category_name: 'Almuerzos',         anchor_key: 'lunch'      },
  { category_name: 'Cenas',             anchor_key: 'dinner'     },
  { category_name: 'Aperitivos',        anchor_key: 'appetizers' },
  { category_name: 'Bebidas',           anchor_key: 'beverages'  },
  { category_name: 'Licores',           anchor_key: 'cocktails'  },
  { category_name: 'Postres',           anchor_key: 'desserts'   },
  // ── English (seed-restaurant.ts SEED_CATEGORIES_EN) ──────────────────────
  { category_name: 'Breakfast',         anchor_key: 'breakfast'  },
  { category_name: 'Lunch',             anchor_key: 'lunch'      },
  { category_name: 'Dinner',            anchor_key: 'dinner'     },
  { category_name: 'Appetizers',        anchor_key: 'appetizers' },
  { category_name: 'Beverages',         anchor_key: 'beverages'  },
  { category_name: 'Cocktails',         anchor_key: 'cocktails'  },
  { category_name: 'Desserts',          anchor_key: 'desserts'   },
  // ── Extra common names ────────────────────────────────────────────────────
  { category_name: 'Drinks',            anchor_key: 'cocktails'  },
  { category_name: 'Beverage',          anchor_key: 'beverages'  },
  { category_name: 'Appetizer',         anchor_key: 'appetizers' },
  { category_name: 'Starters',          anchor_key: 'appetizers' },
  { category_name: 'Entradas',          anchor_key: 'appetizers' },
  { category_name: 'Platos principales',anchor_key: 'dinner'     },
  { category_name: 'Platos Principales',anchor_key: 'dinner'     },
  { category_name: 'Especialidades',    anchor_key: 'dinner'     },
  { category_name: 'Pastas',            anchor_key: 'pasta'      },
  { category_name: 'Pasta',             anchor_key: 'pasta'      },
  { category_name: 'Mariscos',          anchor_key: 'seafood'    },
  { category_name: 'Seafood',           anchor_key: 'seafood'    },
  { category_name: 'Jugos',             anchor_key: 'juices'     },
  { category_name: 'Juices',            anchor_key: 'juices'     },
  { category_name: 'Panadería',         anchor_key: 'bakeshop'   },
  { category_name: 'Bakery',            anchor_key: 'bakeshop'   },
];

/**
 * Seeds style anchors for all standard seed categories of a restaurant.
 * Safe to call multiple times — ON CONFLICT DO NOTHING preserves user-set anchors.
 * Call this when a restaurant upgrades to Pro or Business plan.
 */
export async function seedStyleAnchors(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<void> {
  try {
    const rows = CATEGORY_ANCHOR_MAP.map(({ category_name, anchor_key }) => ({
      restaurant_id: restaurantId,
      category_name,
      anchor_url: ANCHOR_URLS[anchor_key],
    }));

    const { error } = await (supabase as any)
      .from('style_anchors')
      .upsert(rows, { onConflict: 'restaurant_id,category_name', ignoreDuplicates: true });

    if (error) {
      logger.warn('seed-style-anchors partial failure', { restaurantId, error: error.message });
    } else {
      logger.info('Style anchors seeded', { restaurantId, count: rows.length });
    }
  } catch (err) {
    logger.warn('seed-style-anchors threw', {
      restaurantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
