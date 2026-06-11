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
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
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

/**
 * Send an Expo Push notification to every active device whose customer phone
 * matches the given E.164-ish string. Used to notify the Menius mobile app
 * (guest-first, identity stored in app_devices keyed by phone).
 *
 * Fire-and-forget: failures are logged, never thrown.
 */
export async function sendExpoPushToCustomerByPhone(
  phone: string,
  payload: PushPayload,
): Promise<void> {
  if (!phone) return;

  try {
    const adminDb = createAdminClient();

    // Find all devices that match this phone, then their active tokens.
    const { data: devices } = await adminDb
      .from('app_devices')
      .select('id')
      .eq('phone', phone);

    if (!devices?.length) return;
    const deviceIds = devices.map((d) => d.id);

    const { data: tokens } = await adminDb
      .from('app_device_tokens')
      .select('expo_push_token, id')
      .in('device_id', deviceIds)
      .eq('is_active', true);

    if (!tokens?.length) return;

    type ExpoMessage = {
      to: string;
      title: string;
      body: string;
      data: { url: string };
      sound: 'default';
      priority: 'high';
      channelId: string;
    };
    type ExpoTicket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };

    const messages: (ExpoMessage & { _tokenId: string })[] = tokens.map((t) => ({
      to: t.expo_push_token,
      _tokenId: t.id,
      title: payload.title,
      body: payload.body,
      data: { url: payload.url ?? '' },
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: 'order-updates',
    }));

    // Expo enforces a 100-message-per-request limit.
    const EXPO_CHUNK = 100;
    const chunks: (typeof messages)[] = [];
    for (let i = 0; i < messages.length; i += EXPO_CHUNK) {
      chunks.push(messages.slice(i, i + EXPO_CHUNK));
    }

    const invalidIds: string[] = [];

    for (const chunk of chunks) {
      // Strip internal _tokenId before sending — Expo doesn't accept extra fields.
      const body = chunk.map(({ _tokenId: _, ...msg }) => msg);

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        logger.error('Expo push send failed', { status: res.status });
        continue;
      }

      const json = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = json.data ?? [];

      // Map by index within this chunk — Expo guarantees positional alignment
      // within a single request. Guard against truncated responses.
      tickets.forEach((r, i) => {
        if (i < chunk.length && r.status === 'error' && r.details?.error === 'DeviceNotRegistered') {
          invalidIds.push(chunk[i]._tokenId);
        }
      });
    }

    // Deactivate tokens Expo reports as invalid (DeviceNotRegistered).
    if (invalidIds.length) {
      await adminDb
        .from('app_device_tokens')
        .update({ is_active: false })
        .in('id', invalidIds)
        .then(({ error }) => {
          if (error) logger.error('Failed to deactivate invalid expo tokens', { error, invalidIds });
        });
    }
  } catch (err) {
    logger.error('sendExpoPushToCustomerByPhone failed', { err });
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
    delivered: (() => {
      if (orderType === 'pickup') return {
        title: en ? `🥡 Order picked up!` : `🥡 ¡Pedido recogido!`,
        body: en ? `Order #${orderNumber} picked up. Enjoy!` : `Pedido #${orderNumber} recogido. ¡Buen provecho!`,
      };
      if (orderType === 'dine_in') return {
        title: en ? `🍽️ Order served!` : `🍽️ ¡Pedido servido!`,
        body: en ? `Order #${orderNumber} served. Enjoy your meal!` : `Pedido #${orderNumber} servido. ¡Buen provecho!`,
      };
      return {
        title: en ? `📦 Order delivered!` : `📦 ¡Pedido entregado!`,
        body: en ? `Order #${orderNumber} has been delivered. Enjoy!` : `Pedido #${orderNumber} entregado. ¡Buen provecho!`,
      };
    })(),
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
