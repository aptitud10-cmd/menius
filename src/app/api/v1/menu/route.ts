export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/menu
 * External API — authenticated via API key (x-api-key or Authorization: Bearer).
 *
 * Returns the full menu (categories + active products with variants, extras, modifiers)
 * for the restaurant associated with the API key.
 *
 * Example:
 *   GET /api/v1/menu
 *   x-api-key: mk_live_...
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/validate-api-key';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed } = await checkRateLimitAsync(`v1-menu:${ip}`, { limit: 60, windowSec: 60 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: 'Invalid or missing API key. Pass x-api-key: mk_live_... header.' },
      { status: 401 }
    );
  }

  const db = createAdminClient();

  const [categoriesRes, productsRes] = await Promise.all([
    db
      .from('categories')
      .select('id, name, description, image_url, sort_order, is_active')
      .eq('restaurant_id', auth.restaurantId)
      .eq('is_active', true)
      .order('sort_order'),

    db
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        in_stock,
        dietary_tags,
        sort_order,
        category_id,
        product_variants ( id, name, price_delta, in_stock ),
        product_extras ( id, name, price, max_qty ),
        modifier_groups (
          id,
          name,
          required,
          min_selections,
          max_selections,
          modifier_options ( id, name, price_delta )
        )
      `)
      .eq('restaurant_id', auth.restaurantId)
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  if (categoriesRes.error) return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 });
  if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 });

  // Group products under their category
  const productsByCategory = new Map<string, typeof productsRes.data>();
  for (const product of productsRes.data ?? []) {
    const list = productsByCategory.get(product.category_id) ?? [];
    list.push(product);
    productsByCategory.set(product.category_id, list);
  }

  const menu = (categoriesRes.data ?? []).map(cat => ({
    ...cat,
    products: productsByCategory.get(cat.id) ?? [],
  }));

  return NextResponse.json({ data: menu });
}
