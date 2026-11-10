export const dynamic = 'force-dynamic';

import { afterResponse } from "@/lib/server/after-response";
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getPaymentsWebhookSecret } from '@/lib/stripe';
import { captureError } from '@/lib/error-reporting';
import { sendPaymentConfirmedNotifications } from '@/lib/notifications/order-notifications';
import { internationalCardSurchargeCents } from '@/lib/order-pricing';

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
  const { data, error } = await q.select('id').maybeSingle();

  if (error) {
    logger.error('Failed to update order payment status', { orderId, status, error: error.message });
    return;
  }

  if (!data) {
    logger.info('Order already in target payment status, skipping notifications', { orderId, status });
    return;
  }

  // Send payment confirmed notifications (non-blocking)
  if (status === 'paid') {
    afterResponse(() => sendPaymentConfirmedNotifications(orderId).catch((err) => {
      logger.error('sendPaymentConfirmedNotifications failed', { orderId, error: err?.message });
    }));
  }
}

interface DisputeLike {
  id: string;
  amount: number;
  charge: string | { id: string };
  payment_intent?: string | { id: string } | null;
  status: string;
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

  await stripe.transfers.createReversal(
    transferId,
    { amount: surcharge, metadata: { charge_id: charge.id, reason: 'international_card_surcharge' } },
    { idempotencyKey: `intl-card-fee:${charge.id}` },
  );
  logger.info('International card surcharge recovered from restaurant', {
    chargeId: charge.id,
    country: charge.payment_method_details?.card?.country,
    surcharge,
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

        case 'charge.dispute.created': {
          const dispute = event.data.object as unknown as DisputeLike;
          // Aviso: hasta ahora una disputa llegaba sin que nadie se enterara.
          logger.warn('Stripe dispute opened', {
            disputeId: dispute.id,
            paymentIntent: idOf(dispute.payment_intent),
            amount: dispute.amount,
          });
          captureError(new Error('Stripe dispute opened'), {
            disputeId: dispute.id,
            paymentIntent: idOf(dispute.payment_intent),
            amount: dispute.amount,
          });
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
