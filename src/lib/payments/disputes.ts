/**
 * Disputas (contracargos) y avisos tempranos de fraude.
 *
 * Con destination charges Stripe le debita TODO a la plataforma: el monto
 * disputado y las multas (docs.stripe.com/connect/disputes). Decisión de Pedro
 * (2026-11-24): lo paga el restaurante, multas incluidas, aunque se gane.
 *
 * - Disputa abierta: se le cobra al restaurante la multa de recepción ($15, que
 *   Stripe nunca devuelve), se precarga la evidencia del pedido en Stripe (sin
 *   enviarla) y se avisa a los admins.
 * - Disputa perdida: se le cobra el monto (reversión del transfer del pedido) y,
 *   si se contestó, la multa de contestación ($15, que Stripe solo devuelve si
 *   se gana).
 * - Aviso temprano de fraude (lo manda el banco antes de que llegue la
 *   disputa): si el cobro es de $15 o menos se devuelve solo — Stripe lo
 *   recomienda para montos hasta la multa — y si es mayor se avisa para decidir.
 *
 * Las multas se cobran revirtiendo $15 de OTRO pago reciente del mismo
 * restaurante (sin costo extra de Stripe, a diferencia de Account Debits). Si
 * no hay de dónde, se avisa por email para cobrarla a mano.
 */
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import type { getStripe } from '@/lib/stripe';
import { refundStripePayment, isAlreadyRefundedError } from '@/lib/payments/stripe-refund';
import { idOf, formatCents, findOrderForAlert, emailAdmins, emailRestaurantOwner } from '@/lib/payments/admin-alerts';

const logger = createLogger('payments-disputes');

type StripeClient = ReturnType<typeof getStripe>;

/** Multas de Stripe en EE.UU. (support.stripe.com, "June 2025 pricing updates for disputes"). */
export const DISPUTE_RECEIVED_FEE_CENTS = 1500;
export const DISPUTE_COUNTERED_FEE_CENTS = 1500;
/** Aviso de fraude: hasta este monto se devuelve solo (Stripe: "at or below your dispute fee"). */
export const EFW_AUTO_REFUND_MAX_CENTS = DISPUTE_RECEIVED_FEE_CENTS;

export interface DisputeLike {
  id: string;
  amount: number;
  currency?: string;
  reason?: string;
  charge: string | { id: string };
  payment_intent?: string | { id: string } | null;
  status: string;
  evidence_details?: { due_by?: number | null; submission_count?: number | null } | null;
}

const disputeLink = (id: string) => ({
  href: `https://dashboard.stripe.com/disputes/${encodeURIComponent(id)}`,
  label: 'Abrir la disputa en Stripe',
});

// ─── Multas al restaurante ──────────────────────────────────────────────────

type FeeResult = { ok: true; transferId: string } | { ok: false; detail: string };

/**
 * Cobra una multa de disputa al restaurante revirtiendo `fee` de otro pago
 * suyo. Se elige un transfer de hace más de 2 días (los de hoy son los que más
 * probablemente se reembolsen, y un reembolso con reverse_transfer necesita el
 * transfer entero), nunca el del pedido disputado (ese cubre el monto si se
 * pierde). Nunca lanza.
 */
