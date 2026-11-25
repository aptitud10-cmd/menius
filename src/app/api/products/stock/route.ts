export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { isSameOriginJson } from '@/lib/device-pairing';
import { revalidatePublicMenuForRestaurant } from '@/lib/revalidate-public-menu';
import { nextCutoffInstant } from '@/lib/daily-menu';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const tenant = await getTenant({ allowDevice: true });
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const supabase = await createClient();
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price, in_stock, category_id, is_active')
      .eq('restaurant_id', tenant.restaurantId)
      .eq('is_active', true)
      .order('name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: products ?? [] });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * { product_id, in_stock, until? }
 * until = 'next_cutoff' (solo con in_stock=false): vuelve solo en el próximo corte del día del
 * restaurante (Buccaneer 05:00 NY); lo devuelve el cron daily-reset. Sin until: agotado hasta que
 * alguien lo vuelva a poner. Al poner in_stock=true, un trigger borra in_stock_until.
 */
export async function POST(req: NextRequest) {
  try {
    // Solo la propia página (JSON + mismo origen): un formulario de otro sitio no
    // puede usar la sesión abierta de la tablet para agotar o cambiar platos.
    if (!isSameOriginJson(req)) return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
    const tenant = await getTenant({ allowDevice: true });
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body: unknown = await req.json().catch(() => null);
    const { product_id, in_stock, until } = (body ?? {}) as { product_id?: unknown; in_stock?: unknown; until?: unknown };
    if (typeof product_id !== 'string' || !UUID.test(product_id) || typeof in_stock !== 'boolean'
      || (until !== undefined && until !== null && until !== 'next_cutoff')) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const supabase = await createClient();
    let inStockUntil: string | null = null;
    if (!in_stock && until === 'next_cutoff') {
      const { data: r } = await supabase
        .from('restaurants')
        .select('timezone, day_cutoff')
        .eq('id', tenant.restaurantId)
        .maybeSingle();
      inStockUntil = nextCutoffInstant(new Date(), r?.timezone as string | null, r?.day_cutoff as string | null).toISOString();
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update(in_stock ? { in_stock } : { in_stock, in_stock_until: inStockUntil })
      .eq('id', product_id)
      .eq('restaurant_id', tenant.restaurantId)
      .select('id');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Antes respondía "ok" aunque el plato no existiera (o fuera de otra tienda): la pantalla creía que se guardó.
    if (!updated || updated.length === 0) return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 });

    await revalidatePublicMenuForRestaurant(supabase, tenant.restaurantId);
    return NextResponse.json({ success: true, in_stock_until: inStockUntil });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
