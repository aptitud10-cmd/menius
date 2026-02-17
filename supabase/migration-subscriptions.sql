-- ============================================================
-- MIGRATION: Subscriptions / Billing
-- Run in Supabase SQL Editor AFTER the main migration
-- ============================================================

-- Subscriptions table (one per restaurant)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT NOT NULL DEFAULT '',
  stripe_subscription_id TEXT DEFAULT NULL,
  plan_id TEXT NOT NULL DEFAULT 'basic' CHECK (plan_id IN ('basic', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual')),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '13 days'),
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '13 days'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant ON subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_own_subscription" ON subscriptions
  FOR SELECT USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

CREATE POLICY "owners_update_own_subscription" ON subscriptions
  FOR UPDATE USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

-- System can insert/update (via service role in API routes)
CREATE POLICY "system_manage_subscriptions" ON subscriptions
  FOR ALL USING (true);

-- Auto-create subscription when a restaurant is created (13-day trial on basic plan)
CREATE OR REPLACE FUNCTION handle_new_restaurant_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (restaurant_id, plan_id, status, trial_start, trial_end, current_period_end)
  VALUES (
    NEW.id,
    'basic',
    'trialing',
    NOW(),
    NOW() + INTERVAL '13 days',
    NOW() + INTERVAL '13 days'
  )
  ON CONFLICT (restaurant_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_restaurant_created_subscription ON restaurants;
CREATE TRIGGER on_restaurant_created_subscription
  AFTER INSERT ON restaurants
  FOR EACH ROW EXECUTE FUNCTION handle_new_restaurant_subscription();
