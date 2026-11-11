/**
 * Driver status update — public endpoint (no auth).
 * Uses the per-delivery token to identify the order.
 * POST { token, action: 'picked_up' | 'at_door' | 'delivered' | 'notify_outside' }
 *
 * picked_up      → sets driver_picked_up_at, notifies customer "Your order is on its way"
 * at_door        → sets driver_at_door_at, notifies customer "Your driver is at the door"
 * delivered      → sets driver_delivered_at, updates order status to 'delivered', full notification stack
 * notify_outside → sends "your order is outside" message without changing any DB state
 */
export const dynamic = "force-dynamic";

import { afterResponse } from "@/lib/server/after-response";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canTransition } from "@/lib/order-state";
import { checkRateLimitAsync, getClientIP } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { broadcastOrderUpdate } from "@/lib/realtime/broadcast-order";
import { evictTokenCache } from "@/lib/tracking/token-cache";

const logger = createLogger("driver-status");

type DriverAction = "picked_up" | "at_door" | "delivered" | "notify_outside";

const ALLOWED_ACTIONS: DriverAction[] = [
  "picked_up",
  "at_door",
  "delivered",
  "notify_outside",
];

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`driver-status:${ip}`, {
    limit: 60,
    windowSec: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { token, action } = body as { token?: string; action?: DriverAction };

  if (!token || token.length > 200)
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json(
      {
        error:
          "action must be picked_up | at_door | delivered | notify_outside",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Fetch the order by token
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select(
      "id, status, order_type, customer_phone, customer_name, customer_email, customer_locale, customer_token, order_number, restaurant_id, delivery_address, driver_token_expires_at, driver_picked_up_at, driver_at_door_at, batch_id, restaurants(name, locale, slug, currency, notifications_enabled)",
    )
    .eq("driver_tracking_token", token)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json(
      { error: "Order not found for this token" },
      { status: 404 },
    );
  }

  // Reject expired tokens (allow 'delivered' action even if expired so driver can still complete)
  const expiry = (order as any).driver_token_expires_at;
  if (action !== "delivered" && expiry && new Date(expiry) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 410 });
  }

  // Pedido cancelado: ninguna accion del driver tiene sentido. Sin esta guarda,
  // un at_door sobre un pedido cancelado escribia el timestamp Y disparaba el
  // push "tu repartidor esta en la puerta" a un cliente al que ya le cancelaron.
  if (order.status === "cancelled") {
    return NextResponse.json(
      { error: "Order cancelled", cancelled: true },
      { status: 409 },
    );
  }

  // Pedido ya cerrado (el mostrador tocó "Entregado" o lo cerró): recogí / en la
  // puerta no tienen sentido — antes se aceptaban y podían mandar el push "tu
  // repartidor está en la puerta" a un pedido ya entregado.
  if (["delivered", "completed"].includes(order.status) && action !== "delivered" && action !== "notify_outside") {
    return NextResponse.json({ ok: true, skipped: true, closed: true, status: order.status, action });
  }

  // Block delivery-specific actions on non-delivery orders
  if (action !== "notify_outside" && (order as any).order_type !== "delivery") {
    return NextResponse.json(
      {
        error: `Action '${action}' is only valid for delivery orders. This order is '${(order as any).order_type}'.`,
      },
      { status: 409 },
    );
  }

  type RestRow = {
    name: string;
    locale: string | null;
    slug: string;
    currency: string | null;
    notifications_enabled: boolean | null;
  };
  const rawRest = (order as any).restaurants as RestRow[] | RestRow | null;
  const restaurant: RestRow | null = Array.isArray(rawRest)
    ? (rawRest[0] ?? null)
    : rawRest;

  const now = new Date().toISOString();
  let updateData: Record<string, unknown> = {};

  if (action === "picked_up") {
    const advanceToOutForDelivery = canTransition(
      order.status,
      "out_for_delivery",
    );
    // Si la transicion no esta permitida, el pedido queda inconsistente:
    // driver_picked_up_at seteado pero status sin avanzar. El cliente no ve
    // "en camino" (su UI depende de status) y tampoco recibe la notificacion
    // de abajo, que exige status === out_for_delivery. Se loguea para que un
    // estado futuro sin la transicion no vuelva a fallar en silencio.
    if (!advanceToOutForDelivery) {
      logger.warn("picked_up sin avance de status", {
        orderId: order.id,
        from: order.status,
      });
    }
    updateData = {
      driver_picked_up_at: now,
      updated_at: now,
      ...(advanceToOutForDelivery ? { status: "out_for_delivery" } : {}),
    };
  }

  // El mostrador pudo tocar "Salió" (out_for_delivery) antes de que el
  // repartidor marcara "recogí": el pedido ya salió, así que se completa la hora
  // de recogida en vez de bloquearlo con 409.
  const alreadyOut = order.status === "out_for_delivery";
  const pickedUpFill = !(order as any).driver_picked_up_at && alreadyOut ? { driver_picked_up_at: now } : {};

  if (action === "at_door") {
    if (!(order as any).driver_picked_up_at && !alreadyOut) {
      return NextResponse.json(
        { error: "Cannot mark at_door before picked_up" },
        { status: 409 },
      );
    }
    updateData = { driver_at_door_at: now, updated_at: now, ...pickedUpFill };
  }

  if (action === "notify_outside") {
    return NextResponse.json({ ok: true, action });
  }

  if (action === "delivered") {
    if (!(order as any).driver_picked_up_at && !alreadyOut && order.status !== "delivered") {
      return NextResponse.json(
        { error: "Cannot mark delivered before picked_up" },
        { status: 409 },
      );
    }
    // Guard delivered/cancelled orders. Already-delivered is idempotent (200);
    // any other invalid source state is a real conflict (409) so a buggy driver
    // app surfaces the rejection instead of silently treating it as success.
    if (!canTransition(order.status, "delivered")) {
      if (order.status === "delivered") {
        return NextResponse.json({ ok: true, skipped: true, action });
      }
      return NextResponse.json(
        {
          error: `Cannot transition from ${order.status} to delivered`,
          action,
        },
        { status: 409 },
      );
    }
    // Single update: status + timestamp together
    // Double-filter by token + id — prevents a guessed id from updating a different order
    const { error: statusErr } = await supabase
      .from("orders")
      .update({ status: "delivered", driver_delivered_at: now, updated_at: now, ...pickedUpFill })
      .eq("driver_tracking_token", token)
      .eq("id", order.id);

    if (statusErr)
      return NextResponse.json({ error: statusErr.message }, { status: 500 });

    // Broadcast to customer tracking page immediately (no-RLS broadcast channel).
    broadcastOrderUpdate(order.id, "delivered").catch(() => {});

    // Evict Redis token cache — driver can no longer send location pings
    evictTokenCache(token.slice(0, 16)).catch(() => {});

    // Ruta: los clientes de las paradas siguientes tienen una parada menos
    // antes de la suya. Solo se les avisa que refresquen (sin datos de este).
    const batchId = (order as { batch_id?: string | null }).batch_id;
    if (batchId) {
      afterResponse(async () => {
        const { data: mates } = await supabase
          .from("orders")
          .select("id, status")
          .eq("batch_id", batchId)
          .neq("id", order.id)
          .not("status", "in", '("delivered","completed","cancelled")');
        for (const m of mates ?? []) await broadcastOrderUpdate(m.id as string, m.status as string).catch(() => {});
      });
    }

    // Full notification stack (email + push + log) — después de responder: el
    // repartidor no espera a que salga el email.
    afterResponse(async () => {
      const { notifyStatusChange } =
        await import("@/lib/notifications/order-notifications");
      await notifyStatusChange({
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId: order.restaurant_id,
        status: "delivered",
        customerName: order.customer_name,
        customerEmail: (order as any).customer_email || undefined,
        customerPhone: order.customer_phone || undefined,
        orderType: (order as any).order_type || undefined,
        deliveryAddress: (order as any).delivery_address || undefined,
      });
    });

    return NextResponse.json({ ok: true, action });
  }

  // Update driver timestamp fields (picked_up / at_door only — delivered handled above)
  if (Object.keys(updateData).length > 0) {
    const { data: updated, error: updateErr } = await supabase
      .from("orders")
      .update(updateData)
      .eq("driver_tracking_token", token)
      .eq("id", order.id)
      .select("id")
      .maybeSingle();

    if (updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Only broadcast if the row was actually updated (prevents duplicate events on concurrent requests)
    if (updated) {
      const newStatus =
        (updateData.status as string | undefined) ?? order.status;
      broadcastOrderUpdate(order.id, newStatus).catch(() => {});

      // Customer notifications — the broadcast only reaches an open tracker tab.
      // picked_up → full stack (email + push) as "out for delivery".
      // at_door → push only; an email is useless when the driver is at the door.
      if (action === "picked_up" && updateData.status === "out_for_delivery") {
        afterResponse(async () => {
          const { notifyStatusChange } =
            await import("@/lib/notifications/order-notifications");
          await notifyStatusChange({
            orderId: order.id,
            orderNumber: order.order_number,
            restaurantId: order.restaurant_id,
            status: "out_for_delivery",
            customerName: order.customer_name,
            customerEmail: (order as any).customer_email || undefined,
            customerPhone: order.customer_phone || undefined,
            customerLocale: (order as any).customer_locale || undefined,
            orderType: (order as any).order_type || undefined,
            deliveryAddress: (order as any).delivery_address || undefined,
          });
        });
      }

      // Only the FIRST at_door (the endpoint is token-public and overwrites the
      // timestamp on retries), and only if the restaurant has notifications on
      // (notifyStatusChange checks this internally; this direct path must too).
      if (
        action === "at_door" &&
        restaurant &&
        restaurant.notifications_enabled !== false &&
        !(order as any).driver_at_door_at
      ) {
        import("@/lib/notifications/push")
          .then(({ sendPushToOrder, sendExpoPushToCustomerByPhone, getStatusPushPayload }) => {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://menius.app";
            // Con la llave del cliente: sin ella el push abría la página sin mapa ni repartidor.
            const custToken = (order as { customer_token?: string | null }).customer_token;
            const trackUrl = `${appUrl}/${restaurant.slug}/orden/${order.order_number}${custToken ? `?t=${custToken}` : ''}`;
            const locale = (order as any).customer_locale || restaurant.locale || "es";
            const payload = getStatusPushPayload("at_door", order.order_number, restaurant.name, trackUrl, locale, (order as any).order_type || undefined);
            sendPushToOrder(order.id, payload).catch(() => {});
            if (order.customer_phone) {
              sendExpoPushToCustomerByPhone(order.customer_phone, payload).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true, action });
}
