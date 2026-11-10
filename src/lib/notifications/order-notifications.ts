import { createAdminClient } from '@/lib/supabase/admin';
import { createDashboardNotification } from './dashboard-notifications';
import { sendEmail, buildOwnerNewOrderEmail, type OrderEmailItem } from './email';
import {
  buildReceiptEmail, buildEtaEmail, buildReadyEmail, buildOnTheWayEmail, buildCancelledEmail,
  deliveryTravelMinutes, customerEmailKind, type CustomerEmailKind,
} from './customer-email';
import { loadCustomerEmailOrder, sendCustomerEmail } from './customer-email-data';
import { formatPrice } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('order-notifications');

interface RestaurantNotificationData {
  id?: string;
  name: string;
  slug: string;
  currency?: string | null;
  locale?: string | null;
  notification_whatsapp?: string | null;
  notification_email?: string | null;
  notifications_enabled?: boolean | null;
  /** IANA, p. ej. America/New_York: la hora del email al dueño. */
  timezone?: string | null;
}

interface OrderNotificationPayload {
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  restaurantData?: RestaurantNotificationData;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerLocale?: string; // customer's session locale (overrides restaurant.locale for customer-facing comms)
  orderType?: string;
  deliveryAddress?: string | null;
  paymentMethod?: string;
  tableNumber?: string | null;
  notes?: string | null;
  includeUtensils?: boolean;
  /** View-only customer_token — appended to tracking links so the customer sees
   *  their own PII (address/name) when opening from their email. */
  customerToken?: string;
  total: number;
  items: { name: string; qty: number; price: number; variant?: string; modifiers?: string[]; extras?: string[]; notes?: string }[];
}

interface OrderItemRow {
  qty: number;
  unit_price: number;
  line_total: number;
  notes: string | null;
  products: { name: string } | null;
  product_variants: { name: string } | null;
  order_item_extras: { price: number; product_extras: { name: string } | null }[];
  order_item_modifiers: { group_name: string; option_name: string; price_delta: number }[];
}

