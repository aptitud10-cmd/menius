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

/**
 * Creates an alert only if no unresolved one already exists with the same
 * `dedupeKey` in its metadata.
 *
 * The monitoring crons run every 10 minutes and re-detect the same condition
 * on every pass, so without this each stuck order produced one row per run:
 * prod reached 3.597 alerts in 28 hours — 346 of them for a single order that
 * had been pending since April. The dashboard became unreadable, which is the
 * same as having no alerting at all.
 *
 * The key is stored under `metadata.dedupe_key` and matched with a `contains`
 * filter, so it survives whatever else the caller puts in `data`.
 */
export async function createAlertOnce(
  dedupeKey: string,
  payload: AlertPayload,
): Promise<boolean> {
  try {
    const db = createAdminClient();
    const { data: existing, error } = await db
      .from('dev_alerts')
      .select('id')
      .contains('metadata', { dedupe_key: dedupeKey })
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle();

    // On a query error, skip the alert rather than risk re-flooding the table:
    // a missed alert is recoverable, 144 duplicates a day is not.
    if (error) return false;
    if (existing) return false;
  } catch {
    return false;
  }

  await createAlert({
    ...payload,
    metadata: { ...(payload.metadata ?? {}), dedupe_key: dedupeKey },
  });
  return true;
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
