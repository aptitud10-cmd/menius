-- Internal monitoring alerts (dev tool / cron monitor-orders).
-- The code (src/lib/dev-tool/alerts.ts, /api/admin/metrics) referenced this
-- table but it never existed in prod — createAlert swallowed the error and the
-- whole monitoring cron was a no-op.
CREATE TABLE IF NOT EXISTS public.dev_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

-- Service-role only (admin client). RLS on with no policies blocks anon/authenticated.
ALTER TABLE public.dev_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS dev_alerts_unresolved_idx
  ON public.dev_alerts (created_at DESC)
  WHERE resolved_at IS NULL;
