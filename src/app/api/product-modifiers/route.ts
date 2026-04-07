import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ModifierGroup, ModifierOption, ProductVariant, ProductExtra } from '@/types';

/**
 * GET /api/product-modifiers?productId=<uuid>
 *
 * Returns the full modifier data (modifier_groups, variants, extras) for a single
 * product. Called by CustomizationSheet when the menu was served with slimmed
 * product payloads (has_modifiers=true but modifier_groups=[]).
 *
 * Product modifier data is always public — it is visible to every customer on the menu.
 * No authentication required; uses admin client to bypass RLS (read-only, safe).
 */
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('productId');

  if (!productId || productId.length < 10) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  try {
    const db = createAdminClient();

    const [modGroupsResult, variantsResult, extrasResult] = await Promise.all([
      db
        .from('modifier_groups')
        .select(`
          id, product_id, name, selection_type, is_required,
          min_select, max_select, sort_order, display_type,
          modifier_options ( id, group_id, name, price_delta, is_default, sort_order )
        `)
        .eq('product_id', productId)
        .order('sort_order', { ascending: true }),

      db
        .from('product_variants')
        .select('id, product_id, name, price_delta, sort_order')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true }),

      db
        .from('product_extras')
        .select('id, product_id, name, price, sort_order')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true }),
    ]);

    const modifier_groups: ModifierGroup[] = ((modGroupsResult.data ?? []) as any[]).map((g) => ({
      id: g.id,
      product_id: g.product_id,
      name: g.name,
      selection_type: g.selection_type,
      is_required: g.is_required,
      min_select: g.min_select,
      max_select: g.max_select,
      sort_order: g.sort_order,
      display_type: g.display_type,
      options: ((g.modifier_options ?? []) as ModifierOption[]).sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    }));

    return NextResponse.json(
      {
        modifier_groups,
        variants: (variantsResult.data ?? []) as ProductVariant[],
        extras: (extrasResult.data ?? []) as ProductExtra[],
      },
      {
        headers: {
          // Cache for 5 min on CDN; stale up to 10 min while revalidating
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('[product-modifiers] Error fetching modifiers', { productId, error: String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
