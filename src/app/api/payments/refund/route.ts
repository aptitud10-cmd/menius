export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { getStripe } from '@/lib/stripe';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { broadcastOrderUpdate } from '@/lib/realtime/broadcast-order';

const logger = createLogger('payments:refund');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenant({ ownerOnly: true });
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const { order_id, reason } = body;
    // Motivo escrito por el restaurante (opcional): se guarda como en una cancelación normal.
    const cancellationReason = typeof body.cancellation_reason === 'string'
      ? body.cancellation_reason.trim().slice(0, 300) || null
      : null;

    if (!order_id || typeof order_id !== 'string' || !UUID_RE.test(order_id)) {
      return NextResponse.json({ error: 'order_id inválido' }, { status: 400 });
    }

    const ALLOWED_REASONS = ['duplicate', 'fraudulent', 'requested_by_customer'];
    const refundReason: string = ALLOWED_REASONS.includes(reason) ? reason : 'requested_by_customer';

    const adminDb = createAdminClient();

    // Fetch order — verify it belongs to this tenant's restaurant
    const { data: order, error: orderErr } = await adminDb
      .from('orders')
      .select('id, order_number, total, payment_status, payment_intent_id, status, promo_code, restaurant_id, customer_name, customer_email, customer_phone, order_type, delivery_address, driver_tracking_token, restaurants(stripe_account_id, stripe_onboarding_complete, commission_plan)')
      .eq('id', order_id)
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Esta orden no tiene un pago confirmado.' }, { status: 409 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Esta orden ya fue cancelada.' }, { status: 409 });
    }

    // Wompi y Mercado Pago no tienen reembolso automático aquí (no guardamos su
    // llave privada): se cancela y el restaurante devuelve el pago desde su
    // panel. Antes la ruta respondía "no tiene Stripe" y el pedido pagado
    // quedaba trabado: no se podía cancelar de ninguna forma.
    const txId = String(order.payment_intent_id ?? '');
    if (!txId.startsWith('pi_')) {
      const provider = /^\d+$/.test(txId) ? 'Mercado Pago' : 'Wompi';
      const { error: cancelErr } = await adminDb
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          ...(cancellationReason ? { cancellation_reason: cancellationReason } : {}),
        })
        .eq('id', order.id)
        .neq('status', 'cancelled');
      if (cancelErr) {
        logger.error('Manual-refund cancel failed', { orderId: order.id, error: cancelErr.message });
        return NextResponse.json({ error: 'No se pudo cancelar la orden.' }, { status: 500 });
      }
      await afterCancel(adminDb, order, cancellationReason);
      logger.info('Order cancelled — manual refund pending', { orderId: order.id, provider });
      return NextResponse.json({
        success: true,
        manual_refund: { provider, transaction_id: txId || null, amount: Number(order.total) },
      });
    }

    const rest = (order as any).restaurants;
    if (!rest?.stripe_onboarding_complete || !rest?.stripe_account_id) {
      return NextResponse.json({ error: 'El restaurante no tiene Stripe configurado.' }, { status: 422 });
    }

    const stripe = getStripe();

    // Destination charges are created on the platform account (transfer_data.destination).
    // Refunds must also be issued from the platform — no stripeAccount header.
    // Stripe does NOT reverse the transfer by default: without reverse_transfer the
    // restaurant keeps the funds and the platform balance covers the refund.
    // refund_application_fee stays false: Stripe doesn't return its processing fee
    // on refunds, and the application fee is what covers it.
    let refund: Awaited<ReturnType<typeof stripe.refunds.create>>;
    try {
      refund = await stripe.refunds.create({
        payment_intent: order.payment_intent_id,
        reason: refundReason as 'duplicate' | 'fraudulent' | 'requested_by_customer',
        reverse_transfer: true,
        refund_application_fee: false,
      });
    } catch (stripeErr: unknown) {
      // With reverse_transfer, Stripe returns an error (instead of a pending refund)
      // when the connected account's balance can't cover the reversal.
      logger.error('Stripe refund rejected', {
        orderId: order.id,
        error: stripeErr instanceof Error ? stripeErr.message : String(stripeErr),
      });
      captureError(stripeErr, { route: '/api/payments/refund', orderId: order.id });
      return NextResponse.json(
        { error: 'Stripe rechazó el reembolso. Si el saldo de tu cuenta de Stripe no alcanza para cubrirlo, espera a recibir nuevos pagos o contacta soporte.' },
        { status: 502 },
      );
    }

    if (refund.status === 'failed') {
      logger.error('Stripe refund failed', { orderId: order.id, refundId: refund.id });
      return NextResponse.json({ error: 'El reembolso falló en Stripe. Intenta manualmente desde el dashboard.' }, { status: 502 });
    }

    // Mark order as refunded
    const { error: updateErr } = await adminDb
      .from('orders')
      .update({
        payment_status: 'refunded',
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        ...(cancellationReason ? { cancellation_reason: cancellationReason } : {}),
      })
      .eq('id', order.id);

    if (updateErr) {
      // Refund went through on Stripe but DB update failed — log with urgency
      logger.error('Refund issued but DB update failed — MANUAL INTERVENTION REQUIRED', {
        orderId: order.id,
        refundId: refund.id,
        error: updateErr.message,
      });
      captureError(new Error('Refund DB sync failure'), { orderId: order.id, refundId: refund.id });
      return NextResponse.json({ error: 'Reembolso procesado en Stripe pero no se pudo actualizar la orden. Contacta soporte.' }, { status: 500 });
    }

    await afterCancel(adminDb, order, cancellationReason);

    logger.info('Order refunded', { orderId: order.id, orderNumber: order.order_number, refundId: refund.id });

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      status: refund.status,
      amount: Number(order.total),
    });
  } catch (err: unknown) {
    captureError(err, { route: '/api/payments/refund' });
    logger.error('Refund error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno al procesar el reembolso.' }, { status: 500 });
  }
}

