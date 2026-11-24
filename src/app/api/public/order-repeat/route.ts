export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('public:order-repeat');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/public/order-repeat?o=<orderId>&t=<customer_token>
 *
 * El botón "Pedir lo mismo" de los emails de marketing abre el menú con
 * ?repeat=…&t=…; el menú pide acá las líneas del pedido y las vuelve a armar
 * con los precios y opciones de HOY (lib/reorder), en cualquier dispositivo.
 *
 * Admin client a propósito: el comensal no tiene sesión. La llave es el
 * customer_token del pedido (el mismo del link de seguimiento), y la respuesta
 * trae solo platos, opciones y notas — nada de datos personales.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = await checkRateLimitAsync(`order-repeat:${ip}`, { limit: 10, windowSec: 60 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const sp = new URL(request.url).searchParams;
  const orderId = sp.get('o');
  const token = sp.get('t');
  if (!orderId || !UUID_RE.test(orderId) || !token || !UUID_RE.test(token)) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  }

  try {
    const db = createAdminClient();
    const { data: order, error } = await db
      .from('orders')
      .select('id, restaurant_id, created_at')
      .eq('id', orderId)
      .eq('customer_token', token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: rows, error: itemsErr } = await db
      .from('order_items')
      .select('id, product_id, variant_id, qty, notes, product_name, variant_name, product_variants ( price_delta ), order_item_modifiers ( group_id, option_id )')
      .eq('order_id', order.id);
    if (itemsErr) throw new Error(itemsErr.message);

    type Row = {
      product_id: string;
      variant_id: string | null;
      qty: number;
      notes: string | null;
      product_name: string | null;
      variant_name: string | null;
      product_variants: { price_delta: number | string | null } | null;
      order_item_modifiers: { group_id: string | null; option_id: string | null }[];
    };
    const items = ((rows ?? []) as unknown as Row[]).map((r) => {
      const groups = new Map<string, string[]>();
      for (const m of r.order_item_modifiers ?? []) {
        if (!m.group_id || !m.option_id) continue;
        const list = groups.get(m.group_id) ?? [];
        list.push(m.option_id);
        groups.set(m.group_id, list);
      }
      return {
        productId: r.product_id,
        productName: r.product_name || '',
        variantId: r.variant_id,
        variantName: r.variant_name || null,
        variantPriceDelta: r.product_variants?.price_delta != null ? Number(r.product_variants.price_delta) : null,
        qty: Number(r.qty) || 1,
        modifiers: Array.from(groups, ([groupId, optionIds]) => ({ groupId, optionIds })),
        notes: r.notes || undefined,
      };
    });

    return NextResponse.json(
      { restaurantId: order.restaurant_id, date: order.created_at, items },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    logger.error('order-repeat failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
