export const dynamic = 'force-dynamic';

import { afterResponse } from "@/lib/server/after-response";
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getPaymentsWebhookSecret } from '@/lib/stripe';
import { captureError } from '@/lib/error-reporting';
import { sendPaymentConfirmedNotifications } from '@/lib/notifications/order-notifications';
import { internationalCardSurchargeCents } from '@/lib/order-pricing';
import { refundStripePayment, isAlreadyRefundedError, isStripePaymentIntent } from '@/lib/payments/stripe-refund';
import { NOT_ACCEPTED_REASON } from '@/lib/orders/order-timeouts';
import { sendEmail } from '@/lib/notifications/email';

const logger = createLogger('payments-webhook');

async function updateOrderPayment(orderId: string, status: 'paid' | 'failed', paymentIntent?: string) {
  const adminDb = createAdminClient();
  let q = adminDb
    .from('orders')
    .update({
      payment_status: status,
      // Hora del cobro: el aviso del panel solo suena por pagos recién entrados.
      ...(status === 'paid' ? { updated_at: new Date().toISOString() } : {}),
      ...(paymentIntent ? { payment_intent_id: paymentIntent } : {}),
    })
    .eq('id', orderId)
    .neq('payment_status', status);
  // Un evento tardío (session.expired, un intento fallido previo reintentado)
  // no puede pasar a 'failed' un pedido que ya se cobró.
  if (status === 'failed') q = q.neq('payment_status', 'paid');
  // Ni un reintento tardío de Stripe puede volver a 'paid' un pedido ya
  // reembolsado (Fase C): mandaría "pago confirmado" de un pedido cancelado.
  q = q.neq('payment_status', 'refunded');
  const { data, error } = await q.select('id, status, cancellation_reason').maybeSingle();

  if (error) {
    // Se relanza: el POST libera el evento y responde 500 para que Stripe
    // reintente. Antes se respondía 200 con el evento ya reclamado → el pedido
    // cobrado quedaba invisible y monitor-orders lo cancelaba a las 25 h.
    throw new Error(`Failed to update order ${orderId} payment status to ${status}: ${error.message}`);
  }

  if (!data) {
    logger.info('Order already in target payment status, skipping notifications', { orderId, status });
    if (status === 'paid' && paymentIntent) await refundIfDuplicatePayment(orderId, paymentIntent);
    return;
  }

  // Pago que llega para un pedido ya cancelado (sesión vieja pagada tarde,
  // reintento de Stripe): sin "pago confirmado" ni "nuevo pedido" en el panel,
  // y la plata vuelve sola.
  if (status === 'paid' && data.status === 'cancelled') {
    if (paymentIntent && data.cancellation_reason !== NOT_ACCEPTED_REASON) {
      await refundPaymentForCancelledOrder(orderId, paymentIntent);
    }
    return;
  }

  // Send payment confirmed notifications (non-blocking)
  if (status === 'paid') {
    afterResponse(() => sendPaymentConfirmedNotifications(orderId).catch((err) => {
      logger.error('sendPaymentConfirmedNotifications failed', { orderId, error: err?.message });
    }));
  }
}

/**
 * Cobro doble: el pedido ya estaba pagado con OTRO PaymentIntent (dos pestañas
 * de pago, Apple Pay y luego tarjeta, etc.). El segundo cobro se devuelve
 * completo y solo. Mismo PaymentIntent = el mismo pago avisado por dos eventos
 * (session.completed + payment_intent.succeeded) → no se toca.
 */
