-- Add dunning_stage to subscriptions for the failed-payment email sequence.
--
-- When a subscription is past_due, a 4-step dunning email sequence runs off the
-- /api/cron/dunning cron. dunning_stage records the highest step already sent so
-- the hourly cron never re-sends the same email:
--   0 = none sent (healthy, or reset on recovery)
--   1 = day 0  — payment failed
--   2 = day 1  — reminder
--   3 = day 4  — urgent / last chance
--   4 = day 7  — downgraded to free
--
-- Reset to 0 on invoice.paid / return to active so a future failure starts fresh.
--
-- IF NOT EXISTS makes this a no-op if added manually later.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS dunning_stage smallint NOT NULL DEFAULT 0;
