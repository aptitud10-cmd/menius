import { createAdminClient } from '@/lib/supabase/admin';
import { createDashboardNotification } from './dashboard-notifications';
import { sendEmail, buildOrderConfirmationEmail, buildStatusUpdateEmail, buildOwnerNewOrderEmail, buildPaymentReceiptEmail, type OrderEmailItem } from './email';
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
  const { orderId, orderNumber, restaurantId, restaurantData, customerName, customerEmail, customerPhone, customerLocale, orderType, deliveryAddress, paymentMethod, tableNumber, notes, includeUtensils, total, items } = payload;

  try {
    let restaurant = restaurantData ?? null;

    if (!restaurant) {
      const adminDb = createAdminClient();
      const { data } = await adminDb
        .from('restaurants')
        .select('name, slug, currency, locale, notification_whatsapp, notification_email, notifications_enabled')
        .eq('id', restaurantId)
        .maybeSingle();
      restaurant = data;
    }

    if (!restaurant) return;

    const currency = restaurant.currency ?? 'MXN';
    const totalFormatted = formatPrice(total, currency);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const trackingUrl = `${appUrl}/${restaurant.slug}/orden/${orderNumber}`;
    const restaurantLocale = restaurant.locale ?? 'es';
    // Customer-facing comms use the locale from the checkout session; owner-facing use restaurant locale
    const customerEffectiveLocale = customerLocale ?? restaurantLocale;
    const locale = restaurantLocale; // kept for owner email + legacy references
    const en = locale === 'en';
    const customerEn = customerEffectiveLocale === 'en';
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

    // Confirmation email to customer — use customer's language, not restaurant's
    if (notificationsOn && customerEmail) {
      const html = buildOrderConfirmationEmail({
        customerName,
        orderNumber,
        restaurantName: restaurant.name,
        total: totalFormatted,
        items: richItems,
        trackingUrl,
        orderType,
        paymentMethod,
        tableNumber,
        notes,
        locale: customerEffectiveLocale,
      });

      emailJobs.push(sendEmail({
        to: customerEmail,
        from: `${restaurant.name} <noreply@menius.app>`,
        subject: customerEn
          ? `Order #${orderNumber} confirmed — ${restaurant.name}`
          : `Pedido #${orderNumber} confirmado — ${restaurant.name}`,
        html,
      }));
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
      title: `Nuevo pedido #${orderNumber}`,
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
    await adminDb.from('order_notification_log').insert({
      order_id: orderId,
      restaurant_id: restaurantId,
      event,
      channel: result.channel,
      success: result.success,
      error_code: result.error ?? null,
    });
  } catch { /* non-critical — logging must never break the happy path */ }
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
}): Promise<NotifyStatusResult> {
  const { orderId, orderNumber, restaurantId, status, customerName, customerEmail, customerPhone, customerLocale, orderType, estimatedMinutes } = params;

  try {
    const adminDb = createAdminClient();

    const { data: restaurant } = await adminDb
      .from('restaurants')
      .select('name, slug, locale, notifications_enabled')
      .eq('id', restaurantId)
      .maybeSingle();

    if (!restaurant || restaurant.notifications_enabled === false) {
      return { channel: 'none', success: false, error: 'notifications_disabled' };
    }

    const rLocale = restaurant.locale ?? 'es';
    // If not explicitly provided, try to fetch from the stored order locale
    let resolvedCustomerLocale = customerLocale ?? rLocale;
    if (!customerLocale && orderId) {
      const { data: orderRow } = await adminDb
        .from('orders')
        .select('customer_locale')
        .eq('id', orderId)
        .maybeSingle();
      if (orderRow?.customer_locale) resolvedCustomerLocale = orderRow.customer_locale;
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const trackingUrl = `${appUrl}/${restaurant.slug}/orden/${orderNumber}`;
    const reviewUrl = orderId ? `${appUrl}/${restaurant.slug}/review/${orderId}` : undefined;

    let result: NotifyStatusResult;

    if (customerEmail) {
      const html = buildStatusUpdateEmail({ customerName, orderNumber, restaurantName: restaurant.name, status, trackingUrl, reviewUrl, locale: resolvedCustomerLocale, orderType, estimatedMinutes });
      const emailOk = await sendEmail({ to: customerEmail, from: `${restaurant.name} <noreply@menius.app>`, subject: getStatusSubject(status, orderNumber, restaurant.name, resolvedCustomerLocale, orderType), html });
      result = { channel: 'email', success: emailOk };
    } else {
      result = { channel: 'none', success: false, error: 'no_contact_info' };
    }

    void logNotification(orderId, restaurantId, status, result);

    // Push notification — fire-and-forget
    if (orderId) {
      const TERMINAL_STATUSES = ['delivered', 'completed', 'cancelled'];
      import('./push').then(({ sendPushToOrder, getStatusPushPayload }) => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
        const trackUrl = `${appUrl}/${restaurant.slug}/orden/${orderNumber}`;
        const payload = getStatusPushPayload(status, orderNumber, restaurant.name, trackUrl, resolvedCustomerLocale, orderType);
        sendPushToOrder(orderId, payload).catch(() => {});

        // Clean up subscriptions after terminal statuses — no more updates coming
        if (TERMINAL_STATUSES.includes(status)) {
          const adminDb = createAdminClient();
          void Promise.resolve(
            adminDb.from('push_subscriptions').delete().eq('order_id', orderId),
          ).catch(() => {});
        }
      }).catch(() => {});
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
      id, order_number, total, customer_name, customer_email, customer_phone,
      order_type, delivery_address, customer_locale,
      restaurants ( name, slug, currency, locale, notification_email, notifications_enabled )
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return;

  type RestaurantRow = { name: string; slug: string; currency: string | null; locale: string | null; notification_email: string | null; notifications_enabled: boolean | null };
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

  const notificationsOn = restaurant.notifications_enabled !== false;
  if (!notificationsOn) return;

  const currency = restaurant.currency ?? 'MXN';
  const restaurantLocale = restaurant.locale ?? 'es';
  // Use customer's checkout language for customer receipt; restaurant locale for owner notification
  const customerLocale = typedOrder.customer_locale ?? restaurantLocale;
  const en = customerLocale === 'en';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const trackingUrl = `${appUrl}/${restaurant.slug}/orden/${order.order_number}`;
  const totalFormatted = formatPrice(Number(order.total), currency);

  // Fetch rich items (variants, modifiers, extras) so the receipt shows full detail
  const emailItems: OrderEmailItem[] = await fetchRichItems(orderId, currency);

  const jobs: Promise<boolean>[] = [];

  // Receipt to customer — use customer's language
  if (order.customer_email) {
    const html = buildPaymentReceiptEmail({
      customerName: order.customer_name,
      orderNumber: order.order_number,
      restaurantName: restaurant.name,
      total: totalFormatted,
      items: emailItems,
      trackingUrl,
      locale: customerLocale,
    });

    jobs.push(sendEmail({
      to: order.customer_email,
      from: `${restaurant.name} <noreply@menius.app>`,
      subject: en
        ? `✅ Payment confirmed — Order #${order.order_number} at ${restaurant.name}`
        : `✅ Pago confirmado — Pedido #${order.order_number} en ${restaurant.name}`,
      html,
    }));
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

function getStatusSubject(status: string, orderNumber: string, restaurantName: string, locale = 'es', orderType?: string): string {
  const en = locale === 'en';
  const deliveredEn = orderType === 'pickup'
    ? `Order #${orderNumber} picked up — Enjoy!`
    : orderType === 'dine_in'
      ? `Order #${orderNumber} served — Enjoy!`
      : `Order #${orderNumber} delivered — Enjoy!`;
  const deliveredEs = orderType === 'pickup'
    ? `Pedido #${orderNumber} recogido — ¡Buen provecho!`
    : orderType === 'dine_in'
      ? `Pedido #${orderNumber} servido — ¡Buen provecho!`
      : `Pedido #${orderNumber} entregado — ¡Buen provecho!`;
  const subjects: Record<string, string> = en
    ? {
        confirmed: `Order #${orderNumber} confirmed`,
        preparing: `Your order #${orderNumber} is being prepared`,
        ready: `Your order #${orderNumber} is ready!`,
        delivered: deliveredEn,
        cancelled: `Order #${orderNumber} cancelled`,
      }
    : {
        confirmed: `Pedido #${orderNumber} confirmado`,
        preparing: `Tu pedido #${orderNumber} se está preparando`,
        ready: `¡Tu pedido #${orderNumber} está listo!`,
        delivered: deliveredEs,
        cancelled: `Pedido #${orderNumber} cancelado`,
      };
  const fallback = en ? `Order #${orderNumber} update` : `Actualización pedido #${orderNumber}`;
  return `${subjects[status] ?? fallback} — ${restaurantName}`;
}
