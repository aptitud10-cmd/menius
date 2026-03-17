import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsApp, formatNewOrderWhatsApp, formatStatusUpdateWhatsApp } from './whatsapp';
import { sendEmail, buildOrderConfirmationEmail, buildStatusUpdateEmail, buildOwnerNewOrderEmail, buildPaymentReceiptEmail, type OrderEmailItem } from './email';
import { formatPrice } from '@/lib/utils';

interface RestaurantNotificationData {
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
  paymentMethod?: string;
  tableNumber?: string | null;
  notes?: string | null;
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
  const { orderId, orderNumber, restaurantId, restaurantData, customerName, customerEmail, customerPhone, orderType, paymentMethod, tableNumber, notes, total, items } = payload;

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

    // WhatsApp alert to restaurant
    if (notificationsOn && restaurant.notification_whatsapp) {
      const itemsSummary = (richItems.length ? richItems : items.map(i => ({ name: i.name, qty: i.qty, price: formatPrice(i.price, currency) })))
        .map((i) => `• ${i.qty}x ${i.name} — ${i.price}`)
        .join('\n');
      const text = formatNewOrderWhatsApp(orderNumber, customerName, totalFormatted, itemsSummary);
      sendWhatsApp({ to: restaurant.notification_whatsapp, text }).catch(() => {});
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
  } catch (err) {
    console.error('[Notifications] Error sending new order notifications:', err);
  }
}

/**
 * Send notifications when order status changes.
 * - Email to customer (if we have an email for the order)
 * Non-blocking.
 */
export async function notifyStatusChange(params: {
  orderNumber: string;
  restaurantId: string;
  status: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  const { orderNumber, restaurantId, status, customerName, customerEmail, customerPhone } = params;

  try {
    const adminDb = createAdminClient();

    const { data: restaurant } = await adminDb
      .from('restaurants')
      .select('name, slug, locale, notifications_enabled')
      .eq('id', restaurantId)
      .maybeSingle();

    if (!restaurant || restaurant.notifications_enabled === false) return;

    const rLocale = restaurant.locale ?? 'es';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const trackingUrl = `${appUrl}/${restaurant.slug}/orden/${orderNumber}`;

    const jobs: Promise<any>[] = [];

    if (customerEmail) {
      const html = buildStatusUpdateEmail({
        customerName,
        orderNumber,
        restaurantName: restaurant.name,
        status,
        trackingUrl,
        locale: rLocale,
      });

      jobs.push(sendEmail({
        to: customerEmail,
        from: `${restaurant.name} <noreply@menius.app>`,
        subject: getStatusSubject(status, orderNumber, restaurant.name, rLocale),
        html,
      }));
    }

    if (customerPhone) {
      const text = formatStatusUpdateWhatsApp(orderNumber, status, restaurant.name);
      sendWhatsApp({ to: customerPhone, text }).catch(() => {});
    }

    if (jobs.length > 0) {
      await Promise.all(jobs).catch(() => {});
    }
  } catch (err) {
    console.error('[Notifications] Error sending status update:', err);
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
      id, order_number, total, customer_name, customer_email,
      restaurants ( name, slug, currency, locale, notification_email, notifications_enabled ),
      order_items ( qty, unit_price, line_total, products ( name ) )
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return;

  const restaurant = (order as any).restaurants;
  if (!restaurant) return;

  const notificationsOn = restaurant.notifications_enabled !== false;
  if (!notificationsOn) return;

  const currency = restaurant.currency ?? 'MXN';
  const locale = restaurant.locale ?? 'es';
  const en = locale === 'en';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const trackingUrl = `${appUrl}/${restaurant.slug}/orden/${order.order_number}`;
  const totalFormatted = formatPrice(Number(order.total), currency);

  // Use rich items fetched in query
  const emailItems: OrderEmailItem[] = ((order as any).order_items ?? []).map((item: any) => ({
    name: item.products?.name ?? 'Item',
    qty: item.qty,
    price: formatPrice(Number(item.line_total), currency),
  }));

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
      orderType: 'dine_in',
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

  if (jobs.length > 0) {
    await Promise.all(jobs).catch(() => {});
  }
}

function getStatusSubject(status: string, orderNumber: string, restaurantName: string, locale = 'es'): string {
  const en = locale === 'en';
  const subjects: Record<string, string> = en
    ? {
        confirmed: `Order #${orderNumber} confirmed`,
        preparing: `Your order #${orderNumber} is being prepared`,
        ready: `Your order #${orderNumber} is ready!`,
        delivered: `Order #${orderNumber} delivered — Enjoy!`,
        cancelled: `Order #${orderNumber} cancelled`,
      }
    : {
        confirmed: `Pedido #${orderNumber} confirmado`,
        preparing: `Tu pedido #${orderNumber} se está preparando`,
        ready: `¡Tu pedido #${orderNumber} está listo!`,
        delivered: `Pedido #${orderNumber} entregado — ¡Buen provecho!`,
        cancelled: `Pedido #${orderNumber} cancelado`,
      };
  const fallback = en ? `Order #${orderNumber} update` : `Actualización pedido #${orderNumber}`;
  return `${subjects[status] ?? fallback} — ${restaurantName}`;
}
