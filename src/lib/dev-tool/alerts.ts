import { createAdminClient } from '@/lib/supabase/admin';

interface AlertPayload {
  type?: string;
  source?: string;
  title: string;
  message?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'warning' | 'info';
  metadata?: Record<string, unknown>;
}

export async function createAlert(payload: AlertPayload): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from('dev_alerts').insert({
      type: payload.type ?? payload.source ?? 'system',
      title: payload.title,
      message: payload.message ?? payload.description ?? '',
      severity: payload.severity ?? 'medium',
      metadata: payload.metadata ?? {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // Alerts are non-critical — never throw
  }
}
