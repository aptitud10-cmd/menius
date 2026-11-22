import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ModifierGroup, ModifierOption, ProductVariant, ProductExtra } from '@/types';
import { linkedOptionState, linkedProductIds, type LinkedProductState } from '@/lib/linked-options';

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
          depends_on_option_ids, translations, ticket_label, ticket_layout,
          modifier_options ( * )
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

    // Opciones con "*" y lista blanca abajo (cost_price no sale): linked_product_id llega
    // cuando existe la columna, y si todavía no existe la consulta no falla (un 42703 acá
    // dejaría sin opciones a TODAS las tiendas si se promueve antes de la migración).
    const rawGroups = (modGroupsResult.data ?? []) as any[];
    const rawOptionsOf = (g: any) => (g.modifier_options ?? []) as Record<string, any>[];
    const linkedIds = linkedProductIds(rawGroups.flatMap(rawOptionsOf));
    const linkedProducts = new Map<string, LinkedProductState>();
    if (linkedIds.length > 0) {
      const { data: lp, error: lpErr } = await db
        .from('products')
        .select('id, is_active, in_stock')
        .in('id', linkedIds);
      if (lpErr) {
        console.error('[product-modifiers] linked products query failed', { productId, error: lpErr.message });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      }
      for (const p of lp ?? []) linkedProducts.set(p.id, p);
    }
    const stateOf = (o: Record<string, any>) => linkedOptionState(o.linked_product_id, linkedProducts);
    const toOption = (o: Record<string, any>): ModifierOption => ({
      id: o.id,
      group_id: o.group_id,
      name: o.name,
      price_delta: o.price_delta,
      is_default: o.is_default,
      sort_order: o.sort_order,
      translations: o.translations ?? null,
      available_from: o.available_from ?? null,
      available_until: o.available_until ?? null,
      ...(o.linked_product_id ? { linked_product_id: o.linked_product_id } : {}),
      ...(stateOf(o) === 'sold_out' ? { sold_out: true } : {}),
    });

    const modifier_groups: ModifierGroup[] = rawGroups
      // Una pregunta de sopas cuyas opciones están todas apagadas hoy no se muestra:
      // sería obligatoria y sin nada para elegir.
      .filter((g) => {
        const opts = rawOptionsOf(g);
        return opts.length === 0 || opts.some((o) => stateOf(o) !== 'hidden');
      })
      .map((g) => ({
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
      depends_on_option_ids: g.depends_on_option_ids ?? null,
      translations: g.translations ?? null,
      ticket_label: g.ticket_label ?? null,
      ticket_layout: g.ticket_layout ?? 'line',
      // Las enganchadas a un plato que hoy no está puesto no se ofrecen.
      options: rawOptionsOf(g)
        .filter((o) => stateOf(o) !== 'hidden')
        .map(toOption)
        .sort((a, b) => a.sort_order - b.sort_order),
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
          // Con opciones enganchadas (las sopas de hoy) el Counter las cambia durante el
          // día: 10 s. El pedido las valida igual; esto solo acorta lo que se ve viejo.
          'Cache-Control':
            linkedIds.length > 0
              ? 'public, s-maxage=10, stale-while-revalidate=20'
              : 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('[product-modifiers] Error fetching modifiers', { productId, error: String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
