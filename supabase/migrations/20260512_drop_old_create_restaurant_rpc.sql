-- Drop the old 7-parameter version of create_restaurant_with_subscription.
-- The current codebase calls the 8-parameter version (with p_notification_email).
-- The old version is unreachable from app code and poses an overload ambiguity risk.
DROP FUNCTION IF EXISTS public.create_restaurant_with_subscription(
  p_name text,
  p_slug text,
  p_owner_user_id uuid,
  p_timezone text,
  p_currency text,
  p_locale text,
  p_plan_id text
);
