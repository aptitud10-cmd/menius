import { createAdminClient } from '@/lib/supabase/admin';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertSource = 'uptime' | 'orders' | 'sentry' | 'stripe' | 'vercel' | 'cron';

export interface DevAlert {
  id: string;
  severity: AlertSeverity;
  source: AlertSource;
  title: string;
  description?: string;
  store_slug?: string;
  data?: Record<string, unknown>;
  resolved_at?: string;
  auto_diagnosed: boolean;
  created_at: string;
}

export async function createAlert(
  alert: Omit<DevAlert, 'id' | 'created_at' | 'auto_diagnosed'>,
): Promise<DevAlert> {
  const db = createAdminClient();
  const { data, error } = await db.from('dev_alerts').insert(alert).select().single();
  if (error) throw new Error(`dev_alerts insert: ${error.message}`);
  return data as DevAlert;
}
