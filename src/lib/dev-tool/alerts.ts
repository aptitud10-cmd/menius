import { createAdminClient } from '@/lib/supabase/admin';

interface AlertPayload {
  type: string;
  title: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export async function createAlert(payload: AlertPayload): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from('dev_alerts').insert({
      type: payload.type,
      title: payload.title,
      message: payload.message,
      severity: payload.severity ?? 'medium',
      metadata: payload.metadata ?? {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // Alerts are non-critical — never throw
  }
}
