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
          min_select, max_select, sort_order, display_type, depends_on_option_id,
          translations,
          modifier_options ( id, group_id, name, price_delta, is_default, sort_order, translations )
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

    // A failed query must NOT be served as "this product has no options".
    // On 2026-08-05 a bad migration made this query error out and the old
    // `?? []` turned it into an empty array: every restaurant silently lost
    // every modifier group while the endpoint kept answering 200, so nothing
    // surfaced until a customer noticed they couldn't pick their cooking
    // temperature. Failing loudly is the only way this stays visible.
    if (modGroupsResult.error || variantsResult.error || extrasResult.error) {
      const err =
        modGroupsResult.error || variantsResult.error || extrasResult.error;
      console.error('[product-modifiers] query failed', {
        productId,
        error: err?.message,
        code: (err as { code?: string })?.code,
      });
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

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
      depends_on_option_id: g.depends_on_option_id ?? null,
      translations: g.translations ?? null,
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
          // 30 s en CDN + 60 s stale. Antes 300 + 600: si el dueño recreaba una
          // opción, la hoja seguía ofreciendo el id viejo hasta 15 min, el
          // pedido daba 409 MODIFIERS_CHANGED y "quitar y volver a agregar"
          // repetía el error. revalidatePath no purga esta respuesta.
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('[product-modifiers] Error fetching modifiers', { productId, error: String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
