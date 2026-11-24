/**
 * Tiempos límite de pedidos abiertos (reglas en lib/orders/order-timeouts.ts).
 * Reemplaza a auto-complete-pickup, que solo cubría pickups en Listo y en
 * producción no cerró ninguno.
 *
 * - Sin aceptar 15 min → cancelado ('not_accepted') + aviso al cliente
 *   (seguimiento en vivo, push y email). El stock y los puntos vuelven solos
 *   (triggers de cancelación en la base).
 * - Sin aceptar 15 min y YA PAGADO con Stripe → cancelado + reembolso total
 *   (Fase C). Primero se cancela con guarda de estado (si el mostrador lo
 *   acepta en ese mismo segundo, no se toca) y después se reembolsa. Si Stripe
 *   falla, el pedido queda cancelado y pagado: se reintenta en cada vuelta.
 * - Aceptado y olvidado → cerrado en silencio ('auto_closed').
 * - Pickup en Listo 30 min → dado por retirado ('pickup_done'), en silencio; entra
 *   en el email de reseña. Ya no hay recordatorio "tu pedido te espera" a los
 *   20 min: en el mostrador nadie marca "recogido" y le llegaba a todos.
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
import { captureError } from '@/lib/error-reporting';
import { refundStripePayment, isAlreadyRefundedError, refundRetryKey, hasFailedRefund } from '@/lib/payments/stripe-refund';
import {
  classifyTimeout,
  needsRefundRetry,
  NOT_ACCEPTED_REASON,
  AUTO_CLOSED_REASON,
  PICKUP_DONE_REASON,
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
  payment_intent_id: string | null;
};

type Db = ReturnType<typeof createAdminClient>;

/**
 * Reembolso total de un pedido no aceptado. Idempotente: misma clave por
 * PaymentIntent, y "ya reembolsado" cuenta como éxito. Devuelve true si el
 * pedido quedó marcado 'refunded'.
 */
