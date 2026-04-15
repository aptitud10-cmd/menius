import { createAdminClient } from '@/lib/supabase/admin';
import { createDashboardNotification } from './dashboard-notifications';
import {
  sendWhatsApp,
  formatNewOrderWhatsApp,
  formatCustomerOrderConfirmationWhatsApp,
  formatCustomerPaymentConfirmedWhatsApp,
  formatStatusUpdateWhatsApp,
} from './whatsapp';
import { sendSMS, resolveChannel, formatStatusUpdateSMS, formatOrderConfirmationSMS } from './sms';
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
  orderType?: string;
  deliveryAddress?: string | null;
  paymentMethod?: string;
  tableNumber?: string | null;
  notes?: string | null;
  includeUtensils?: boolean;
  total: number;
  items: { name: string; qty: number; price: number; variant?: string; modifiers?: string[]; extras?: string[]; notes?: string }[];
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

    return rows.map((row: any) => {
      const modifiers: string[] = (row.order_item_modifiers ?? []).map(
        (m: any) => `${m.group_name}: ${m.option_name}`
      );
      const extras: string[] = (row.order_item_extras ?? [])
        .filter((e: any) => e.product_extras?.name)
        .map((e: any) => {
          const extraPrice = Number(e.price);
          return extraPrice > 0
            ? `${e.product_extras.name} (+${formatPrice(extraPrice, currency)})`
            : e.product_extras.name;
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
 * - WhatsApp to restaurant owner (if configured)
 * - Email to customer (if email provided & Resend configured)
 * Non-blocking — errors are logged but don't affect the order flow.
 */
export async function notifyNewOrder(payload: OrderNotificationPayload) {
  const { orderId, orderNumber, restaurantId, restaurantData, customerName, customerEmail, customerPhone, orderType, deliveryAddress, paymentMethod, tableNumber, notes, includeUtensils, total, items } = payload;

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
    const locale = restaurant.locale ?? 'es';
    const en = locale === 'en';
    const notificationsOn = restaurant.notifications_enabled !== false;

    // Fetch rich items (with variants/modifiers/extras) if orderId available
    const richItems: OrderEmailItem[] = orderId
      ? await fetchRichItems(orderId, currency)
      : items.map(i => ({
          name: i.name,
          qty: i.qty,
          price: formatPrice(i.price, currency),
          variant: i.variant,
          modifiers: i.modifiers,
          extras: i.extras,
          notes: i.notes,
        }));

    // Alert to restaurant — WhatsApp preferred, SMS fallback
    if (notificationsOn && restaurant.notification_whatsapp) {
      const itemsSummary = (richItems.length ? richItems : items.map(i => ({ name: i.name, qty: i.qty, price: formatPrice(i.price, currency) })))
        .map((i) => `• ${i.qty}x ${i.name} — ${i.price}`)
        .join('\n');
      const utensilsNote = includeUtensils === false ? undefined : '🍴 Incluir cubiertos';
      const fullNotes = [notes, utensilsNote].filter(Boolean).join('\n') || undefined;
      const text = formatNewOrderWhatsApp(orderNumber, customerName, totalFormatted, itemsSummary, orderType, tableNumber ?? undefined, fullNotes, deliveryAddress ?? undefined);

      const restaurantChannel = resolveChannel(restaurant.notification_whatsapp);
      if (restaurantChannel === 'sms') {
        sendSMS({ to: restaurant.notification_whatsapp, text }).catch(() => {});
      } else {
        sendWhatsApp({ to: restaurant.notification_whatsapp, text }).catch(() => {});
      }
    }

    // Customer order confirmation (channel routed by phone country)
    if (notificationsOn && customerPhone && paymentMethod !== 'online') {
      const channel = resolveChannel(customerPhone);
      if (channel === 'sms') {
        const text = formatOrderConfirmationSMS(orderNumber, restaurant.name, totalFormatted, trackingUrl, locale);
        sendSMS({ to: customerPhone, text }).catch(() => {});
      } else {
        const en = locale === 'en';
        const confirmText = formatCustomerOrderConfirmationWhatsApp(orderNumber, restaurant.name, totalFormatted, trackingUrl, locale);
        // Append bidirectional confirmation prompt
        const biText = en
          ? `${confirmText}\n\nReply *1* to confirm your order or *2* to cancel it.`
          : `${confirmText}\n\nResponde *1* para confirmar tu orden o *2* para cancelarla.`;
        sendWhatsApp({ to: customerPhone, text: biText }).catch(() => {});

        // Store pending order in WhatsApp agent session so replies "1"/"2" are routed correctly
        if (orderId) {
          (async () => {
            try {
              const { storeOrderAwaitingConfirmation } = await import('@/lib/whatsapp/agent');
              await storeOrderAwaitingConfirmation(customerPhone, orderId, orderNumber, restaurant.id ?? '', restaurant.name, restaurant.slug, locale, restaurant.currency ?? 'MXN');
            } catch { /* non-critical */ }
          })();
        }
      }
    }

    const emailJobs: Promise<boolean>[] = [];

    // Confirmation email to customer
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
        locale,
      });

      emailJobs.push(sendEmail({
        to: customerEmail,
        from: `${restaurant.name} <noreply@menius.app>`,
        subject: en
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
      await Promise.all(emailJobs).catch(() => {});
    }

    // In-app dashboard notification (fire-and-forget)
    createDashboardNotification({
      restaurantId,
      type: 'new_order',
      title: `Nuevo pedido #${orderNumber}`,
      body: `${customerName} — ${totalFormatted}`,
      actionUrl: '/app/orders',
      metadata: { order_id: orderId, order_number: orderNumber },
    }).catch(() => {});
  } catch (err) {
    console.error('[Notifications] Error sending new order notifications:', err);
  }
}

export interface NotifyStatusResult {
  channel: 'whatsapp' | 'sms' | 'email' | 'none';
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
  orderType?: string;
  deliveryAddress?: string;
  estimatedMinutes?: number;
}): Promise<NotifyStatusResult> {
  const { orderId, orderNumber, restaurantId, status, customerName, customerEmail, customerPhone, orderType, estimatedMinutes } = params;

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const trackingUrl = `${appUrl}/${restaurant.slug}/orden/${orderNumber}`;
    const reviewUrl = orderId ? `${appUrl}/${restaurant.slug}/review/${orderId}` : undefined;

    let result: NotifyStatusResult;

    // Route by channel based on phone country code
    if (customerPhone) {
      const primaryChannel = resolveChannel(customerPhone);

      if (primaryChannel === 'sms') {
        // SMS primary channel
        const text = formatStatusUpdateSMS(orderNumber, status, restaurant.name, trackingUrl, reviewUrl, orderType, rLocale, estimatedMinutes);
        const smsResult = await sendSMS({ to: customerPhone, text });
        if (smsResult.success) {
          if (customerEmail) {
            const html = buildStatusUpdateEmail({ customerName, orderNumber, restaurantName: restaurant.name, status, trackingUrl, reviewUrl, locale: rLocale, orderType, estimatedMinutes });
            sendEmail({ to: customerEmail, from: `${restaurant.name} <noreply@menius.app>`, subject: getStatusSubject(status, orderNumber, restaurant.name, rLocale, orderType), html }).catch(() => {});
          }
          result = { channel: 'sms', success: true };
        } else if (customerEmail) {
          // SMS failed — fallback to email
          const html = buildStatusUpdateEmail({ customerName, orderNumber, restaurantName: restaurant.name, status, trackingUrl, reviewUrl, locale: rLocale, orderType, estimatedMinutes });
          const emailOk = await sendEmail({ to: customerEmail, from: `${restaurant.name} <noreply@menius.app>`, subject: getStatusSubject(status, orderNumber, restaurant.name, rLocale, orderType), html });
          result = { channel: 'email', success: emailOk, error: 'sms_failed_fallback_email' };
        } else {
          result = { channel: 'sms', success: false, error: 'sms_failed_no_fallback' };
        }
      } else {
        // LATAM + rest of world: WhatsApp primary
        const text = formatStatusUpdateWhatsApp(orderNumber, status, restaurant.name, rLocale, trackingUrl, reviewUrl, orderType, estimatedMinutes);
        const waResult = await sendWhatsApp({ to: customerPhone, text });
        if (waResult.success) {
          if (customerEmail) {
            const html = buildStatusUpdateEmail({ customerName, orderNumber, restaurantName: restaurant.name, status, trackingUrl, reviewUrl, locale: rLocale, orderType, estimatedMinutes });
            sendEmail({ to: customerEmail, from: `${restaurant.name} <noreply@menius.app>`, subject: getStatusSubject(status, orderNumber, restaurant.name, rLocale, orderType), html }).catch(() => {});
          }
          result = { channel: 'whatsapp', success: true };
        } else if (customerEmail) {
          // WhatsApp failed — fallback to email
          const html = buildStatusUpdateEmail({ customerName, orderNumber, restaurantName: restaurant.name, status, trackingUrl, reviewUrl, locale: rLocale, orderType, estimatedMinutes });
          const emailOk = await sendEmail({ to: customerEmail, from: `${restaurant.name} <noreply@menius.app>`, subject: getStatusSubject(status, orderNumber, restaurant.name, rLocale, orderType), html });
          result = { channel: 'email', success: emailOk, error: 'whatsapp_failed_fallback_email' };
        } else {
          result = { channel: 'whatsapp', success: false, error: 'whatsapp_failed_no_fallback' };
        }
      }
    } else if (customerEmail) {
      // No phone — email only
      const html = buildStatusUpdateEmail({ customerName, orderNumber, restaurantName: restaurant.name, status, trackingUrl, reviewUrl, locale: rLocale, orderType, estimatedMinutes });
      const emailOk = await sendEmail({ to: customerEmail, from: `${restaurant.name} <noreply@menius.app>`, subject: getStatusSubject(status, orderNumber, restaurant.name, rLocale, orderType), html });
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
        const payload = getStatusPushPayload(status, orderNumber, restaurant.name, trackUrl, rLocale, orderType);
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
      order_type, delivery_address,
      restaurants ( name, slug, currency, locale, notification_email, notifications_enabled )
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return;

  type RestaurantRow = { name: string; slug: string; currency: string | null; locale: string | null; notification_email: string | null; notifications_enabled: boolean | null };
  const rawRest = (order as unknown as { restaurants: RestaurantRow[] | RestaurantRow | null }).restaurants;
  const restaurant: RestaurantRow | null = Array.isArray(rawRest) ? (rawRest[0] ?? null) : rawRest;
  if (!restaurant) return;

  const notificationsOn = restaurant.notifications_enabled !== false;
  if (!notificationsOn) return;

  const currency = restaurant.currency ?? 'MXN';
  const locale = restaurant.locale ?? 'es';
  const en = locale === 'en';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const trackingUrl = `${appUrl}/${restaurant.slug}/orden/${order.order_number}`;
  const totalFormatted = formatPrice(Number(order.total), currency);

  // Fetch rich items (variants, modifiers, extras) so the receipt shows full detail
  const emailItems: OrderEmailItem[] = await fetchRichItems(orderId, currency);

  const jobs: Promise<boolean>[] = [];

  // Receipt to customer
  if (order.customer_email) {
    const html = buildPaymentReceiptEmail({
      customerName: order.customer_name,
      orderNumber: order.order_number,
      restaurantName: restaurant.name,
      total: totalFormatted,
      items: emailItems,
      trackingUrl,
      locale,
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
      customerPhone: (order as any).customer_phone ?? undefined,
      customerEmail: order.customer_email ?? undefined,
      orderType: (order as any).order_type ?? 'dine_in',
      deliveryAddress: (order as any).delivery_address ?? undefined,
      total: totalFormatted,
      items: emailItems,
      dashboardUrl: `${appUrl}/app/orders`,
      locale,
    });
    jobs.push(sendEmail({
      to: restaurant.notification_email,
      subject: en
        ? `💳 Payment confirmed — Order #${order.order_number} — ${totalFormatted}`
        : `💳 Pago confirmado — Pedido #${order.order_number} — ${totalFormatted}`,
      html: ownerHtml,
    }));
  }

  // Payment confirmation to customer (channel routed by phone country)
  if ((order as any).customer_phone) {
    const phone: string = (order as any).customer_phone;
    const channel = resolveChannel(phone);
    if (channel === 'sms') {
      const text = `✅ Payment confirmed for order #${order.order_number} at ${restaurant.name}. Total: ${totalFormatted}. Track: ${trackingUrl}`;
      sendSMS({ to: phone, text }).catch(() => {});
    } else {
      const text = formatCustomerPaymentConfirmedWhatsApp(order.order_number, restaurant.name, totalFormatted, trackingUrl, locale);
      sendWhatsApp({ to: phone, text }).catch(() => {});
    }
  }

  if (jobs.length > 0) {
    await Promise.all(jobs).catch(() => {});
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
