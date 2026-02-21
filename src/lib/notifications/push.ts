import { createClient } from '@/lib/supabase/server';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToOrder(orderId: string, payload: PushPayload) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublic || !vapidPrivate) return;

  try {
    const webpush = (await import('web-push')).default;

    webpush.setVapidDetails(
      'mailto:soportemenius@gmail.com',
      vapidPublic,
      vapidPrivate
    );

    const supabase = createClient();

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth')
      .eq('order_id', orderId);

    if (!subs || subs.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: payload.tag ?? 'menius-order',
      data: { url: payload.url ?? '/' },
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          },
          pushPayload
        )
      )
    );

    const expired = results
      .map((r, i) => (r.status === 'rejected' && (r.reason as any)?.statusCode === 410 ? subs[i].endpoint : null))
      .filter(Boolean);

    if (expired.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expired);
    }
  } catch (err) {
    console.error('[Push] Error sending push notification:', err);
  }
}
