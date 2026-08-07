export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createLogger } from "@/lib/logger";
import { captureError } from "@/lib/error-reporting";
import { sendPaymentConfirmedNotifications } from "@/lib/notifications/order-notifications";
import { decryptSecret } from "@/lib/crypto/secrets";

const logger = createLogger("wompi-webhook");

/**
 * POST /api/payments/wompi-webhook
 * Receives Wompi transaction events.
 * Each RESTAURANT configures this URL in ITS OWN Wompi dashboard →
 * Desarrolladores → Eventos, and the checksum is validated with THAT
 * restaurant's events secret (wompi_events_secret_enc, decrypted server-side).
 *
 * Flow: the (yet-unverified) transaction.reference is used only to LOOK UP the
 * order → restaurant → events secret. Nothing is trusted until the checksum
 * verifies against that restaurant's secret — an attacker naming someone
 * else's order still has to forge that restaurant's signature.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Wompi sends: { event, data: { transaction }, timestamp, signature: { properties, checksum } }
    const sig = body?.signature;
    if (!sig?.properties || !sig?.checksum) {
      logger.warn("Wompi webhook missing signature fields");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: string = body?.event ?? "";
    const transaction = body?.data?.transaction;
    if (!transaction) {
      return NextResponse.json({ received: true });
    }

    const reference: string = transaction.reference ?? "";
    if (!reference) return NextResponse.json({ received: true });

    const adminDb = createAdminClient();

    // Resolve the order FIRST (also needed to know whose secret verifies the
    // signature). Claiming idempotency before a failed lookup used to burn the
    // event_id, so Wompi's retry was dropped as "duplicate".
    // New references are the order UUID; legacy in-flight checkouts may still
    // send order_number — accept it as fallback (amount check below guards it).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    type OrderRow = {
      id: string;
      payment_status: string | null;
      total: number;
      restaurants: { wompi_events_secret_enc: string | null } | { wompi_events_secret_enc: string | null }[] | null;
    };
    const ORDER_SELECT = "id, payment_status, total, restaurants ( wompi_events_secret_enc )";
    let order: OrderRow | null = null;
    if (UUID_RE.test(reference)) {
      const { data } = await adminDb
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", reference)
        .maybeSingle<OrderRow>();
      order = data;
    } else {
      // Legacy fallback: order_number is NOT unique (prod has duplicates) —
      // take the most recent match; the amount validation below rejects a
      // wrong-order collision.
      const { data } = await adminDb
        .from("orders")
        .select(ORDER_SELECT)
        .eq("order_number", reference)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<OrderRow>();
      order = data;
    }

    if (!order) {
      logger.warn("Order not found for Wompi reference", { reference });
      return NextResponse.json({ received: true });
    }

    // Fail-closed: without the restaurant's events secret nothing can be
    // verified, so nothing is processed.
    const rawRest = order.restaurants;
    const restRow = Array.isArray(rawRest) ? (rawRest[0] ?? null) : rawRest;
    const eventsSecret = restRow?.wompi_events_secret_enc
      ? decryptSecret(restRow.wompi_events_secret_enc).trim()
      : "";
    if (!eventsSecret) {
      logger.error("Restaurant has no Wompi events secret — rejecting webhook", { reference });
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    // Verify checksum: SHA256(properties.map(p => body[p]).join('') + eventsSecret)
    const toHash =
      sig.properties
        .map((prop: string) => {
          const parts = prop.split(".");
          let val: unknown = body;
          for (const p of parts) val = (val as Record<string, unknown>)?.[p];
          return String(val ?? "");
        })
        .join("") + eventsSecret;
    const computed = createHash("sha256").update(toHash).digest("hex");
    const safe = (a: string, b: string) =>
      a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
    if (!safe(computed, sig.checksum)) {
      logger.warn("Wompi webhook signature mismatch", { reference });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    logger.info("Wompi event received", {
      event,
      reference,
      status: transaction.status,
    });

    if (event === "transaction.updated" && transaction.status === "APPROVED") {

      // Idempotency guard — duplicate event_id raises a 23505 unique violation, not a null row.
      const eventId = `wompi:${transaction.id}`;
      const { error: insertErr } = await adminDb
        .from("processed_webhook_events")
        .insert({ event_id: eventId, event_type: event });

      if (insertErr) {
        if (insertErr.code === "23505") {
          logger.info("Duplicate Wompi webhook — skipping", { eventId });
          return NextResponse.json({ received: true });
        }
        throw insertErr;
      }

      if (order.payment_status === "paid") {
        return NextResponse.json({ received: true });
      }

      // Validate amount matches order total (Wompi sends amount_in_cents)
      const expectedCents = Math.round(Number(order.total) * 100);
      const receivedCents = Number(transaction.amount_in_cents ?? 0);
      if (receivedCents !== expectedCents) {
        logger.warn("Wompi amount mismatch — rejecting", {
          reference,
          expected: expectedCents,
          received: receivedCents,
        });
        return NextResponse.json({ received: true });
      }

      const { error } = await adminDb
        .from("orders")
        .update({
          payment_status: "paid",
          payment_intent_id: transaction.id,
        })
        .eq("id", order.id);

      if (error) {
        // Delete the idempotency claim so Wompi can retry successfully
        await adminDb
          .from("processed_webhook_events")
          .delete()
          .eq("event_id", eventId);
        logger.error("Failed to update order payment", {
          orderId: order.id,
          error: error.message,
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      sendPaymentConfirmedNotifications(order.id).catch((err) => {
        logger.error("sendPaymentConfirmedNotifications failed", {
          orderId: order.id,
          error: err?.message,
        });
      });

      logger.info("Order marked as paid via Wompi", {
        orderId: order.id,
        reference,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    captureError(err, { route: "/api/payments/wompi-webhook" });
    logger.error("Webhook processing failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