/** Fetch rich order items (with variants, modifiers, extras) from the DB. */
async function fetchRichItems(orderId: string, currency: string): Promise<OrderEmailItem[]> {
  try {
    const adminDb = createAdminClient();
    const { data: rows } = await adminDb
      .from('order_items')
      .select(`
        qty, unit_price, line_total, notes,
        products ( name ),
        product_variants ( name ),
        order_item_extras ( price, product_extras ( name ) ),
        order_item_modifiers ( group_name, option_name, price_delta )
      `)
      .eq('order_id', orderId);

    if (!rows) return [];

    return (rows as unknown as OrderItemRow[]).map((row) => {
      const modifiers: string[] = (row.order_item_modifiers ?? []).map(
        (m) => `${m.group_name}: ${m.option_name}`
      );
      const extras: string[] = (row.order_item_extras ?? [])
        .filter((e) => e.product_extras?.name)
        .map((e) => {
          const extraPrice = Number(e.price);
          return extraPrice > 0
            ? `${e.product_extras!.name} (+${formatPrice(extraPrice, currency)})`
            : e.product_extras!.name;
        });

      return {
        name: row.products?.name ?? 'Item',
        qty: row.qty,
        price: formatPrice(Number(row.line_total), currency),
        variant: row.product_variants?.name ?? undefined,
        modifiers: modifiers.length ? modifiers : undefined,
        extras: extras.length ? extras : undefined,
        notes: row.notes ?? undefined,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Send notifications when a new order is created.
 * - Email to customer (if email provided & Resend configured)
 * - Email to restaurant owner (if notification_email configured)
 * - In-app dashboard notification
 * Non-blocking — errors are logged but don't affect the order flow.
 */
export async function notifyNewOrder(payload: OrderNotificationPayload) {
  const { orderId, orderNumber, restaurantId, restaurantData, customerName, customerEmail, customerPhone, customerLocale, orderType, deliveryAddress, paymentMethod, tableNumber, notes, includeUtensils, customerToken, total, items } = payload;

  try {
    let restaurant = restaurantData ?? null;

    if (!restaurant) {
      const adminDb = createAdminClient();
      const { data } = await adminDb
        .from('restaurants')
        .select('name, slug, currency, locale, notification_whatsapp, notification_email, notifications_enabled, timezone')
        .eq('id', restaurantId)
        .maybeSingle();
      restaurant = data;
    }

    if (!restaurant) return;

    const currency = restaurant.currency ?? 'MXN';
    const totalFormatted = formatPrice(total, currency);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const restaurantLocale = restaurant.locale ?? 'es';
    // El email al cliente toma su idioma del pedido (customer-email-data); este es el del dueño.
    const locale = restaurantLocale;
    const en = locale === 'en';
    const notificationsOn = restaurant.notifications_enabled !== false;

    // Use rich items from the caller when available — saves a JOIN query.
    // Caller is the order-creation route, which already has all data in
    // memory from the validation pass. fetchRichItems is only used when the
    // caller can't pre-build the rich shape (e.g. legacy paths).
    const itemsAreRich = items.some(
      (i) => i.variant !== undefined || i.modifiers !== undefined || i.extras !== undefined,
    );
    const richItems: OrderEmailItem[] = itemsAreRich || !orderId
      ? items.map(i => ({
          name: i.name,
          qty: i.qty,
          price: formatPrice(i.price, currency),
          variant: i.variant,
          modifiers: i.modifiers,
          extras: i.extras,
          notes: i.notes,
        }))
      : await fetchRichItems(orderId, currency);

    const emailJobs: Promise<boolean>[] = [];

    // Recibo al cliente (email 1 de 3), con el desglose leído de la base.
    if (notificationsOn && customerEmail && orderId) {
      emailJobs.push((async () => {
        const order = await loadCustomerEmailOrder(orderId);
        if (!order?.customerEmail) return false;
        const ok = await sendCustomerEmail(order, buildReceiptEmail(order.ctx));
        void logNotification(orderId, restaurantId, 'email_receipt', { channel: 'email', success: ok });
        return ok;
      })());
    }

    // New order alert to restaurant owner
    if (notificationsOn && restaurant.notification_email) {
      const ownerHtml = buildOwnerNewOrderEmail({
        orderNumber,
        restaurantName: restaurant.name,
        customerName,
        customerPhone,
        customerEmail,
        orderType: orderType ?? 'dine_in',
        total: totalFormatted,
        items: richItems,
        dashboardUrl: `${appUrl}/app/orders`,
        notes,
        tableNumber,
        locale,
        timezone: restaurant.timezone ?? undefined,
      });

      emailJobs.push(sendEmail({
        to: restaurant.notification_email,
        subject: en
          ? `🔔 New order #${orderNumber} — ${customerName} — ${totalFormatted}`
          : `🔔 Nuevo pedido #${orderNumber} — ${customerName} — ${totalFormatted}`,
        html: ownerHtml,
      }));
    }

    if (emailJobs.length > 0) {
      await Promise.all(emailJobs).catch((err) => {
        logger.error('Failed to send new order emails', { error: err instanceof Error ? err.message : String(err), restaurantId, orderNumber });
      });
    }

    // In-app dashboard notification (fire-and-forget)
    createDashboardNotification({
      restaurantId,
      type: 'new_order',
      title: en ? `New order #${orderNumber}` : `Nuevo pedido #${orderNumber}`,
      body: `${customerName} — ${totalFormatted}`,
      actionUrl: '/app/orders',
      metadata: { order_id: orderId, order_number: orderNumber },
    }).catch((err) => {
      logger.error('Failed to create dashboard notification', { error: err instanceof Error ? err.message : String(err), restaurantId, orderNumber });
    });
  } catch (err) {
    logger.error('Error sending new order notifications', { error: err instanceof Error ? err.message : String(err), restaurantId, orderNumber });
  }
}

export interface NotifyStatusResult {
  channel: 'email' | 'none';
  success: boolean;
  error?: string;
}

/** Write a row to order_notification_log. Non-blocking — never throws. */
async function logNotification(
  orderId: string | undefined,
  restaurantId: string,
  event: string,
  result: NotifyStatusResult,
) {
  if (!orderId) return;
  try {
    const adminDb = createAdminClient();
    // { error } MUST be read: supabase-js never throws on DB errors, and the
    // review-request email dedupe in cron/email-automations depends on this
    // log actually being written — a silent failure means duplicate emails.
    const { error } = await adminDb.from('order_notification_log').insert({
      order_id: orderId,
      restaurant_id: restaurantId,
      event,
      channel: result.channel,
      success: result.success,
      error_code: result.error ?? null,
    });
    if (error) {
      logger.error('order_notification_log insert failed', { orderId, event, error: error.message });
    }
  } catch { /* non-critical — logging must never break the happy path */ }
}

/** Envía (una sola vez por pedido, salvo reenvío) el email de un estado. */
async function sendStatusEmail(opts: {
  orderId: string;
  restaurantId: string;
  kind: CustomerEmailKind;
  estimatedMinutes?: number;
  etaUpdate?: boolean;
  allowRepeat?: boolean;
}): Promise<NotifyStatusResult> {
  const { orderId, restaurantId, kind } = opts;
  const event = `email_${kind}`;
  if (!opts.allowRepeat) {
    const { data: prior } = await createAdminClient()
      .from('order_notification_log')
      .select('id')
      .eq('order_id', orderId)
      .eq('event', event)
      .eq('success', true)
      .limit(1);
    if (prior && prior.length > 0) return { channel: 'none', success: true, error: 'email_already_sent' };
  }

  const order = await loadCustomerEmailOrder(orderId);
  if (!order?.customerEmail) return { channel: 'none', success: false, error: 'no_contact_info' };

  const now = Date.now();
  const travelMs = deliveryTravelMinutes(order.restaurantCoords, order.deliveryCoords) * 60_000;
  let email;
  if (kind === 'eta') {
    let readyAtMs: number | null = null;
    if (opts.estimatedMinutes != null && opts.estimatedMinutes > 0) {
      readyAtMs = now + opts.estimatedMinutes * 60_000;
    } else if (order.estimatedReadyMinutes && order.estimatedReadyMinutes > 0) {
      const base = Date.parse(order.preparedAt ?? order.createdAt ?? '');
      readyAtMs = Math.max((Number.isFinite(base) ? base : now) + order.estimatedReadyMinutes * 60_000, now);
    }
    const arrivalMs = order.ctx.orderType === 'delivery' && readyAtMs != null ? readyAtMs + travelMs : null;
    email = buildEtaEmail(order.ctx, { readyAtMs, arrivalMs, isUpdate: opts.etaUpdate });
  } else if (kind === 'ready') {
    email = buildReadyEmail(order.ctx);
  } else if (kind === 'on_the_way') {
    email = buildOnTheWayEmail(order.ctx, { arrivalMs: now + travelMs, driverName: order.driverName });
  } else {
    email = buildCancelledEmail(order.ctx, { reason: order.cancellationReason, refunded: order.paymentStatus === 'refunded' });
  }
  const ok = await sendCustomerEmail(order, email);
  void logNotification(orderId, restaurantId, event, { channel: 'email', success: ok });
  return { channel: 'email', success: ok };
}

/**
 * Send notifications when order status changes.
 * Returns the primary channel used and whether it succeeded.
 */
export async function notifyStatusChange(params: {
  orderId?: string;
  orderNumber: string;
  restaurantId: string;
  status: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerLocale?: string; // customer's preferred language, falls back to restaurant locale
  orderType?: string;
  deliveryAddress?: string;
  estimatedMinutes?: number;
  /** Reenvío a propósito (botón "reenviar" o aviso de hora nueva). */
  allowRepeat?: boolean;
  /** La cocina cambió la hora: el email dice "Nueva hora". */
  etaUpdate?: boolean;
}): Promise<NotifyStatusResult> {
  const { orderId, orderNumber, restaurantId, status, customerEmail, customerPhone, customerLocale, orderType, estimatedMinutes, allowRepeat, etaUpdate } = params;

  try {
    const adminDb = createAdminClient();

    // Candado: el mismo aviso de estado sale UNA vez por pedido. Sin esto, un
    // cron o un doble toque mandaba el mismo email en bucle (42 de ~90 emails
    // a clientes en oct-nov 2026 fueron repetidos).
    if (orderId && !allowRepeat) {
      const { data: prior } = await adminDb
        .from('order_notification_log')
        .select('id')
        .eq('order_id', orderId)
        .eq('event', status)
        .eq('success', true)
        .limit(1);
      if (prior && prior.length > 0) {
        return { channel: 'none', success: true, error: 'already_sent' };
      }
    }

    const { data: restaurant } = await adminDb
      .from('restaurants')
      .select('name, slug, locale, notifications_enabled')
      .eq('id', restaurantId)
      .maybeSingle();

    if (!restaurant || restaurant.notifications_enabled === false) {
      return { channel: 'none', success: false, error: 'notifications_disabled' };
    }

    const rLocale = restaurant.locale ?? 'es';
    // Fetch stored order locale (when not provided) + the view-only customer
    // token, so email/push links open the tracker with the customer's own PII.
    let resolvedCustomerLocale = customerLocale ?? rLocale;
    let custToken: string | null = null;
    if (orderId) {
      const { data: orderRow } = await adminDb
        .from('orders')
        .select('customer_locale, customer_token')
        .eq('id', orderId)
        .maybeSingle();
      if (!customerLocale && orderRow?.customer_locale) resolvedCustomerLocale = orderRow.customer_locale;
      custToken = (orderRow as { customer_token?: string | null } | null)?.customer_token ?? null;
    }
    // Emails al cliente: solo 3 por pedido (hora exacta, listo / en camino,
    // cancelado). El resto de los estados va por seguimiento y push.
    let result: NotifyStatusResult;
    const kind = customerEmailKind(status, orderType);
    if (!kind) {
      result = { channel: 'none', success: true, error: 'no_email_for_status' };
    } else if (!customerEmail || !orderId) {
      result = { channel: 'none', success: false, error: 'no_contact_info' };
    } else {
      result = await sendStatusEmail({ orderId, restaurantId, kind, estimatedMinutes, etaUpdate, allowRepeat });
    }

    void logNotification(orderId, restaurantId, status, result);

    // Push notification — fire-and-forget
    if (orderId) {
      const TERMINAL_STATUSES = ['delivered', 'completed', 'cancelled'];
      import('./push').then(({ sendPushToOrder, sendExpoPushToCustomerByPhone, getStatusPushPayload }) => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
        const trackUrl = `${appUrl}/${restaurant.slug}/orden/${orderNumber}${custToken ? `?t=${custToken}` : ''}`;
        const payload = getStatusPushPayload(status, orderNumber, restaurant.name, trackUrl, resolvedCustomerLocale, orderType);
        // Web push (browser notifications on menius.app tab)
        // Un push roto antes no dejaba rastro: ahora queda en el log.
        const logPushErr = (channel: string) => (err: unknown) =>
          logger.warn('push failed', { channel, orderId, status, error: err instanceof Error ? err.message : String(err) });
        sendPushToOrder(orderId, payload).catch(logPushErr('web'));
        // Expo push (Menius mobile app — guest-first, matched by phone)
        if (customerPhone) {
          sendExpoPushToCustomerByPhone(customerPhone, payload).catch(logPushErr('expo'));
        }

        // Clean up subscriptions after terminal statuses — no more updates coming
        if (TERMINAL_STATUSES.includes(status)) {
          const adminDb = createAdminClient();
          void Promise.resolve(
            adminDb.from('push_subscriptions').delete().eq('order_id', orderId),
          ).catch(() => {});
        }
      }).catch((err) => logger.warn('push module failed', { orderId, error: err instanceof Error ? err.message : String(err) }));
    }

    return result;
  } catch (err) {
    logger.error('Error sending status update', { error: err instanceof Error ? err.message : String(err) });
    return { channel: 'none', success: false, error: 'internal_error' };
  }
}

/**
 * Send notifications after a Stripe payment is confirmed.
 * - Receipt email to customer (if they have an email)
 * - "Payment confirmed" notification to restaurant owner
 * Fire-and-forget — called from the payments webhook.
 */
export async function sendPaymentConfirmedNotifications(orderId: string) {
  const adminDb = createAdminClient();

  const { data: order } = await adminDb
    .from('orders')
    .select(`
      id, restaurant_id, order_number, total, customer_name, customer_email, customer_phone,
      order_type, delivery_address, customer_locale, customer_token,
      restaurants ( name, slug, currency, locale, notification_email, notifications_enabled, timezone )
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return;

  type RestaurantRow = { name: string; slug: string; currency: string | null; locale: string | null; notification_email: string | null; notifications_enabled: boolean | null; timezone?: string | null };
  type OrderRow = typeof order & {
    customer_locale: string | null;
    customer_phone: string | null;
    order_type: string | null;
    delivery_address: string | null;
    restaurants: RestaurantRow[] | RestaurantRow | null;
  };
  const typedOrder = order as unknown as OrderRow;
  const rawRest = typedOrder.restaurants;
  const restaurant: RestaurantRow | null = Array.isArray(rawRest) ? (rawRest[0] ?? null) : rawRest;
  if (!restaurant) return;

  // Los pedidos online no avisan al crearse (no estaban cobrados): este es el
  // aviso de "pedido nuevo" en el panel, igual que notifyNewOrder para efectivo.
  createDashboardNotification({
    restaurantId: (order as { restaurant_id?: string }).restaurant_id ?? '',
    type: 'new_order',
    title: restaurant.locale === 'en' ? `New order #${order.order_number}` : `Nuevo pedido #${order.order_number}`,
    body: `${order.customer_name} — ${formatPrice(Number(order.total), restaurant.currency ?? 'MXN')}`,
    actionUrl: '/app/orders',
    metadata: { order_id: order.id, order_number: order.order_number },
  }).catch((err) => {
    logger.error('Failed to create dashboard notification (paid)', { error: err instanceof Error ? err.message : String(err), orderId });
  });

  const notificationsOn = restaurant.notifications_enabled !== false;
  if (!notificationsOn) return;

  const currency = restaurant.currency ?? 'MXN';
  const restaurantLocale = restaurant.locale ?? 'es';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const totalFormatted = formatPrice(Number(order.total), currency);

  // Fetch rich items (variants, modifiers, extras) so the receipt shows full detail
  const emailItems: OrderEmailItem[] = await fetchRichItems(orderId, currency);

  const jobs: Promise<boolean>[] = [];

  // Recibo pagado al cliente (email 1 de 3 de los pedidos online).
  if (order.customer_email) {
    jobs.push((async () => {
      const full = await loadCustomerEmailOrder(orderId);
      if (!full?.customerEmail) return false;
      const ok = await sendCustomerEmail(full, buildReceiptEmail({ ...full.ctx, paid: true }));
      void logNotification(orderId, full.restaurantId, 'email_receipt', { channel: 'email', success: ok });
      return ok;
    })());
  }

  // Notification to restaurant owner
  if (restaurant.notification_email) {
    const ownerHtml = buildOwnerNewOrderEmail({
      orderNumber: order.order_number,
      restaurantName: restaurant.name,
      customerName: order.customer_name,
      customerPhone: typedOrder.customer_phone ?? undefined,
      customerEmail: order.customer_email ?? undefined,
      orderType: typedOrder.order_type ?? 'dine_in',
      deliveryAddress: typedOrder.delivery_address ?? undefined,
      total: totalFormatted,
      items: emailItems,
      dashboardUrl: `${appUrl}/app/orders`,
      locale: restaurantLocale, // owner email always in restaurant's language
      timezone: restaurant.timezone ?? undefined,
    });
    const ownerEn = restaurantLocale === 'en';
    jobs.push(sendEmail({
      to: restaurant.notification_email,
      subject: ownerEn
        ? `💳 Payment confirmed — Order #${order.order_number} — ${totalFormatted}`
        : `💳 Pago confirmado — Pedido #${order.order_number} — ${totalFormatted}`,
      html: ownerHtml,
    }));
  }

  if (jobs.length > 0) {
    await Promise.all(jobs).catch((err) => {
      logger.error('Failed to send payment confirmed emails', { error: err instanceof Error ? err.message : String(err), orderId });
    });
  }
}