async function refundIfDuplicatePayment(orderId: string, paymentIntentId: string) {
  const { data: ord } = await createAdminClient()
    .from('orders')
    .select('payment_status, payment_intent_id, status, cancellation_reason')
    .eq('id', orderId)
    .maybeSingle();
  const kept = (ord as { payment_status?: string; payment_intent_id?: string | null; status?: string; cancellation_reason?: string | null } | null);
  // Mismo pago, pedido cancelado y todavía cobrado: un intento anterior de
  // devolverlo falló (el evento se reintenta) → se vuelve a intentar.
  if (
    kept?.payment_intent_id === paymentIntentId
    && kept.status === 'cancelled'
    && kept.payment_status === 'paid'
    && kept.cancellation_reason !== NOT_ACCEPTED_REASON
  ) {
    await refundPaymentForCancelledOrder(orderId, paymentIntentId);
    return;
  }
  // 'refunded' también: el pedido ya se canceló y devolvió (Fase C), así que un
  // segundo cobro con otro PaymentIntent no tiene pedido que lo respalde.
  if (!kept || !['paid', 'refunded'].includes(kept.payment_status ?? '') || !kept.payment_intent_id || kept.payment_intent_id === paymentIntentId) return;
  try {
    const refund = await getStripe().refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: 'duplicate',
        reverse_transfer: true,
        refund_application_fee: false,
        metadata: { order_id: orderId, kept_payment_intent: kept.payment_intent_id },
      },
      { idempotencyKey: `dup-refund:${paymentIntentId}` },
    );
    logger.warn('Duplicate payment refunded', { orderId, refunded: paymentIntentId, kept: kept.payment_intent_id, refundId: refund.id });
  } catch (err) {
    // No se relanza: el pedido ya está pagado; el reembolso queda para revisión manual.
    logger.error('Duplicate payment refund failed', { orderId, paymentIntentId, error: err instanceof Error ? err.message : String(err) });
    captureError(err, { orderId, paymentIntentId, context: 'duplicate-payment-refund' });
  }
}

/**
 * El pedido ya estaba cancelado cuando llegó el cobro: se devuelve completo.
 * Los cancelados por "nadie aceptó" (not_accepted) no pasan por acá: esos los
 * reembolsa y reintenta el cron order-timeouts, y así no compiten dos caminos.
 * Si Stripe rechaza, se relanza → 500 → Stripe reintenta el evento y se vuelve
 * a intentar (refundIfDuplicatePayment detecta el caso en el reintento).
 */
async function refundPaymentForCancelledOrder(orderId: string, paymentIntentId: string) {
  if (!isStripePaymentIntent(paymentIntentId)) return;
  try {
    await refundStripePayment(paymentIntentId, {
      reason: 'requested_by_customer',
      // Clave por día (UTC), como el cron: Stripe guarda 24 h la respuesta de
      // una clave, errores incluidos; un reembolso total no se puede duplicar.
      idempotencyKey: `cancelled-order-refund:${paymentIntentId}:${new Date().toISOString().slice(0, 10)}`,
      metadata: { order_id: orderId, reason: 'paid_after_cancel' },
    });
  } catch (err) {
    if (!isAlreadyRefundedError(err)) throw err;
  }
  const { error } = await createAdminClient()
    .from('orders')
    .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('payment_status', 'paid');
  if (error) throw new Error(`refund ok but order ${orderId} not marked refunded: ${error.message}`);

  logger.warn('Payment for a cancelled order refunded automatically', { orderId, paymentIntentId });
  captureError(new Error('Payment arrived for a cancelled order — refunded automatically'), { orderId, paymentIntentId });
}

interface DisputeLike {
  id: string;
  amount: number;
  currency?: string;
  reason?: string;
  charge: string | { id: string };
  payment_intent?: string | { id: string } | null;
  status: string;
  evidence_details?: { due_by?: number | null } | null;
}

/**
 * Disputa nueva → email a los admins de MENIUS. Con destination charges la
 * responde la plataforma: si nadie presenta evidencia antes de `due_by`, se
 * pierde sola. Antes solo quedaba en Sentry, sin número de pedido.
 */
