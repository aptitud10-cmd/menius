export const dynamic = 'force-dynamic';

/**
 * Pedidos de prueba de una tienda (solo admin). Ver lib/orders/test-orders.ts.
 *
 * GET  ?restaurantId=…  → los últimos 300 pedidos, con `deletable`.
 * POST { restaurantId, orderIds } → respalda (pedidos + todo lo que cuelga de
 *      ellos) y borra. Devuelve el respaldo: la página lo descarga como archivo.
 *      Rechaza la tanda entera si algún pedido no es de esa tienda o tiene
 *      plata real de por medio.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { isSameOriginJson } from '@/lib/device-pairing';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { MAX_TEST_ORDERS_PER_DELETE, ORDER_CHILD_TABLES, canDeleteAsTest } from '@/lib/orders/test-orders';

const logger = createLogger('admin-test-orders');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { 'Cache-Control': 'no-store' };
/** Ids por consulta: 100 uuids ≈ 3.7 KB de URL, lejos de los límites de PostgREST. */
const CHUNK = 100;

function chunks<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
  return out;
}

export async function GET(req: Request) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const restaurantId = new URL(req.url).searchParams.get('restaurantId') ?? '';
  if (!UUID.test(restaurantId)) return NextResponse.json({ error: 'restaurantId inválido' }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from('orders')
    .select('id, order_number, customer_name, total, status, payment_method, payment_status, payment_intent_id, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(MAX_TEST_ORDERS_PER_DELETE);
  if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 });

  const orders = (data ?? []).map(({ payment_intent_id, ...o }) => ({
    ...o,
    deletable: canDeleteAsTest({ payment_status: o.payment_status as string | null, payment_intent_id: payment_intent_id as string | null }),
  }));
  return NextResponse.json({ orders }, { headers: NO_STORE });
}

export async function POST(req: Request) {
  if (!isSameOriginJson(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { restaurantId?: unknown; orderIds?: unknown } | null;
  const restaurantId = body?.restaurantId;
  const ids = body?.orderIds;
  if (typeof restaurantId !== 'string' || !UUID.test(restaurantId)) {
    return NextResponse.json({ error: 'restaurantId inválido' }, { status: 400 });
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_TEST_ORDERS_PER_DELETE
    || !ids.every((x): x is string => typeof x === 'string' && UUID.test(x))) {
    return NextResponse.json({ error: `orderIds: entre 1 y ${MAX_TEST_ORDERS_PER_DELETE} ids válidos` }, { status: 400 });
  }
  const orderIds = Array.from(new Set(ids));
  const db = createAdminClient();

  try {
    // 1. Los pedidos, solo de ESTA tienda, completos (van al respaldo).
    const orders: Record<string, unknown>[] = [];
    for (const part of chunks(orderIds)) {
      const { data, error } = await db.from('orders').select('*').eq('restaurant_id', restaurantId).in('id', part);
      if (error) throw new Error(`orders: ${error.message}`);
      orders.push(...(data ?? []));
    }
    if (orders.length !== orderIds.length) {
      return NextResponse.json({ error: 'Algún pedido no existe o no es de esta tienda. No se borró nada.' }, { status: 400 });
    }
    const blocked = orders.filter((o) => !canDeleteAsTest({
      payment_status: (o.payment_status as string | null) ?? null,
      payment_intent_id: (o.payment_intent_id as string | null) ?? null,
    }));
    if (blocked.length > 0) {
      return NextResponse.json({
        error: `${blocked.length} pedido(s) tienen un cobro real: se cancelan o reembolsan, no se borran. No se borró nada.`,
      }, { status: 409 });
    }

    // 2. Respaldo de todo lo que cuelga de esos pedidos.
    const backup: Record<string, unknown> = {
      kind: 'menius-test-orders-backup', restaurant_id: restaurantId, taken_at: new Date().toISOString(), orders,
    };
    for (const table of ORDER_CHILD_TABLES) {
      const rows: unknown[] = [];
      for (const part of chunks(orderIds)) {
        const { data, error } = await db.from(table).select('*').in('order_id', part);
        if (error) throw new Error(`${table}: ${error.message}`);
        rows.push(...(data ?? []));
      }
      backup[table] = rows;
    }

    // 3. Borrar. reviews es SET NULL (quedaría una reseña de prueba suelta en el menú)
    //    y print_jobs no tiene FK: van a mano. El resto cae en cascada con orders.
    for (const part of chunks(orderIds)) {
      for (const table of ['reviews', 'print_jobs'] as const) {
        const { error } = await db.from(table).delete().in('order_id', part);
        if (error) throw new Error(`${table} delete: ${error.message}`);
      }
      const { error } = await db.from('orders').delete().eq('restaurant_id', restaurantId).in('id', part);
      if (error) throw new Error(`orders delete: ${error.message}`);
    }

    logger.info('test orders deleted', { restaurantId, count: orderIds.length, by: auth.user.id });
    return NextResponse.json({ deleted: orderIds.length, backup }, { headers: NO_STORE });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error('test orders delete failed', { restaurantId, message });
    captureError(e, { route: 'admin/test-orders', restaurantId });
    return NextResponse.json({ error: 'No se pudo completar. Revisá la lista: puede que se haya borrado una parte.' }, { status: 500 });
  }
}
