import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsApp, formatNewOrderWhatsApp, formatStatusUpdateWhatsApp } from './whatsapp';
import { sendEmail, buildOrderConfirmationEmail, buildStatusUpdateEmail, buildOwnerNewOrderEmail, buildPaymentReceiptEmail } from './email';
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
  total: number;
  items: { name: string; qty: number; price: number }[];
}

/**
 * Send notifications when a new order is created.
 * - WhatsApp to restaurant owner (if configured)
 * - Email to customer (if email provided & Resend configured)
 * Non-blocking — errors are logged but don't affect the order flow.
 */
export async function notifyNewOrder(payload: OrderNotificationPayload) {
  const { orderNumber, restaurantId, restaurantData, customerName, customerEmail, customerPhone, orderType, total, items } = payload;

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
    const trackingUrl = `${appUrl}/r/${restaurant.slug}/orden/${orderNumber}`;

    const notificationsOn = restaurant.notifications_enabled !== false;

    if (notificationsOn && restaurant.notification_whatsapp) {
      const itemsSummary = items.map((i) => `• ${i.qty}x ${i.name} — ${formatPrice(i.price, currency)}`).join('\n');
      const text = formatNewOrderWhatsApp(orderNumber, customerName, totalFormatted, itemsSummary);
      sendWhatsApp({ to: restaurant.notification_whatsapp, text }).catch(() => {});
    }

    const emailItems = items.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: formatPrice(i.price, currency),
    }));

    // Email to customer
    const locale = restaurant.locale ?? 'es';
    const en = locale === 'en';

    if (notificationsOn && customerEmail) {
      const html = buildOrderConfirmationEmail({
        customerName,
        orderNumber,
        restaurantName: restaurant.name,
        total: totalFormatted,
        items: emailItems,
        trackingUrl,
        locale,
      });

      sendEmail({
        to: customerEmail,
        subject: en
          ? `Order #${orderNumber} confirmed — ${restaurant.name}`
          : `Pedido #${orderNumber} confirmado — ${restaurant.name}`,
        html,
      }).catch(() => {});
    }

    if (notificationsOn && restaurant.notification_email) {
      const ownerHtml = buildOwnerNewOrderEmail({
        orderNumber,
        customerName,
        customerPhone,
        orderType: orderType ?? 'dine_in',
        total: totalFormatted,
        items: emailItems,
        dashboardUrl: `${appUrl}/app/orders`,
        locale,
      });

      sendEmail({
        to: restaurant.notification_email,
        subject: en
          ? `🔔 New order #${orderNumber} — ${customerName} — ${totalFormatted}`
          : `🔔 Nuevo pedido #${orderNumber} — ${customerName} — ${totalFormatted}`,
        html: ownerHtml,
      }).catch(() => {});
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
    const trackingUrl = `${appUrl}/r/${restaurant.slug}/orden/${orderNumber}`;

    if (customerEmail) {
      const html = buildStatusUpdateEmail({
        customerName,
        orderNumber,
        restaurantName: restaurant.name,
        status,
        trackingUrl,
        locale: rLocale,
      });

      sendEmail({
        to: customerEmail,
        subject: getStatusSubject(status, orderNumber, restaurant.name, rLocale),
        html,
      }).catch(() => {});
    }

    if (customerPhone) {
      const text = formatStatusUpdateWhatsApp(orderNumber, status, restaurant.name);
      sendWhatsApp({ to: customerPhone, text }).catch(() => {});
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
  const trackingUrl = `${appUrl}/r/${restaurant.slug}/orden/${order.order_number}`;
  const totalFormatted = formatPrice(Number(order.total), currency);

  const emailItems = ((order as any).order_items ?? []).map((item: any) => ({
    name: item.products?.name ?? 'Producto',
    qty: item.qty,
    price: formatPrice(Number(item.line_total), currency),
  }));

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

    sendEmail({
      to: order.customer_email,
      subject: en
        ? `✅ Payment confirmed — Order #${order.order_number} at ${restaurant.name}`
        : `✅ Pago confirmado — Pedido #${order.order_number} en ${restaurant.name}`,
      html,
    }).catch(() => {});
  }

  // Notification to restaurant owner
  if (restaurant.notification_email) {
    sendEmail({
      to: restaurant.notification_email,
      subject: en
        ? `💳 Payment confirmed — Order #${order.order_number} — ${totalFormatted}`
        : `💳 Pago confirmado — Pedido #${order.order_number} — ${totalFormatted}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#059669;margin:0 0 16px;">💳 ${en ? 'Payment confirmed' : 'Pago confirmado'}</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#6b7280;width:120px;">${en ? 'Order' : 'Pedido'}</td><td style="padding:6px 0;font-weight:600;">#${order.order_number}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">${en ? 'Customer' : 'Cliente'}</td><td style="padding:6px 0;">${order.customer_name}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Total</td><td style="padding:6px 0;font-weight:700;color:#059669;">${totalFormatted}</td></tr>
          </table>
          <a href="${trackingUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#059669;color:#fff;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            ${en ? 'View order' : 'Ver pedido'}
          </a>
          <p style="font-size:11px;color:#d1d5db;margin-top:24px;">MENIUS — ${restaurant.name}</p>
        </div>
      `,
    }).catch(() => {});
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
