-- ============================================================
-- MIGRATION: Fix Subscriptions — rename column, plan IDs, trial duration, remove trigger
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Rename column from "plan" to "plan_id" (matches all app code)
ALTER TABLE subscriptions RENAME COLUMN plan TO plan_id;

-- 2. Update existing rows to use new plan IDs
UPDATE subscriptions SET plan_id = 'starter' WHERE plan_id = 'basic';
UPDATE subscriptions SET plan_id = 'business' WHERE plan_id = 'enterprise';

-- 3. Drop old CHECK constraint and add new one
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_check;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_id_check
  CHECK (plan_id IN ('starter', 'pro', 'business'));

-- 4. Update default plan_id
ALTER TABLE subscriptions ALTER COLUMN plan_id SET DEFAULT 'starter';

-- 5. Fix trial / period defaults to 14 days
ALTER TABLE subscriptions ALTER COLUMN current_period_end SET DEFAULT (NOW() + INTERVAL '14 days');
ALTER TABLE subscriptions ALTER COLUMN trial_end SET DEFAULT (NOW() + INTERVAL '14 days');

-- 6. Remove the auto-create trigger (code in restaurant.ts handles creation)
DROP TRIGGER IF EXISTS on_restaurant_created_subscription ON restaurants;
DROP FUNCTION IF EXISTS handle_new_restaurant_subscription();
