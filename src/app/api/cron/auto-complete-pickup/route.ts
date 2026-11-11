/**
 * Limpieza de pedidos para recoger olvidados en "Listo".
 *
 * Si el mostrador se olvida de tocar "Recogido", el pedido queda para siempre
 * en la columna Listos. Pasadas READY_TIMEOUT_MINS en 'ready' se cierra como
 * 'delivered' SIN avisar al cliente (no sabemos si de verdad lo retiró).
 *
 * Antes este cron además pasaba 'preparing' → 'ready' al vencer el tiempo
 * estimado y le mandaba al cliente "tu pedido está listo" aunque la cocina no
 * hubiera terminado, y cerraba como "recogido" (con email) a los 10 min. Se
 * quitó (2026-11): cuándo está listo lo decide el mostrador.
 *
 * Corre cada 10 minutos (vercel.json).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { broadcastOrderUpdate } from '@/lib/realtime/broadcast-order';

const logger = createLogger('auto-complete-pickup', { report: true });

const READY_TIMEOUT_MINS = 120;

/**
 * Hora en que el pedido quedó listo. updated_at la fija updateOrderStatus en
 * cada cambio de estado; en pedidos viejos (sin ese dato) quedó igual a
 * created_at, así que se toma la más tardía entre updated_at y prepared_at.
 */
function readySince(o: { updated_at: string | null; prepared_at: string | null; created_at: string }): number {
  return Math.max(
    new Date(o.updated_at ?? o.created_at).getTime(),
    o.prepared_at ? new Date(o.prepared_at).getTime() : 0,
  );
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminDb = createAdminClient();
    const now = Date.now();

    const { data: readyOrders, error: readyFetchErr } = await adminDb
      .from('orders')
      .select('id, updated_at, prepared_at, created_at')
      .eq('status', 'ready')
      .eq('order_type', 'pickup');

    if (readyFetchErr) {
      logger.error('fetch failed', { error: readyFetchErr.message });
      return NextResponse.json({ error: readyFetchErr.message }, { status: 500 });
    }

    const toClose = (readyOrders ?? []).filter(o => now - readySince(o) >= READY_TIMEOUT_MINS * 60_000);

    let closed = 0;
    if (toClose.length > 0) {
      const ids = toClose.map(o => o.id);
      const { data: closedRows, error: closeErr } = await adminDb
        .from('orders')
        .update({ status: 'delivered', updated_at: new Date().toISOString(), cancellation_reason: 'auto_closed' })
        .in('id', ids)
        .eq('status', 'ready') // por si el mostrador lo movió mientras tanto
        .select('id');

      if (closeErr) {
        logger.error('close failed', { error: closeErr.message, ids });
        return NextResponse.json({ error: closeErr.message }, { status: 500 });
      }
      const closedIds = (closedRows ?? []).map(r => r.id as string);
      closed = closedIds.length;
      for (const id of closedIds) broadcastOrderUpdate(id, 'delivered').catch(() => {});
      logger.info(`Closed ${closed} pickup orders forgotten in ready > ${READY_TIMEOUT_MINS} min`, { ids: closedIds });
    }

    return NextResponse.json({ closed });
  } catch (err) {
    logger.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
