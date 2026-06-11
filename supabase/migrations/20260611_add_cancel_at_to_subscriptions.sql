-- Add cancel_at column to subscriptions.
--
-- The billing webhook (src/app/api/billing/webhook/route.ts) writes `cancel_at`
-- on every customer.subscription.created / .updated event to record when a
-- subscription set to cancel_at_period_end will actually end. The column was
-- never created in the DB, so EVERY such webhook failed with error 42703,
-- returned 500, and Stripe retried it in a loop — meaning a customer's payment
-- never synced to `active` in our DB even though Stripe charged them.
--
-- This is distinct from `canceled_at` (already exists), which records when a
-- subscription was actually deleted. `cancel_at` is the scheduled future end.
--
-- IF NOT EXISTS makes this a no-op if the column was added manually later.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at timestamptz DEFAULT NULL;