async function refundNotAccepted(db: Db, o: { id: string; order_number: string; payment_intent_id: string }): Promise<boolean> {
  try {
    const refund = await refundStripePayment(o.payment_intent_id, {
      reason: 'requested_by_customer',
      // Clave por hora: un rechazo por saldo se reintenta de verdad cada hora.
      idempotencyKey: refundRetryKey('not-accepted-refund', o.payment_intent_id),
      metadata: { order_id: o.id, reason: NOT_ACCEPTED_REASON },
    });
    if (refund.status === 'failed' || refund.status === 'canceled') {
      throw new Error(`refund ${refund.id} ${refund.status}`);
    }
  } catch (err) {
    if (!isAlreadyRefundedError(err)) {
      logger.error('not-accepted refund FAILED: customer paid, order cancelled, money not returned yet', {
        orderId: o.id, orderNumber: o.order_number, error: err instanceof Error ? err.message : String(err),
      });
      captureError(err, { route: '/api/cron/order-timeouts', orderId: o.id, step: 'not-accepted-refund' });
      return false;
    }
  }
  const { error } = await db
    .from('orders')
    .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
    .eq('id', o.id)
    .eq('payment_status', 'paid');
  if (error) {
    // El dinero ya volvió; la próxima vuelta lo reintenta y Stripe dirá "ya reembolsado".
    logger.error('refund ok but DB update failed', { orderId: o.id, error: error.message });
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const now = Date.now();

  const { data, error } = await db
    .from('orders')
    .select('id, order_number, restaurant_id, status, order_type, payment_method, payment_status, payment_intent_id, scheduled_for, created_at, updated_at, prepared_at, customer_arrived_at, customer_name, customer_email, customer_phone, driver_tracking_token')
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
  const refunded: string[] = [];
  const refundFailed: string[] = [];
  const refundNeedsHuman: string[] = [];

  // Reintentos: cancelados por no aceptados que siguen cobrados (Stripe falló
  // en una vuelta anterior). Ventana de 30 días: más atrás ya es caso manual.
  const { data: stuck, error: stuckErr } = await db
    .from('orders')
    .select('id, order_number, status, payment_status, cancellation_reason, payment_intent_id')
    .eq('status', 'cancelled')
    .eq('payment_status', 'paid')
    .eq('cancellation_reason', NOT_ACCEPTED_REASON)
    .gte('updated_at', new Date(now - 30 * 24 * 60 * 60_000).toISOString())
    .order('updated_at', { ascending: false })
    .limit(50);
  if (stuckErr) logger.error('refund retry fetch failed', { error: stuckErr.message });
  for (const o of stuck ?? []) {
    if (!needsRefundRetry(o)) continue;
    // Si el banco ya rechazó un reembolso (tarjeta cerrada, perdida…), volver
    // a mandarlo a la misma tarjeta falla igual y se repetía todos los días.
    // Lo resuelve una persona: refund.failed ya mandó el email a los admins.
    try {
      if (await hasFailedRefund(o.payment_intent_id as string)) {
        refundNeedsHuman.push(o.order_number);
        continue;
      }
    } catch (err) {
      logger.warn('refund list failed — retry skipped this round', { orderId: o.id, error: err instanceof Error ? err.message : String(err) });
      continue;
    }
    const ok = await refundNotAccepted(db, { id: o.id, order_number: o.order_number, payment_intent_id: o.payment_intent_id as string });
    (ok ? refunded : refundFailed).push(o.order_number);
  }

  for (const o of (data ?? []) as Row[]) {
    const action = classifyTimeout(o, now);
    if (!action) continue;

    const cancels = action.kind === 'cancel_not_accepted' || action.kind === 'refund_not_accepted';
    const to = cancels ? 'cancelled' : action.kind === 'pickup_done' ? 'delivered' : action.to;
    const reason = cancels ? NOT_ACCEPTED_REASON : action.kind === 'pickup_done' ? PICKUP_DONE_REASON : AUTO_CLOSED_REASON;
    const stamp = new Date().toISOString();

    // Cambio de sistema, fuera de la máquina de estados del personal (como el
    // cron anterior): p. ej. 'almost_ready' → 'delivered' no es un botón del
    // Counter. El .eq('status') evita pisar un cambio hecho mientras tanto; en
    // un pedido pagado también exige que siga pagado (no reembolsado a mano).
    let update = db
      .from('orders')
      .update({ status: to, updated_at: stamp, cancellation_reason: reason })
      .eq('id', o.id)
      .eq('status', o.status);
    if (action.kind === 'refund_not_accepted') update = update.eq('payment_status', 'paid');
    const { data: rows, error: upErr } = await update.select('id');

    if (upErr) {
      failed.push(o.order_number);
      logger.error('update failed', { orderId: o.id, error: upErr.message });
      continue;
    }
    if (!rows?.length) continue; // el mostrador lo movió justo ahora

    (cancels ? cancelled : closed).push(o.order_number);

    // Reembolso antes del aviso: el email lee payment_status y dice
    // "reembolsado" o "reembolso en camino" según cómo quedó.
    if (action.kind === 'refund_not_accepted' && o.payment_intent_id) {
      const ok = await refundNotAccepted(db, { id: o.id, order_number: o.order_number, payment_intent_id: o.payment_intent_id });
      (ok ? refunded : refundFailed).push(o.order_number);
    }

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

    if (cancels && action.notify) {
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
    refunded: refunded.length,
    refundFailed: refundFailed.length,
    ...(refundFailed.length ? { refundFailedOrders: refundFailed } : {}),
    ...(refundNeedsHuman.length ? { refundNeedsHumanOrders: refundNeedsHuman } : {}),
    ...(cancelled.length ? { cancelledOrders: cancelled } : {}),
    ...(closed.length ? { closedOrders: closed } : {}),
  });
  return NextResponse.json({ cancelled, closed, failed, refunded, refundFailed, refundNeedsHuman });
}
