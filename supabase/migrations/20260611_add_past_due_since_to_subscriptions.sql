-- Add past_due_since column to subscriptions for the dunning grace period.
--
-- When a card charge fails, Stripe marks the subscription 'past_due' and retries
-- (Smart Retries) on its own for ~3 weeks before canceling. During that window we
-- want to keep the customer's plan active for a GRACE PERIOD (7 days), then degrade
-- to 'free' so they stop getting paid features for free indefinitely.
--
-- `past_due_since` records WHEN the subscription first entered past_due, so the
-- grace window is measured from the first failure, not reset on every Stripe retry.
-- It is set on the first invoice.payment_failed and cleared on invoice.paid /
-- transition back to active.
--
-- Distinct from:
--   canceled_at  — subscription actually deleted
--   cancel_at    — scheduled future cancellation (cancel_at_period_end)
--
-- IF NOT EXISTS makes this a no-op if added manually later.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz DEFAULT NULL;
