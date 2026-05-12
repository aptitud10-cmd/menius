export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { getStripe } from '@/lib/stripe';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';

const logger = createLogger('payments:refund');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const { order_id, reason } = body;

    if (!order_id || typeof order_id !== 'string' || !UUID_RE.test(order_id)) {
      return NextResponse.json({ error: 'order_id inválido' }, { status: 400 });
    }

    const ALLOWED_REASONS = ['duplicate', 'fraudulent', 'requested_by_customer'];
    const refundReason: string = ALLOWED_REASONS.includes(reason) ? reason : 'requested_by_customer';

    const adminDb = createAdminClient();

    // Fetch order — verify it belongs to this tenant's restaurant
    const { data: order, error: orderErr } = await adminDb
      .from('orders')
      .select('id, order_number, total, payment_status, payment_intent_id, status, restaurant_id, restaurants(stripe_account_id, stripe_onboarding_complete, commission_plan)')
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

    if (!order.payment_intent_id) {
      return NextResponse.json({ error: 'No se encontró el PaymentIntent para esta orden. Realiza el reembolso manualmente desde Stripe.' }, { status: 422 });
    }

    const rest = (order as any).restaurants;
    const connectedAccount: string | null = rest?.stripe_onboarding_complete ? (rest?.stripe_account_id ?? null) : null;

    if (!connectedAccount) {
      return NextResponse.json({ error: 'El restaurante no tiene Stripe configurado.' }, { status: 422 });
    }

    const stripe = getStripe();

    // For destination charges, refund must go through the connected account
    // The platform fee (if any) is refunded proportionally by Stripe automatically
    const refund = await stripe.refunds.create(
      {
        payment_intent: order.payment_intent_id,
        reason: refundReason as 'duplicate' | 'fraudulent' | 'requested_by_customer',
      },
      { stripeAccount: connectedAccount }
    );

    if (refund.status === 'failed') {
      logger.error('Stripe refund failed', { orderId: order.id, refundId: refund.id });
      return NextResponse.json({ error: 'El reembolso falló en Stripe. Intenta manualmente desde el dashboard.' }, { status: 502 });
    }

    // Mark order as refunded
    const { error: updateErr } = await adminDb
      .from('orders')
      .update({ payment_status: 'refunded', status: 'cancelled' })
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
