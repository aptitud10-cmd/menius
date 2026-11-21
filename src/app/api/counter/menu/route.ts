export const dynamic = 'force-dynamic';

/**
 * GET → la carta para la pestaña "Menú" del Counter (marcar "se acabó" a pantalla completa).
 * Solo categorías y platos activos. Sin los platos del día (daily_kind): esos se manejan en "Hoy".
 * Marcar/desmarcar usa POST /api/products/stock, que ya existía.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';

const logger = createLogger('counter-menu');

export async function GET() {
  try {
    return await load();
  } catch (err) {
    logger.error('counter menu failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function load() {
  const tenant = await getTenant({ allowDevice: true });
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const supabase = await createClient();
  const [cats, prods, rest] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, group_name, group_sort_order, sort_order')
      .eq('restaurant_id', tenant.restaurantId)
      .eq('is_active', true)
      .order('group_sort_order', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, price, in_stock, in_stock_until, category_id, sort_order')
      .eq('restaurant_id', tenant.restaurantId)
      .eq('is_active', true)
      .is('daily_kind', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(2000),
    supabase.from('restaurants').select('day_cutoff').eq('id', tenant.restaurantId).maybeSingle(),
  ]);
  if (rest.error) logger.error('counter menu cutoff failed (se usa 5:00)', { error: rest.error.message });
  if (cats.error || prods.error) {
    logger.error('counter menu query failed', { error: (cats.error ?? prods.error)?.message });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  // Un plato de una categoría apagada no está en la carta: no se muestra.
  const activeCats = new Set((cats.data ?? []).map((c) => c.id as string));
  const products = (prods.data ?? [])
    .filter((p) => activeCats.has(p.category_id as string))
    .map((p) => ({
      id: p.id as string,
      name: p.name as string,
      price: Number(p.price) || 0,
      in_stock: p.in_stock !== false,
      // Solo importa si está agotado: con fecha vuelve solo (corte del día); sin fecha, "hasta que lo vuelva a poner".
      until: p.in_stock === false ? ((p.in_stock_until as string | null) ?? null) : null,
      category_id: p.category_id as string,
    }));
  const used = new Set(products.map((p) => p.category_id));
  const categories = (cats.data ?? [])
    .filter((c) => used.has(c.id as string))
    .map((c) => ({ id: c.id as string, name: c.name as string, group: (c.group_name as string | null) ?? null }));

  return NextResponse.json({ categories, products, cutoff: (rest.data?.day_cutoff as string | null) ?? null });
}
