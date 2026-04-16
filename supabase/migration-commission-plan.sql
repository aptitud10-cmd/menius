-- Commission Plan: restaurants that pay a percentage fee per order instead of a monthly subscription.
-- Restaurants with commission_plan = true receive 'business' level feature access.
-- A 4% application_fee_amount is collected on each Stripe online payment they process.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS commission_plan boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN restaurants.commission_plan IS
  'When true, this restaurant uses the commission model (4% per order) instead of a subscription. '
  'Feature access is treated as business-tier.';

-- Index for quick filtering in admin/billing contexts
CREATE INDEX IF NOT EXISTS idx_restaurants_commission_plan
  ON restaurants (commission_plan)
  WHERE commission_plan = true;