export async function chargeDisputeFeeToRestaurant(
  stripe: StripeClient,
  dispute: DisputeLike,
  kind: 'received' | 'countered',
): Promise<FeeResult> {
  const fee = kind === 'received' ? DISPUTE_RECEIVED_FEE_CENTS : DISPUTE_COUNTERED_FEE_CENTS;
  const currency = (dispute.currency ?? 'usd').toLowerCase();
  if (currency !== 'usd') return { ok: false, detail: `moneda ${currency.toUpperCase()}: la multa no es fija, cobrarla a mano` };

  try {
    const chargeId = idOf(dispute.charge);
    if (!chargeId) return { ok: false, detail: 'la disputa no tiene cobro' };
    const charge = await stripe.charges.retrieve(chargeId);
    const disputedTransferId = idOf(charge.transfer as string | { id: string } | null);
    if (!disputedTransferId) return { ok: false, detail: 'el cobro no tiene transfer (no es de un restaurante)' };
    const disputedTransfer = await stripe.transfers.retrieve(disputedTransferId);
    const destination = idOf(disputedTransfer.destination as string | { id: string } | null);
    if (!destination) return { ok: false, detail: 'transfer sin cuenta de destino' };

    const { data: transfers } = await stripe.transfers.list({ destination, limit: 100 });
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 86_400;
    const eligible = transfers.filter((t) =>
      t.id !== disputedTransferId
      && t.currency === currency
      && t.amount - t.amount_reversed >= fee);
    const settled = eligible.filter((t) => t.created < twoDaysAgo);
    const pick = (settled.length ? settled : eligible)[0];
    if (!pick) return { ok: false, detail: 'el restaurante no tiene otro pago reciente de donde descontarla' };

    await stripe.transfers.createReversal(
      pick.id,
      { amount: fee, metadata: { dispute_id: dispute.id, reason: `dispute_fee_${kind}` } },
      { idempotencyKey: `dispute-fee:${dispute.id}:${kind}` },
    );
    logger.warn('Dispute fee charged to restaurant', { disputeId: dispute.id, kind, transferId: pick.id, destination, fee });
    return { ok: true, transferId: pick.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Dispute fee recovery failed', { disputeId: dispute.id, kind, error: msg });
    captureError(err, { disputeId: dispute.id, step: `dispute-fee-${kind}` });
    return { ok: false, detail: `Stripe rechazó la reversión: ${msg}` };
  }
}

/**
 * Disputa perdida (o aceptada, que Stripe también marca `lost`): se recupera
 * el monto revirtiendo el transfer del pedido. Lanza si Stripe falla, para que
 * el webhook responda 500 y Stripe reintente (clave idempotente por disputa).
 */
export async function reverseTransferForLostDispute(stripe: StripeClient, dispute: DisputeLike) {
  const chargeId = idOf(dispute.charge);
  if (!chargeId) throw new Error(`Dispute ${dispute.id} has no charge`);

  const charge = await stripe.charges.retrieve(chargeId);
  const transferId = idOf(charge.transfer as string | { id: string } | null);
  if (!transferId) {
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
  captureError(new Error('Stripe dispute lost — amount recovered from restaurant'), {
    disputeId: dispute.id,
    transferId,
    amount,
  });
}

// ─── Evidencia precargada ───────────────────────────────────────────────────

export type EvidenceInput = {
  order: {
    order_number: string;
    created_at: string;
    order_type: string | null;
    total: number | string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    delivery_address: string | null;
    customer_arrived_at: string | null;
    driver_picked_up_at: string | null;
    driver_delivered_at: string | null;
    delivery_photo_url: string | null;
  };
  restaurant: { name: string; slug: string; address: string | null; timezone: string | null };
  items: { product_name: string | null; variant_name: string | null; qty: number; line_total: number | string }[];
  history: { to_status: string; created_at: string }[];
  notifications: { event: string; channel: string; created_at: string }[];
  appUrl: string;
};

const STATUS_EN: Record<string, string> = {
  confirmed: 'Order accepted by the restaurant',
  preparing: 'Preparation started',
  ready: 'Order ready',
  delivered: 'Order completed (handed to the customer)',
  cancelled: 'Order cancelled',
};

/**
 * Evidencia para el banco, en inglés (los bancos son de EE.UU.) y solo con
 * hechos que están en la base: qué se pidió, cuándo, y cada paso del pedido.
 */
export function buildDisputeEvidence(input: EvidenceInput): Stripe.DisputeUpdateParams.Evidence {
  const { order, restaurant, items, history, notifications } = input;
  const tz = restaurant.timezone || 'America/New_York';
  const at = (iso: string) =>
    // dateStyle no se puede combinar con timeZoneName (TypeError): campos sueltos.
    new Date(iso).toLocaleString('en-US', {
      timeZone: tz, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
  const money = (v: number | string) => `$${Number(v).toFixed(2)}`;
  const isDelivery = order.order_type === 'delivery';
  const kind = isDelivery ? 'delivery' : order.order_type === 'dine_in' ? 'dine-in' : 'pickup';

  const itemLines = items.map((i) =>
    `${i.qty} x ${i.product_name || 'item'}${i.variant_name ? ` (${i.variant_name})` : ''} ${money(i.line_total)}`);

  const product_description = [
    `Online ${kind} food order #${order.order_number} placed by the cardholder at ${restaurant.name}${restaurant.address ? `, ${restaurant.address}` : ''}.`,
    itemLines.length ? `Items: ${itemLines.join('; ')}.` : '',
    `Total charged: ${money(order.total)}.`,
  ].filter(Boolean).join(' ');

  const events: { iso: string; text: string }[] = [{ iso: order.created_at, text: 'Order placed online and paid by card.' }];
  for (const h of history) events.push({ iso: h.created_at, text: `${STATUS_EN[h.to_status] ?? `Status: ${h.to_status}`}.` });
  if (order.customer_arrived_at) events.push({ iso: order.customer_arrived_at, text: 'Customer reported arriving at the restaurant.' });
  if (order.driver_picked_up_at) events.push({ iso: order.driver_picked_up_at, text: 'Driver picked up the order.' });
  if (order.driver_delivered_at) events.push({ iso: order.driver_delivered_at, text: `Order delivered${order.delivery_address ? ` to ${order.delivery_address}` : ''}.` });
  for (const n of notifications) events.push({ iso: n.created_at, text: `Update "${n.event}" sent to the customer by ${n.channel}.` });
  events.sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());

  const header = [
    `Order #${order.order_number} — ${restaurant.name}`,
    `Customer: ${order.customer_name || '—'} · ${order.customer_email || 'no email'} · ${order.customer_phone || 'no phone'}`,
  ];
  if (isDelivery && order.delivery_address) header.push(`Delivery address given by the customer: ${order.delivery_address}`);
  if (order.delivery_photo_url) header.push('A photo of the delivered order is on file.');

  const uncategorized_text = [
    ...header,
    '',
    'Timeline:',
    ...events.map((e) => `${at(e.iso)} — ${e.text}`),
    '',
    `Restaurant refund policy: ${input.appUrl}/${restaurant.slug}/legal/refunds`,
  ].join('\n').slice(0, 20_000);

  return {
    ...(order.customer_name ? { customer_name: order.customer_name } : {}),
    ...(order.customer_email ? { customer_email_address: order.customer_email } : {}),
    service_date: new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: tz }),
    product_description,
    uncategorized_text,
    ...(isDelivery && order.delivery_address ? { shipping_address: order.delivery_address } : {}),
  };
}

/** Carga el pedido y deja la evidencia en Stripe SIN enviarla (submit: false). Nunca lanza. */
export async function stageDisputeEvidence(stripe: StripeClient, disputeId: string, orderId: string): Promise<boolean> {
  try {
    const db = createAdminClient();
    const { data: order } = await db
      .from('orders')
      .select('order_number, created_at, order_type, total, customer_name, customer_email, customer_phone, delivery_address, customer_arrived_at, driver_picked_up_at, driver_delivered_at, delivery_photo_url, restaurants(name, slug, address, timezone)')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return false;
    const restRaw = (order as { restaurants?: unknown }).restaurants;
    const restaurant = (Array.isArray(restRaw) ? restRaw[0] : restRaw) as EvidenceInput['restaurant'] | null;
    if (!restaurant) return false;

    const [{ data: items }, { data: history }, { data: notifications }] = await Promise.all([
      db.from('order_items').select('product_name, variant_name, qty, line_total').eq('order_id', orderId),
      db.from('order_status_history').select('to_status, created_at').eq('order_id', orderId).order('created_at', { ascending: true }),
      db.from('order_notification_log').select('event, channel, created_at').eq('order_id', orderId).eq('success', true).order('created_at', { ascending: true }),
    ]);

    const evidence = buildDisputeEvidence({
      order: order as unknown as EvidenceInput['order'],
      restaurant,
      items: (items ?? []) as EvidenceInput['items'],
      history: (history ?? []) as EvidenceInput['history'],
      notifications: (notifications ?? []) as EvidenceInput['notifications'],
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app',
    });
    await stripe.disputes.update(disputeId, { evidence, submit: false });
    return true;
  } catch (err) {
    logger.error('Could not stage dispute evidence', { disputeId, orderId, error: err instanceof Error ? err.message : String(err) });
    captureError(err, { disputeId, orderId, step: 'stage-evidence' });
    return false;
  }
}

// ─── Aviso al dueño ─────────────────────────────────────────────────────────

/** Motivo de Stripe en palabras del dueño. */
function reasonText(reason: string | undefined, en: boolean): string {
  const map: Record<string, [string, string]> = {
    fraudulent: ['Says they did not make the purchase', 'Dice que no hizo la compra'],
    unrecognized: ["Doesn't recognize the charge", 'No reconoce el cobro'],
    product_not_received: ['Says the order never arrived', 'Dice que no recibió el pedido'],
    product_unacceptable: ['Says the order was wrong or in bad condition', 'Dice que el pedido llegó mal'],
    duplicate: ['Says they were charged twice', 'Dice que le cobraron dos veces'],
    credit_not_processed: ['Says a promised refund never came', 'Dice que no le llegó un reembolso prometido'],
  };
  const m = reason ? map[reason] : undefined;
  return m ? (en ? m[0] : m[1]) : (reason ?? '—');
}

function dueByText(dispute: DisputeLike, en: boolean): string {
  const due = dispute.evidence_details?.due_by;
  if (!due) return en ? 'as soon as possible' : 'lo antes posible';
  return new Date(due * 1000).toLocaleDateString(en ? 'en-US' : 'es', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' });
}

// ─── Eventos ────────────────────────────────────────────────────────────────

/** charge.dispute.created: multa al restaurante + evidencia precargada + email. */
export async function handleDisputeCreated(stripe: StripeClient, dispute: DisputeLike) {
  const pi = idOf(dispute.payment_intent);
  const order = pi ? await findOrderForAlert({ paymentIntentId: pi }) : null;

  const fee = await chargeDisputeFeeToRestaurant(stripe, dispute, 'received');
  const staged = order ? await stageDisputeEvidence(stripe, dispute.id, order.id) : false;

  const amount = formatCents(dispute.amount, dispute.currency);
  const dueBy = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toLocaleString('es', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })
    : 'ver en Stripe';

  logger.warn('Stripe dispute opened', { disputeId: dispute.id, paymentIntent: pi, orderId: order?.id ?? null, amount: dispute.amount });
  captureError(new Error('Stripe dispute opened'), { disputeId: dispute.id, paymentIntent: pi, orderId: order?.id ?? null, orderNumber: order?.order_number ?? null, amount: dispute.amount });

  await emailAdmins({
    subject: `⚠️ Disputa Stripe: ${order?.order_number ?? dispute.id} — ${amount}`,
    title: 'Disputa abierta en Stripe',
    intro: staged
      ? 'Un cliente desconoció un cargo. La evidencia del pedido ya está cargada en Stripe, sin enviar: revisala y tocá Enviar, o aceptá la disputa si el cliente tiene razón. Contestar cuesta $15 más, que Stripe devuelve solo si se gana.'
      : 'Un cliente desconoció un cargo. No se pudo precargar la evidencia: hay que cargarla en Stripe antes de la fecha límite o se pierde sola.',
    rows: [
      ['Restaurante', order?.restaurantName ?? 'no encontrado'],
      ['Pedido', order?.order_number ?? 'no encontrado'],
      ['Monto', amount],
      ['Motivo', dispute.reason ?? '—'],
      ['Fecha límite', dueBy],
      ['Multa $15', fee.ok ? 'cobrada al restaurante' : `NO cobrada (${fee.detail}): cobrarla a mano`],
      ['Evidencia', staged ? 'precargada, falta enviarla' : 'no precargada'],
      ['Disputa', dispute.id],
    ],
    link: disputeLink(dispute.id),
  });

  // The restaurant pays the fee and, if lost, the amount: it must hear about it.
  if (order) {
    const n = order.order_number;
    await emailRestaurantOwner(order.id, (en) => ({
      subject: en ? `A customer disputed a card charge — order #${n}` : `Un cliente desconoció un cobro — pedido #${n}`,
      title: en ? 'A customer disputed a card charge' : 'Un cliente desconoció un cobro con tarjeta',
      intro: en
        ? `A customer's bank opened a chargeback for ${amount} on order #${n}. If the bank sides with the customer, that amount is deducted from your payouts. ${fee.ok ? 'The $15 fee the bank charges to open the case has already been deducted.' : 'The bank charges $15 to open the case; it will be deducted from your payouts.'} MENIUS answers the bank with the order details. If you have anything that helps (a delivery photo, messages with the customer, a signed receipt), reply to this email before ${dueByText(dispute, true)}.`
        : `El banco de un cliente abrió un contracargo por ${amount} del pedido #${n}. Si el banco le da la razón al cliente, ese monto se descuenta de tus pagos. ${fee.ok ? 'La comisión de $15 que cobra el banco por abrir el caso ya se descontó.' : 'El banco cobra $15 por abrir el caso; se descontará de tus pagos.'} MENIUS le responde al banco con los datos del pedido. Si tienes algo que ayude (foto de la entrega, mensajes con el cliente, un ticket firmado), responde a este email antes del ${dueByText(dispute, false)}.`,
      rows: [
        [en ? 'Order' : 'Pedido', `#${n}`],
        [en ? 'Customer' : 'Cliente', order.customer_name ?? '—'],
        [en ? 'Amount' : 'Monto', amount],
        [en ? 'Reason' : 'Motivo', reasonText(dispute.reason, en)],
      ],
    }));
  }
}

/** charge.dispute.closed: si se perdió, el monto y (si se contestó) la segunda multa van al restaurante. */
export async function handleDisputeClosed(stripe: StripeClient, dispute: DisputeLike) {
  const pi = idOf(dispute.payment_intent);
  const order = pi ? await findOrderForAlert({ paymentIntentId: pi }) : null;
  const amount = formatCents(dispute.amount, dispute.currency);

  if (dispute.status !== 'lost') {
    logger.info('Dispute closed without loss', { disputeId: dispute.id, status: dispute.status });
    if (dispute.status === 'won' && order) {
      const n = order.order_number;
      await emailRestaurantOwner(order.id, (en) => ({
        subject: en ? `Chargeback won — order #${n}` : `Contracargo ganado — pedido #${n}`,
        title: en ? 'The bank sided with you' : 'El banco te dio la razón',
        intro: en
          ? `The chargeback for ${amount} on order #${n} was resolved in your favor: nothing else is deducted. The bank does not refund the $15 fee for opening the case.`
          : `El contracargo de ${amount} del pedido #${n} se resolvió a tu favor: no se descuenta nada más. La comisión de $15 por abrir el caso el banco no la devuelve.`,
        rows: [[en ? 'Order' : 'Pedido', `#${n}`], [en ? 'Amount' : 'Monto', amount]],
      }));
    }
    return;
  }
  await reverseTransferForLostDispute(stripe, dispute);

  const countered = (dispute.evidence_details?.submission_count ?? 0) > 0;
  let counteredFeeCharged = false;
  if (countered) {
    const fee = await chargeDisputeFeeToRestaurant(stripe, dispute, 'countered');
    counteredFeeCharged = fee.ok;
    if (!fee.ok) {
      await emailAdmins({
        subject: `⚠️ Multa de disputa sin cobrar: ${dispute.id}`,
        title: 'Disputa perdida: la multa de contestación no se pudo cobrar al restaurante',
        intro: 'Se perdió una disputa que se había contestado. El monto ya se le descontó al restaurante, pero la segunda multa de $15 no.',
        rows: [['Motivo', fee.detail], ['Disputa', dispute.id]],
        link: disputeLink(dispute.id),
      });
    }
  }

  // Last, once the amount was really deducted (the reversal above throws and
  // Stripe retries the whole event if it fails).
  if (order) {
    const n = order.order_number;
    await emailRestaurantOwner(order.id, (en) => ({
      subject: en ? `Chargeback lost — order #${n}` : `Contracargo perdido — pedido #${n}`,
      title: en ? 'The bank sided with the customer' : 'El banco le dio la razón al cliente',
      intro: en
        ? `The chargeback for order #${n} was resolved in the customer's favor. ${amount} was deducted from your payouts${counteredFeeCharged ? ', plus a $15 fee for contesting the case' : ''}.`
        : `El contracargo del pedido #${n} se resolvió a favor del cliente. Se descontaron ${amount} de tus pagos${counteredFeeCharged ? ', más $15 por haber contestado el caso' : ''}.`,
      rows: [[en ? 'Order' : 'Pedido', `#${n}`], [en ? 'Amount' : 'Monto', amount]],
    }));
  }
}

type EarlyFraudWarningLike = {
  id: string;
  actionable: boolean;
  charge: string | { id: string };
  fraud_type?: string | null;
};

/**
 * radar.early_fraud_warning.created: el banco marcó el cobro como posible
 * fraude; ~40% terminan en disputa (Stripe). Hasta $15 se devuelve solo; más
 * que eso, se avisa para decidir. Nunca lanza.
 */
export async function handleEarlyFraudWarning(stripe: StripeClient, efw: EarlyFraudWarningLike) {
  let action = '';
  let order: Awaited<ReturnType<typeof findOrderForAlert>> = null;
  let amount = '—';
  /** Qué le pasó al pedido, para el aviso al dueño (null = nada que contarle). */
  let ownerOutcome: 'refunded' | 'flagged' | null = null;
  try {
    const chargeId = idOf(efw.charge);
    if (!chargeId) throw new Error('early fraud warning without charge');
    const charge = await stripe.charges.retrieve(chargeId);
    const pi = idOf(charge.payment_intent as string | { id: string } | null);
    order = pi ? await findOrderForAlert({ paymentIntentId: pi }) : null;
    amount = formatCents(charge.amount, charge.currency);

    if (!efw.actionable || charge.refunded) {
      action = 'Nada: ya tiene disputa o ya estaba devuelto.';
    } else if (pi && charge.currency === 'usd' && charge.amount <= EFW_AUTO_REFUND_MAX_CENTS) {
      try {
        await refundStripePayment(pi, {
          reason: 'fraudulent',
          idempotencyKey: `efw-refund:${efw.id}`,
          metadata: { ...(order ? { order_id: order.id } : {}), reason: 'early_fraud_warning' },
        });
      } catch (err) {
        if (!isAlreadyRefundedError(err)) throw err;
      }
      if (order) {
        await createAdminClient()
          .from('orders')
          .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
          .eq('id', order.id)
          .eq('payment_status', 'paid');
      }
      action = 'Devuelto solo: con $15 o menos, devolver sale más barato que una disputa ($15 de multa + el monto).';
      ownerOutcome = 'refunded';
    } else {
      action = 'No se devolvió solo (más de $15). Si el pedido parece fraude, devolverlo ahora evita la disputa y la multa; ~40% de estos avisos terminan en disputa.';
      ownerOutcome = 'flagged';
    }
  } catch (err) {
    action = `Error al procesar el aviso: ${err instanceof Error ? err.message : String(err)}. Revisarlo en Stripe.`;
    logger.error('Early fraud warning handling failed', { efwId: efw.id, error: err instanceof Error ? err.message : String(err) });
    captureError(err, { efwId: efw.id, step: 'early-fraud-warning' });
  }

  await emailAdmins({
    subject: `⚠️ Aviso de fraude: ${order?.order_number ?? idOf(efw.charge) ?? efw.id} — ${amount}`,
    title: 'El banco marcó un cobro como posible fraude',
    intro: action,
    rows: [
      ['Restaurante', order?.restaurantName ?? 'no encontrado'],
      ['Pedido', order?.order_number ?? 'no encontrado'],
      ['Monto', amount],
      ['Tipo', efw.fraud_type ?? '—'],
      ['Cliente', order?.customer_name ?? '—'],
      ['Aviso', efw.id],
    ],
    link: { href: `https://dashboard.stripe.com/payments/${encodeURIComponent(idOf(efw.charge) ?? '')}`, label: 'Abrir el pago en Stripe' },
  });
  // El dueño se entera: el reembolso sale de sus pagos, y con más de $15 la
  // decisión de devolverlo (para evitar la disputa) es suya.
  if (order && ownerOutcome) {
    const n = order.order_number;
    const refunded = ownerOutcome === 'refunded';
    await emailRestaurantOwner(order.id, (en) => ({
      subject: refunded
        ? (en ? `Card charge refunded for possible fraud — order #${n}` : `Cobro devuelto por posible fraude — pedido #${n}`)
        : (en ? `Possible fraud on a card charge — order #${n}` : `Posible fraude en un cobro con tarjeta — pedido #${n}`),
      title: refunded
        ? (en ? 'We refunded a charge the bank flagged as fraud' : 'Devolvimos un cobro que el banco marcó como fraude')
        : (en ? 'The bank flagged a charge as possible fraud' : 'El banco marcó un cobro como posible fraude'),
      intro: refunded
        ? (en
          ? `The cardholder's bank flagged the ${amount} charge on order #${n} as possible fraud. Because it is a small amount, we refunded it automatically: a chargeback would cost a $15 fee plus the amount. The ${amount} comes out of your payouts.`
          : `El banco del titular de la tarjeta marcó como posible fraude el cobro de ${amount} del pedido #${n}. Como es un monto chico, lo devolvimos automáticamente: un contracargo costaría $15 de comisión más el monto. Los ${amount} se descuentan de tus pagos.`)
        : (en
          ? `The cardholder's bank flagged the ${amount} charge on order #${n} as possible fraud. About 4 in 10 of these become chargebacks ($15 fee plus the amount). If the order looks suspicious (a name or address you don't recognize, never picked up), refunding it now from Orders avoids the chargeback. If you know the customer, you can leave it.`
          : `El banco del titular de la tarjeta marcó como posible fraude el cobro de ${amount} del pedido #${n}. Cerca de 4 de cada 10 terminan en contracargo ($15 de comisión más el monto). Si el pedido te parece raro (nombre o dirección que no conoces, nadie lo retiró), devolverlo ahora desde Pedidos evita el contracargo. Si conoces al cliente, puedes dejarlo así.`),
      rows: [
        [en ? 'Order' : 'Pedido', `#${n}`],
        [en ? 'Customer' : 'Cliente', order?.customer_name ?? '—'],
        [en ? 'Amount' : 'Monto', amount],
      ],
    }));
  }
}
