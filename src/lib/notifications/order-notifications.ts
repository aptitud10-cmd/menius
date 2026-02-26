import { createClient } from '@/lib/supabase/server';
import { sendWhatsApp, formatNewOrderWhatsApp, formatStatusUpdateWhatsApp } from './whatsapp';
import { sendEmail, buildOrderConfirmationEmail, buildStatusUpdateEmail, buildOwnerNewOrderEmail } from './email';
import { formatPrice } from '@/lib/utils';

interface OrderNotificationPayload {
  orderId: string;
  orderNumber: string;
  restaurantId: string;
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
  const { orderNumber, restaurantId, customerName, customerEmail, customerPhone, orderType, total, items } = payload;

  try {
    const supabase = createClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, slug, currency, locale, notification_whatsapp, notification_email, notifications_enabled')
      .eq('id', restaurantId)
      .maybeSingle();

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
    const supabase = createClient();

    const { data: restaurant } = await supabase
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
