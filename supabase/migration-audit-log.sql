-- ============================================================
-- MIGRATION: Subscription Audit Log
-- Tracks every subscription state change for debugging and compliance.
-- Run in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_restaurant ON subscription_audit_log(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON subscription_audit_log(created_at DESC);

ALTER TABLE subscription_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_audit_log" ON subscription_audit_log
  FOR ALL USING (true);

-- Auto-log every subscription change via trigger
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_audit_log (restaurant_id, action, old_status, new_status, metadata)
    VALUES (NEW.restaurant_id, 'created', NULL, NEW.status, jsonb_build_object(
      'plan_id', NEW.plan_id,
      'trigger', 'db_trigger'
    ));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.subscription_audit_log (restaurant_id, action, old_status, new_status, metadata)
    VALUES (NEW.restaurant_id, 'status_changed', OLD.status, NEW.status, jsonb_build_object(
      'plan_id', NEW.plan_id,
      'old_plan_id', OLD.plan_id,
      'stripe_subscription_id', NEW.stripe_subscription_id,
      'trigger', 'db_trigger'
    ));
  ELSIF TG_OP = 'UPDATE' AND OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
    INSERT INTO public.subscription_audit_log (restaurant_id, action, old_status, new_status, metadata)
    VALUES (NEW.restaurant_id, 'plan_changed', OLD.status, NEW.status, jsonb_build_object(
      'old_plan_id', OLD.plan_id,
      'new_plan_id', NEW.plan_id,
      'trigger', 'db_trigger'
    ));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_audit ON subscriptions;
CREATE TRIGGER trg_subscription_audit
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_subscription_change();
