export const dynamic = 'force-dynamic';

/**
 * Tanda 3 del Counter: cambiar el precio de un plato desde la pestaña "Menú".
 *
 * POST { product_id, price, expected, confirm_big?, is_undo? }
 *  - Tablet vinculada: necesita el PIN del dueño (panel desbloqueado 10 min con
 *    POST /api/devices/panel). Sin eso responde 403 { error: 'pin_required' } y la
 *    pantalla pide el PIN y reintenta.
 *  - Sesión del dueño (celular/computadora): pasa directo.
 *  - `expected` = el precio que la persona vio. Si otra tablet o el panel lo cambió
 *    entretanto, 409 { error: 'changed', price } y no se pisa.
 *  - Un cambio de más de ±50 % exige confirm_big (la pantalla pide confirmar dos
 *    veces): frena el "$1.395 en vez de $13.95".
 * Los pedidos siempre recalculan el precio desde la base (api/orders), así que un
 * carrito abierto con el precio viejo no paga ese precio.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { getDeviceSession } from '@/lib/auth/device-session';
import { isSameOriginJson } from '@/lib/device-pairing';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { revalidatePublicMenuForRestaurant } from '@/lib/revalidate-public-menu';
import { captureError } from '@/lib/error-reporting';
import { createLogger } from '@/lib/logger';
import { MAX_PRICE, isBigChange, toCents as cents } from '@/lib/price-change';

const logger = createLogger('counter-price');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const productId = body?.product_id;
    const price = body?.price;
    const expected = body?.expected;
    if (typeof productId !== 'string' || !UUID.test(productId)
      || typeof price !== 'number' || !Number.isFinite(price)
      || typeof expected !== 'number' || !Number.isFinite(expected)) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    const newPrice = cents(price);
    if (newPrice <= 0 || newPrice > MAX_PRICE) return NextResponse.json({ error: 'out_of_range' }, { status: 400 });

    const tenant = await getTenant({ allowDevice: true });
    if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    // isDevice = tablet SIN el panel abierto por PIN.
    if (tenant.isDevice) return NextResponse.json({ error: 'pin_required' }, { status: 403, headers: NO_STORE });

    const { allowed } = await checkRateLimitAsync(`counter-price:r:${tenant.restaurantId}`, { limit: 120, windowSec: 600 });
    if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

    const supabase = await createClient();
    const { data: row, error: readError } = await supabase
      .from('products')
      .select('id, price')
      .eq('id', productId)
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const oldPrice = Number(row.price);
    // Sin redondear `expected`: la pantalla manda el mismo número que leyó de la base.
    if (Math.abs(oldPrice - expected) > 0.0001) {
      return NextResponse.json({ error: 'changed', price: oldPrice }, { status: 409, headers: NO_STORE });
    }
    if (Math.abs(oldPrice - newPrice) < 0.004) return NextResponse.json({ ok: true, price: oldPrice, old_price: oldPrice }, { headers: NO_STORE });
    if (isBigChange(oldPrice, newPrice) && body?.confirm_big !== true) {
      return NextResponse.json({ error: 'needs_confirm', price: oldPrice }, { status: 422, headers: NO_STORE });
    }

    // Condicionado al precio leído: si otra tablet lo cambió en este instante, no se pisa.
    const { data: updated, error: updError } = await supabase
      .from('products')
      .update({ price: newPrice })
      .eq('id', productId)
      .eq('restaurant_id', tenant.restaurantId)
      .eq('price', row.price)
      .select('id');
    if (updError) throw new Error(updError.message);
    if (!updated || updated.length === 0) {
      const { data: now } = await supabase.from('products').select('price').eq('id', productId).maybeSingle();
      return NextResponse.json({ error: 'changed', price: Number(now?.price ?? oldPrice) }, { status: 409, headers: NO_STORE });
    }

    // Registro: si falla (p. ej. migración 20261122 sin aplicar) el precio ya cambió; se avisa y se sigue.
    const device = await getDeviceSession(supabase);
    const { error: logError } = await createAdminClient().from('price_change_log').insert({
      restaurant_id: tenant.restaurantId,
      product_id: productId,
      old_price: oldPrice,
      new_price: newPrice,
      source: device.isTablet ? 'tablet' : 'owner',
      is_undo: body?.is_undo === true,
      session_id: device.sessionId,
      user_id: tenant.userId,
    });
    if (logError) {
      logger.error('price log failed', { error: logError.message });
      captureError(new Error(`price_change_log: ${logError.message}`), { route: '/api/counter/price', restaurantId: tenant.restaurantId });
    }

    await revalidatePublicMenuForRestaurant(supabase, tenant.restaurantId);
    return NextResponse.json({ ok: true, price: newPrice, old_price: oldPrice }, { headers: NO_STORE });
  } catch (err: unknown) {
    logger.error('price change failed', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/counter/price' });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
