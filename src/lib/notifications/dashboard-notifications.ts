import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('dashboard-notifications');

type NotificationType =
  | 'new_order'
  | 'order_cancelled'
  | 'low_stock'
  | 'review_received'
  | 'payment_received'
  | 'subscription'
  | 'system'
  | 'milestone';

interface CreateNotificationParams {
  restaurantId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createDashboardNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const adminDb = createAdminClient();
    await adminDb.from('dashboard_notifications').insert({
      restaurant_id: params.restaurantId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      action_url: params.actionUrl ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    logger.error('Failed to create dashboard notification', {
      error: err instanceof Error ? err.message : String(err),
      type: params.type,
      restaurant: params.restaurantId,
    });
  }
}

export async function markAllRead(restaurantId: string): Promise<void> {
  const adminDb = createAdminClient();
  await adminDb
    .from('dashboard_notifications')
    .update({ is_read: true })
    .eq('restaurant_id', restaurantId)
    .eq('is_read', false);
}

export async function getUnreadCount(restaurantId: string): Promise<number> {
  const adminDb = createAdminClient();
  const { count } = await adminDb
    .from('dashboard_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('is_read', false);
  return count ?? 0;
}