type RefundableOrder = {
  id: string; order_number: string; status: string; restaurant_id: string;
  promo_code?: string | null; driver_tracking_token?: string | null;
  customer_name?: string | null; customer_email?: string | null; customer_phone?: string | null;
  order_type?: string | null; delivery_address?: string | null;
};

/** Lo mismo que una cancelación normal: promo, tiempo real, historial y aviso al cliente. */
async function afterCancel(adminDb: ReturnType<typeof createAdminClient>, order: RefundableOrder, cancellationReason: string | null) {
  // Release the promo usage this order consumed so a cancelled order doesn't
  // permanently eat into the campaign's budget. Fire-and-forget: the refund
  // already succeeded; a failed decrement must not fail the request.
  if (order.promo_code) {
    adminDb
      .rpc('decrement_promo_usage', { p_code: order.promo_code, p_restaurant_id: order.restaurant_id })
      .then(({ error: decErr }) => {
        if (decErr) logger.warn('promo decrement failed on refund', { orderId: order.id, error: decErr.message });
      });
  }

  // Igual que una cancelación normal (updateOrderStatus): la página de
  // seguimiento se entera al instante, queda el historial y el cliente recibe
  // el aviso. Antes el cliente que había pagado no se enteraba de nada.
  void broadcastOrderUpdate(order.id, 'cancelled');
  // Igual que updateOrderStatus: sin caché, el GPS del repartidor de un pedido
  // cancelado se rechaza en el próximo ping.
  const refundDriverToken = (order as { driver_tracking_token?: string | null }).driver_tracking_token;
  if (refundDriverToken) {
    const { evictTokenCache } = await import('@/lib/tracking/token-cache');
    evictTokenCache(refundDriverToken.slice(0, 16)).catch(() => {});
  }
  void adminDb
    .from('order_status_history')
    .insert({ order_id: order.id, from_status: order.status, to_status: 'cancelled', note: cancellationReason })
    .then(({ error: histErr }) => {
      if (histErr) logger.warn('status history insert failed on refund', { orderId: order.id, error: histErr.message });
    });
  try {
    const o = order as typeof order & {
      customer_name: string | null; customer_email: string | null; customer_phone: string | null;
      order_type: string | null; delivery_address: string | null;
    };
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
      deliveryAddress: o.delivery_address || undefined,
    });
  } catch (notifyErr) {
    // El reembolso ya se hizo: un aviso fallido no debe fallar la respuesta.
    logger.error('refund: customer notification failed', { orderId: order.id });
    captureError(notifyErr, { route: '/api/payments/refund', orderId: order.id, step: 'notify' });
  }
}
