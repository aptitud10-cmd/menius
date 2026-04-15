import { createLogger } from '@/lib/logger';

const logger = createLogger('orders:guards');

export interface RestaurantData {
  id: string;
  slug: string;
  delivery_fee: number;
  name: string;
  currency: string;
  locale: string;
  notification_email: string | null;
  notification_whatsapp: string | null;
  notifications_enabled: boolean;
  orders_paused_until?: string | null;
  operating_hours?: Record<string, { open: string; close: string; closed?: boolean }> | null;
  timezone?: string;
  tax_rate?: number;
  tax_included?: boolean;
  tax_label?: string;
}

export function checkPauseGuard(restaurant: RestaurantData, en: boolean): string | null {
  const pausedUntil = restaurant.orders_paused_until;
  if (pausedUntil && new Date(pausedUntil) > new Date()) {
    return en
      ? 'This restaurant is not accepting orders right now. Please try again later.'
      : 'El restaurante no está aceptando órdenes en este momento. Intenta más tarde.';
  }
  return null;
}

export function checkBusinessHours(
  restaurant: RestaurantData,
  en: boolean,
  scheduledFor?: string | null,
): string | null {
  const opHours = restaurant.operating_hours;
  if (!opHours || Object.keys(opHours).length === 0 || scheduledFor) {
    return null;
  }

  const tz = restaurant.timezone ?? 'UTC';
  const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = days[nowInTz.getDay()];
  const dayHours = opHours[day];

  let isOpen = true;
  if (!dayHours || dayHours.closed) {
    isOpen = false;
  } else if (dayHours.open && dayHours.close) {
    const [oh, om] = dayHours.open.split(':').map(Number);
    const [ch, cm] = dayHours.close.split(':').map(Number);
    const nowMins = nowInTz.getHours() * 60 + nowInTz.getMinutes();
    isOpen = nowMins >= oh * 60 + om && nowMins < ch * 60 + cm;
  }

  if (!isOpen) {
    return en
      ? 'This restaurant is currently closed. You can schedule an order for later.'
      : 'El restaurante está cerrado en este momento. Puedes programar tu pedido para más tarde.';
  }
  return null;
}

export async function checkFreeTierLimit(
  restaurantId: string,
  adminDb: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>,
  supabase: ReturnType<typeof import('@/lib/supabase/server').createServerClient>,
  en: boolean,
): Promise<string | null> {
  try {
    const { data: sub } = await (supabase as unknown as { from: (t: string) => unknown })
      .from('subscriptions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select('status, trial_end, current_period_end, plan_id').eq('restaurant_id', restaurantId).maybeSingle() as any;

    const now = new Date();
    let isFreeTier = false;

    if (!sub) {
      isFreeTier = true;
    } else {
      const { status } = sub;
      const trialStillValid = sub.trial_end && new Date(sub.trial_end) > now;
      if (status === 'active' || status === 'past_due') {
        isFreeTier = false;
      } else if (trialStillValid) {
        isFreeTier = false;
      } else {
        isFreeTier = true;
      }
    }

    if (isFreeTier) {
      const { FREE_MONTHLY_ORDER_LIMIT } = await import('@/lib/plans');
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (adminDb as any)
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', monthStart.toISOString());

      if ((count ?? 0) >= FREE_MONTHLY_ORDER_LIMIT) {
        return en
          ? `This restaurant has reached its free plan limit of ${FREE_MONTHLY_ORDER_LIMIT} orders per month.`
          : `Este restaurante alcanzó el límite del plan gratuito (${FREE_MONTHLY_ORDER_LIMIT} pedidos/mes).`;
      }
    }
  } catch (err) {
    logger.warn('Subscription check failed — proceeding', { error: err });
  }

  return null;
}
