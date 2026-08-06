import { createAdminClient } from '@/lib/supabase/admin';

interface AlertPayload {
  type?: string;
  source?: string;
  title: string;
  message?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'warning' | 'info';
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function createAlert(payload: AlertPayload): Promise<void> {
  try {
    const db = createAdminClient();
    // Callers pass context via `data`/`store_slug` — fold them into metadata
    // (the table has no dedicated columns for them; before this they were
    // silently dropped).
    const metadata: Record<string, unknown> = {
      ...((payload.data as Record<string, unknown> | undefined) ?? {}),
      ...(payload.store_slug ? { store_slug: payload.store_slug } : {}),
      ...(payload.metadata ?? {}),
    };
    await db.from('dev_alerts').insert({
      type: payload.type ?? payload.source ?? 'system',
      title: payload.title,
      message: payload.message ?? payload.description ?? '',
      severity: payload.severity ?? 'medium',
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Alerts are non-critical — never throw
  }
}