async function notifyDisputeOpened(dispute: DisputeLike) {
  const pi = idOf(dispute.payment_intent);
  let orderNumber: string | null = null;
  let restaurantName: string | null = null;
  let orderId: string | null = null;
  if (pi) {
    const { data: rows } = await createAdminClient()
      .from('orders')
      .select('id, order_number, restaurants(name)')
      .eq('payment_intent_id', pi)
      .limit(2);
    if (rows?.length === 1) {
      const row = rows[0] as { id: string; order_number: string; restaurants?: { name?: string } | { name?: string }[] | null };
      orderId = row.id;
      orderNumber = row.order_number;
      const rest = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
      restaurantName = rest?.name ?? null;
    }
  }

  const amount = `${(dispute.amount / 100).toFixed(2)} ${(dispute.currency ?? '').toUpperCase()}`.trim();
  const dueBy = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toLocaleString('es', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })
    : 'ver en Stripe';

  logger.warn('Stripe dispute opened', { disputeId: dispute.id, paymentIntent: pi, orderId, amount: dispute.amount });
  captureError(new Error('Stripe dispute opened'), { disputeId: dispute.id, paymentIntent: pi, orderId, orderNumber, amount: dispute.amount });

  const admins = (process.env.ADMIN_EMAIL ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  if (!admins.length) {
    logger.error('ADMIN_EMAIL not set — dispute email not sent', { disputeId: dispute.id });
    return;
  }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">${k}</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${esc(v)}</td></tr>`;
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
      <h2 style="color:#b91c1c;margin:0 0 8px;">Disputa abierta en Stripe</h2>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Un cliente desconoció un cargo. Si no se responde con evidencia antes de la fecha límite, se pierde sola.</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Restaurante', restaurantName ?? 'no encontrado')}
        ${row('Pedido', orderNumber ?? 'no encontrado')}
        ${row('Monto', amount)}
        ${row('Motivo', dispute.reason ?? '—')}
        ${row('Fecha límite', dueBy)}
        ${row('Disputa', dispute.id)}
      </table>
      <p style="margin-top:20px;"><a href="https://dashboard.stripe.com/disputes/${encodeURIComponent(dispute.id)}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Abrir en Stripe</a></p>
    </div>`;
  const subject = `⚠️ Disputa Stripe: ${orderNumber ?? dispute.id} — ${amount}`;
  for (const to of admins) {
    const sent = await sendEmail({ to, subject, html });
    if (!sent) logger.error('Dispute email not sent', { disputeId: dispute.id });
  }
}

const idOf = (v: string | { id: string } | null | undefined) =>
  typeof v === 'string' ? v : v?.id ?? null;

/**
 * Contracargos: responsabilidad del restaurante, no de MENIUS.
 * Con destination charges Stripe debita la disputa de la PLATAFORMA siempre
 * (docs: connect/destination-charges#handle-disputes). Si la disputa se pierde
 * — o el restaurante la acepta, que Stripe también marca como `lost` — se
 * recupera el monto revirtiendo el transfer a la cuenta conectada. Si se gana,
 * Stripe devuelve los fondos a la plataforma y no hay nada que revertir.
 *
 * La tarifa de disputa de Stripe NO se recupera acá: una reversión no puede
 * superar el monto transferido. Queda reportada para cobrarla aparte.
 */
async function reverseTransferForLostDispute(
  stripe: ReturnType<typeof getStripe>,
  dispute: DisputeLike,
) {
  const chargeId = idOf(dispute.charge);
  if (!chargeId) throw new Error(`Dispute ${dispute.id} has no charge`);

  const charge = await stripe.charges.retrieve(chargeId);
  const transferId = idOf(charge.transfer as string | { id: string } | null);
  if (!transferId) {
    // Pago sin transfer (no era destination charge): no hay de quién recuperar.
    logger.warn('Lost dispute without transfer — nothing to reverse', { disputeId: dispute.id, chargeId });
    return;
  }

  const transfer = await stripe.transfers.retrieve(transferId);
  const reversible = transfer.amount - transfer.amount_reversed;
  const amount = Math.min(dispute.amount, reversible);
  if (amount <= 0) {
    logger.info('Transfer already fully reversed', { disputeId: dispute.id, transferId });
    return;
  }

  await stripe.transfers.createReversal(
    transferId,
    { amount, metadata: { dispute_id: dispute.id, reason: 'dispute_lost' } },
    { idempotencyKey: `dispute-reversal:${dispute.id}` },
  );

  logger.warn('Lost dispute charged to restaurant via transfer reversal', {
    disputeId: dispute.id,
    transferId,
    destination: idOf(transfer.destination as string | { id: string } | null),
    amount,
  });
  captureError(new Error('Stripe dispute lost — amount recovered from restaurant; dispute fee still on MENIUS'), {
    disputeId: dispute.id,
    transferId,
    amount,
  });
}

/**
 * Tarjetas internacionales: Stripe cobra +1.5% a la plataforma y el país de la
 * tarjeta recién se conoce después del pago, así que no pudo ir en el
 * application_fee. Se recupera revirtiendo esa parte del transfer al restaurante.
 * Idempotente por charge: checkout.session.completed y payment_intent.succeeded
 * pueden llegar los dos para el mismo pago.
 */
async function recoverInternationalCardSurcharge(
  stripe: ReturnType<typeof getStripe>,
  paymentIntentId: string,
) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
  const charge = pi.latest_charge;
  if (!charge || typeof charge === 'string') return;

  const surcharge = internationalCardSurchargeCents(
    charge.amount,
    charge.currency,
    charge.payment_method_details?.card?.country,
    pi.metadata?.fee_model,
  );
  if (surcharge <= 0) return;

  const transferId = idOf(charge.transfer as string | { id: string } | null);
  if (!transferId) {
    logger.warn('International card without transfer — surcharge not recovered', { chargeId: charge.id });
    return;
  }

  // Si el pago ya se devolvió (pedido cancelado, Fase C) el transfer está
  // revertido entero: pedir más de lo que queda da error → 500 → Stripe
  // reintentaría el evento durante días.
  const transfer = await stripe.transfers.retrieve(transferId);
  const amount = Math.min(surcharge, transfer.amount - transfer.amount_reversed);
  if (amount <= 0) {
    logger.info('International card surcharge skipped — transfer already reversed', { chargeId: charge.id, transferId });
    return;
  }

  await stripe.transfers.createReversal(
    transferId,
    { amount, metadata: { charge_id: charge.id, reason: 'international_card_surcharge' } },
    { idempotencyKey: `intl-card-fee:${charge.id}` },
  );
  logger.info('International card surcharge recovered from restaurant', {
    chargeId: charge.id,
    country: charge.payment_method_details?.card?.country,
    surcharge: amount,
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = getPaymentsWebhookSecret();

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // ── Idempotency guard: claim the event BEFORE processing ──
    const adminDb = createAdminClient();
    const { error: claimErr } = await adminDb
      .from('processed_webhook_events')
      .insert({ event_id: event.id, event_type: event.type, processed_at: new Date().toISOString() });

    if (claimErr) {
      if ((claimErr as any).code === '23505') {
        logger.info('Duplicate payments webhook — skipping', { eventId: event.id });
        return NextResponse.json({ received: true });
      }
      logger.error('Failed to claim webhook event', { eventId: event.id, error: claimErr.message });
      return NextResponse.json({ error: 'claim failed' }, { status: 500 });
    }

    const session = event.data.object as any;
    const orderId = session.metadata?.order_id;

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          if (orderId && session.payment_status === 'paid') {
            // El monto cobrado tiene que cubrir el total del pedido. Si no, no se
            // marca pagado (el Counter lo mostraría como cobrado) y se avisa.
            const { data: ord } = await createAdminClient()
              .from('orders')
              .select('total')
              .eq('id', orderId)
              .maybeSingle();
            const expectedCents = ord ? Math.round(Number(ord.total) * 100) : null;
            if (expectedCents != null && typeof session.amount_total === 'number' && session.amount_total + 1 < expectedCents) {
              logger.error('Checkout amount below order total — not marking paid', { orderId, amountTotal: session.amount_total, expectedCents });
              captureError(new Error('Stripe checkout amount below order total'), { orderId, amountTotal: session.amount_total, expectedCents });
              break;
            }
            await updateOrderPayment(orderId, 'paid', session.payment_intent ?? '');
            if (session.payment_intent) {
              await recoverInternationalCardSurcharge(stripe, idOf(session.payment_intent) as string);
            }
          }
          break;
        }

        case 'checkout.session.async_payment_succeeded': {
          if (orderId) {
            await updateOrderPayment(orderId, 'paid', session.payment_intent ?? '');
            logger.info('Async payment succeeded (OXXO/SPEI)', { orderId });
          }
          break;
        }

        case 'checkout.session.async_payment_failed': {
          if (orderId) {
            await updateOrderPayment(orderId, 'failed');
            logger.warn('Async payment failed (OXXO/SPEI)', { orderId });
          }
          break;
        }

        case 'checkout.session.expired': {
          if (orderId) {
            await updateOrderPayment(orderId, 'failed');
            // El cliente abandonó el pago: el pedido nunca se mostró en cocina
            // (isAwaitingOnlinePayment) y ya no se puede pagar con esta sesión.
            // Se cancela para que no quede 'pending' colgado para siempre.
            const { error: cancelErr } = await createAdminClient()
              .from('orders')
              .update({ status: 'cancelled' })
              .eq('id', orderId)
              .eq('status', 'pending')
              .neq('payment_status', 'paid');
            if (cancelErr) logger.warn('Could not cancel expired unpaid order', { orderId, error: cancelErr.message });
            logger.info('Checkout session expired', { orderId });
          }
          break;
        }

        case 'payment_intent.succeeded': {
          if (orderId) {
            await updateOrderPayment(orderId, 'paid', session.id ?? '');
            logger.info('PaymentIntent succeeded (Apple Pay / Google Pay)', { orderId });
            await recoverInternationalCardSurcharge(stripe, session.id);
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          if (orderId) {
            await updateOrderPayment(orderId, 'failed', session.id ?? '');
            logger.warn('PaymentIntent failed', { orderId });
          }
          break;
        }

        case 'refund.failed': {
          // Un reembolso aceptado por Stripe que después falla (cuenta del
          // cliente cerrada, etc.): el pedido figuraba 'refunded' y el cliente
          // sigue cobrado. Vuelve a 'paid' para que el cron lo reintente si fue
          // un no-aceptado, y siempre se avisa: puede necesitar mano.
          const refund = event.data.object as unknown as { id: string; payment_intent?: string | { id: string } | null; metadata?: Record<string, string> | null; failure_reason?: string | null };
          let refundOrderId = refund.metadata?.order_id ?? null;
          const refundPi = idOf(refund.payment_intent);
          // Reembolsos sin metadata (los viejos, o hechos a mano desde el
          // dashboard de Stripe): se busca el pedido por su PaymentIntent.
          if (!refundOrderId && refundPi) {
            const { data: byPi } = await adminDb.from('orders').select('id').eq('payment_intent_id', refundPi).limit(2);
            if (byPi?.length === 1) refundOrderId = byPi[0].id as string;
          }
          if (refundOrderId) {
            await adminDb
              .from('orders')
              .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
              .eq('id', refundOrderId)
              .eq('payment_status', 'refunded');
          }
          logger.error('Stripe refund failed after being accepted', { refundId: refund.id, orderId: refundOrderId, reason: refund.failure_reason ?? null });
          captureError(new Error('Stripe refund failed'), { refundId: refund.id, orderId: refundOrderId, paymentIntent: refundPi, reason: refund.failure_reason ?? null });
          break;
        }

        case 'charge.dispute.created': {
          await notifyDisputeOpened(event.data.object as unknown as DisputeLike);
          break;
        }

        case 'charge.dispute.closed': {
          const dispute = event.data.object as unknown as DisputeLike;
          if (dispute.status === 'lost') {
            await reverseTransferForLostDispute(stripe, dispute);
          } else {
            logger.info('Dispute closed without loss', { disputeId: dispute.id, status: dispute.status });
          }
          break;
        }

        default:
          logger.info('Unhandled event type', { type: event.type });
      }
    } catch (procErr) {
      // Release the claim so Stripe can retry this event
      await adminDb.from('processed_webhook_events').delete().eq('event_id', event.id);
      throw procErr;
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    logger.error('Webhook processing error', { error: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: '/api/payments/webhook' });
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
