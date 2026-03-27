
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('push-notifications');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:hola@menius.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
}

export async function sendPushToOrder(orderId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  try {
    const adminDb = createAdminClient();
    const { data: subs } = await adminDb
      .from('push_subscriptions')
      .select('subscription')
      .eq('order_id', orderId);

    if (!subs?.length) return;

    const message = JSON.stringify(payload);

    await Promise.allSettled(
      subs.map(async ({ subscription }) => {
        try {
          await webpush.sendNotification(subscription, message);
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            // Subscription expired — clean up
            void adminDb.from('push_subscriptions').delete().eq('subscription', subscription);
          }
        }
      })
    );
  } catch (err) {
    logger.error('sendPushToOrder failed', { orderId, err });
  }
}

export function getStatusPushPayload(
  status: string,
  orderNumber: string,
  restaurantName: string,
  trackingUrl: string,
  locale: string,
  orderType?: string,
): PushPayload {
  const en = locale === 'en';

  const readyBody = (() => {
    if (orderType === 'delivery') return en ? `Order #${orderNumber} is ready — driver picking up soon` : `Pedido #${orderNumber} listo — el repartidor lo tomará pronto`;
    if (orderType === 'pickup') return en ? `Order #${orderNumber} is ready for pickup!` : `¡Pedido #${orderNumber} listo para recoger!`;
    return en ? `Order #${orderNumber} is ready — coming to your table` : `Pedido #${orderNumber} listo — ya te lo llevamos`;
  })();

  const statusMessages: Record<string, { title: string; body: string }> = {
    confirmed: {
      title: en ? `✅ Order confirmed!` : `✅ ¡Pedido confirmado!`,
      body: en ? `${restaurantName} confirmed your order #${orderNumber}` : `${restaurantName} confirmó tu pedido #${orderNumber}`,
    },
    preparing: {
      title: en ? `👨‍🍳 Preparing your order` : `👨‍🍳 Preparando tu pedido`,
      body: en ? `${restaurantName} is preparing order #${orderNumber}` : `${restaurantName} está preparando tu pedido #${orderNumber}`,
    },
    ready: {
      title: en ? `🔔 Your order is ready!` : `🔔 ¡Tu pedido está listo!`,
      body: readyBody,
    },
    delivered: {
      title: en ? `📦 Order delivered!` : `📦 ¡Pedido entregado!`,
      body: en ? `Order #${orderNumber} has been delivered. Enjoy!` : `Pedido #${orderNumber} entregado. ¡Buen provecho!`,
    },
    cancelled: {
      title: en ? `❌ Order cancelled` : `❌ Pedido cancelado`,
      body: en ? `Order #${orderNumber} was cancelled` : `Pedido #${orderNumber} fue cancelado`,
    },
  };

  const msg = statusMessages[status] ?? {
    title: en ? `Order update` : `Actualización de pedido`,
    body: en ? `Your order #${orderNumber} status changed` : `Tu pedido #${orderNumber} fue actualizado`,
  };

  return { ...msg, url: trackingUrl, icon: '/icon-192.png', badge: '/icon-192.png' };
}
