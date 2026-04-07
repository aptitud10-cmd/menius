-- Dev Alerts table for the autonomous monitoring system
CREATE TABLE IF NOT EXISTS public.dev_alerts (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  severity    text        NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  source      text        NOT NULL, -- 'uptime', 'orders', 'sentry', 'stripe', 'vercel', 'cron'
  title       text        NOT NULL,
  description text,
  store_slug  text,                 -- nil = platform-level alert
  data        jsonb       DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  auto_diagnosed boolean  DEFAULT false,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS dev_alerts_created_at_idx  ON public.dev_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS dev_alerts_unresolved_idx  ON public.dev_alerts (created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS dev_alerts_store_idx       ON public.dev_alerts (store_slug) WHERE store_slug IS NOT NULL;

ALTER TABLE public.dev_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.dev_alerts USING (true) WITH CHECK (true);
