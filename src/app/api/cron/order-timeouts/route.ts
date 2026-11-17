/**
 * Tiempos límite de pedidos abiertos (reglas en lib/orders/order-timeouts.ts).
 * Reemplaza a auto-complete-pickup, que solo cubría pickups en Listo y en
 * producción no cerró ninguno.
 *
 * - Sin aceptar 15 min → cancelado ('not_accepted') + aviso al cliente
 *   (seguimiento en vivo, push y email). El stock y los puntos vuelven solos
 *   (triggers de cancelación en la base).
 * - Aceptado y olvidado → cerrado en silencio ('auto_closed').
 *
 * Corre cada 10 minutos (vercel.json) y SIEMPRE deja una línea en el log, para
 * poder confirmar que corre (el anterior solo escribía si cerraba algo).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { broadcastOrderUpdate } from '@/lib/realtime/broadcast-order';
import { OPEN_ORDER_STATUSES } from '@/lib/order-state';
import {
  classifyTimeout,
  NOT_ACCEPTED_REASON,
  AUTO_CLOSED_REASON,
  type TimeoutOrder,
} from '@/lib/orders/order-timeouts';

const logger = createLogger('order-timeouts', { report: true });

type Row = TimeoutOrder & {
  id: string;
  order_number: string;
  restaurant_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  driver_tracking_token: string | null;
};

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const now = Date.now();

  const { data, error } = await db
    .from('orders')
    .select('id, order_number, restaurant_id, status, order_type, payment_method, payment_status, scheduled_for, created_at, updated_at, prepared_at, customer_name, customer_email, customer_phone, driver_tracking_token')
    .in('status', OPEN_ORDER_STATUSES)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) {
    logger.error('fetch failed', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cancelled: string[] = [];
  const closed: string[] = [];
  const failed: string[] = [];

  for (const o of (data ?? []) as Row[]) {
    const action = classifyTimeout(o, now);
    if (!action) continue;

    const to = action.kind === 'cancel_not_accepted' ? 'cancelled' : action.to;
    const reason = action.kind === 'cancel_not_accepted' ? NOT_ACCEPTED_REASON : AUTO_CLOSED_REASON;
    const stamp = new Date().toISOString();

    // Cambio de sistema, fuera de la máquina de estados del personal (como el
    // cron anterior): p. ej. 'almost_ready' → 'delivered' no es un botón del
    // Counter. El .eq('status') evita pisar un cambio hecho mientras tanto.
    const { data: rows, error: upErr } = await db
      .from('orders')
      .update({ status: to, updated_at: stamp, cancellation_reason: reason })
      .eq('id', o.id)
      .eq('status', o.status)
      .select('id');

    if (upErr) {
      failed.push(o.order_number);
      logger.error('update failed', { orderId: o.id, error: upErr.message });
      continue;
    }
    if (!rows?.length) continue; // el mostrador lo movió justo ahora

    (action.kind === 'cancel_not_accepted' ? cancelled : closed).push(o.order_number);

    const { error: histErr } = await db.from('order_status_history').insert({
      order_id: o.id,
      from_status: o.status,
      to_status: to,
      note: reason,
    });
    if (histErr) logger.warn('history insert failed', { orderId: o.id, error: histErr.message });

    await broadcastOrderUpdate(o.id, to).catch(() => {});

    if (o.driver_tracking_token) {
      const { evictTokenCache } = await import('@/lib/tracking/token-cache');
      await evictTokenCache(o.driver_tracking_token.slice(0, 16)).catch(() => {});
    }

    if (action.kind === 'cancel_not_accepted' && action.notify) {
      try {
        const { notifyStatusChange } = await import('@/lib/notifications/order-notifications');
        await notifyStatusChange({
          orderId: o.id,
          orderNumber: o.order_number,
          restaurantId: o.restaurant_id,
          status: 'cancelled',
          customerName: o.customer_name ?? '',
          customerEmail: o.customer_email || undefined,
          customerPhone: o.customer_phone || undefined,
          orderType: o.order_type || undefined,
        });
      } catch (err) {
        logger.warn('notify failed', { orderId: o.id, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  logger.info('order-timeouts done', {
    open: data?.length ?? 0,
    cancelled: cancelled.length,
    closed: closed.length,
    failed: failed.length,
    ...(cancelled.length ? { cancelledOrders: cancelled } : {}),
    ...(closed.length ? { closedOrders: closed } : {}),
  });
  return NextResponse.json({ cancelled, closed, failed });
}
