/**
 * POST /api/payments/mercadopago-webhook?oid=<order uuid>
 *
 * Avisos de pago de MercadoPago (Checkout Pro). La preferencia se crea con el
 * token de CADA restaurante y notification_url = este endpoint con ?oid=.
 *
 * El aviso NO se cree: solo dispara la verificación. Con el token del
 * restaurante dueño del pedido se consulta el pago (data.id) a la API de MP y
 * se exige: external_reference === id del pedido, status approved y monto
 * exacto. Un aviso falso no puede fabricar un pago aprobado en la cuenta del
 * restaurante con ese pedido y ese monto.
 *
 * Por qué no se valida x-signature: la clave secreta es POR APLICACIÓN de MP
 * (la del restaurante, no la de MENIUS). La versión anterior la validaba con
 * un MP_WEBHOOK_SECRET único de la plataforma —ningún aviso real coincidía— y
 * además buscaba el pedido en data.external_reference, que el aviso de MP no
 * trae: ningún pago de MercadoPago se confirmaba.
 */
export const dynamic = "force-dynamic";

import { afterResponse } from "@/lib/server/after-response";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/logger";
import { captureError } from "@/lib/error-reporting";
import { sendPaymentConfirmedNotifications } from "@/lib/notifications/order-notifications";
import { checkRateLimitAsync, getClientIP } from "@/lib/rate-limit";
import { MercadoPagoConfig, Payment } from "mercadopago";

const logger = createLogger("mp-webhook");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`mp-webhook:${getClientIP(req)}`, { limit: 120, windowSec: 60 });
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const type: string = searchParams.get("type") ?? body?.type ?? body?.action ?? "";
    const paymentId = String(searchParams.get("data.id") ?? body?.data?.id ?? "").trim();

    // Solo interesan los pagos (merchant_order, etc. se ignoran).
    if (!type.includes("payment") || !paymentId) {
      return NextResponse.json({ received: true });
    }
    if (!/^\d{1,24}$/.test(paymentId)) {
      return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
    }

    const orderId = searchParams.get("oid") ?? "";
    if (!UUID_RE.test(orderId)) {
      logger.warn("MP webhook without order id", { paymentId });
      return NextResponse.json({ received: true });
    }

    logger.info("MP webhook received", { type, paymentId, orderId });

    const adminDb = createAdminClient();
    const { data: order } = await adminDb
      .from("orders")
      .select("id, payment_status, restaurant_id, total")
      .eq("id", orderId)
      .maybeSingle<{ id: string; payment_status: string; restaurant_id: string; total: number }>();

    if (!order) {
      logger.warn("MP webhook: order not found", { paymentId, orderId });
      return NextResponse.json({ received: true });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json({ received: true });
    }

    // Load restaurant MP token to verify payment against their account
    const { data: restaurant } = await adminDb
      .from("restaurants")
      .select("mp_access_token, mp_enabled")
      .eq("id", order.restaurant_id)
      .maybeSingle();

    if (!restaurant?.mp_enabled || !restaurant?.mp_access_token) {
      logger.warn("MP webhook: restaurant MP not enabled", {
        restaurantId: order.restaurant_id,
      });
      return NextResponse.json({ received: true });
    }

    // Verify payment status with MP API
    const mpClient = new MercadoPagoConfig({
      accessToken: restaurant.mp_access_token,
    });
    const paymentClient = new Payment(mpClient);
    let payment: Awaited<ReturnType<Payment["get"]>>;
    try {
      payment = await paymentClient.get({ id: paymentId });
    } catch (err) {
      // El pago no existe en la cuenta de ESTE restaurante (aviso falso o de
      // otro pedido): 200 para que MP no reintente. Otro error → 500 y reintento.
      const status = (err as { status?: number })?.status;
      if (status === 404 || status === 401 || status === 403) {
        logger.warn("MP webhook: payment not found for this restaurant", { paymentId, orderId: order.id, status });
        return NextResponse.json({ received: true });
      }
      throw err;
    }

    // El pago tiene que ser de ESTE pedido (la preferencia se creó con
    // external_reference = order.id). Sin esto, un pago aprobado de otro
    // pedido del mismo restaurante podía marcar este como pagado.
    if (String(payment.external_reference ?? "") !== order.id) {
      logger.warn("MP webhook: payment belongs to another order", { paymentId, orderId: order.id });
      return NextResponse.json({ received: true });
    }

    if (payment.status !== "approved") {
      logger.info("MP payment not approved", {
        paymentId,
        status: payment.status,
      });
      return NextResponse.json({ received: true });
    }

    // Validate amount against the order total — Wompi's webhook does this,
    // MP's didn't (a wrong-order collision or partial payment marked it paid).
    const expectedAmount = Number(order.total);
    const receivedAmount = Number(payment.transaction_amount ?? 0);
    if (Math.abs(receivedAmount - expectedAmount) > 0.01) {
      // A mismatch is money charged with no order marked paid — someone must
      // find out, not just a log line.
      logger.warn("MP amount mismatch — rejecting", {
        orderId: order.id,
        expected: expectedAmount,
        received: receivedAmount,
      });
      captureError(new Error("MP amount mismatch — order left unpaid"), {
        route: "/api/payments/mercadopago-webhook",
        orderId: order.id,
        expected: expectedAmount,
        received: receivedAmount,
      });
      return NextResponse.json({ received: true });
    }

    // Idempotency guard — se reclama RECIÉN con el pago verificado como
    // aprobado y con el monto correcto. Antes se reclamaba al llegar el aviso:
    // si el primero venía "pending" (pagos en efectivo/OXXO/PSE), el aviso de
    // "approved" se descartaba como duplicado y el pedido nunca quedaba pagado
    // (ni aparecía en el Counter). Wompi ya lo hacía así.
    const eventId = `mp:${paymentId}`;
    const { error: insertErr } = await adminDb
      .from("processed_webhook_events")
      .insert({ event_id: eventId, event_type: "payment.approved" });

    if (insertErr) {
      if (insertErr.code === "23505") {
        logger.info("Duplicate MP webhook — skipping", { eventId });
        return NextResponse.json({ received: true });
      }
      throw insertErr;
    }

    // Mark order as paid
    // .neq("paid"): un segundo pago aprobado distinto sobre el mismo pedido no
    // vuelve a marcarlo ni a notificar dos veces.
    const { data: paidRow, error } = await adminDb
      .from("orders")
      .update({
        payment_status: "paid",
        payment_intent_id: String(payment.id),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .neq("payment_status", "paid")
      .select("id")
      .maybeSingle();

    if (error) {
      // Release the idempotency claim so MP's retry isn't dropped as duplicate
      await adminDb
        .from("processed_webhook_events")
        .delete()
        .eq("event_id", eventId);
      logger.error("Failed to update order payment", {
        orderId: order.id,
        error: error.message,
      });
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    if (!paidRow) {
      logger.info("MP: order already paid — skipping notifications", { orderId: order.id });
      return NextResponse.json({ received: true });
    }

    afterResponse(() => sendPaymentConfirmedNotifications(order.id).catch((err) => {
      logger.error("sendPaymentConfirmedNotifications failed", {
        orderId: order.id,
        error: err?.message,
      });
    }));

    logger.info("Order marked as paid via MercadoPago", {
      orderId: order.id,
      paymentId,
    });

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    captureError(err, { route: "/api/payments/mercadopago-webhook" });
    logger.error("MP webhook error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
