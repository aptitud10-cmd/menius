-- Add p_notification_email param to the atomic restaurant creation RPC.
-- Moves notification_email + notifications_enabled into the same transaction as the
-- restaurant + subscription + profile inserts, eliminating the separate UPDATE that
-- could silently fail and leave the owner without order alerts.
CREATE OR REPLACE FUNCTION create_restaurant_with_subscription(
  p_name TEXT,
  p_slug TEXT,
  p_owner_user_id UUID,
  p_timezone TEXT DEFAULT 'America/Mexico_City',
  p_currency TEXT DEFAULT 'MXN',
  p_locale TEXT DEFAULT 'es',
  p_plan_id TEXT DEFAULT 'starter',
  p_notification_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_restaurant_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_trial_end TIMESTAMPTZ := NOW() + INTERVAL '14 days';
BEGIN
  INSERT INTO public.restaurants (name, slug, owner_user_id, timezone, currency, locale, notification_email, notifications_enabled)
  VALUES (p_name, p_slug, p_owner_user_id, p_timezone, p_currency, p_locale, p_notification_email, p_notification_email IS NOT NULL)
  RETURNING id INTO v_restaurant_id;

  INSERT INTO public.subscriptions (restaurant_id, plan_id, status, trial_start, trial_end, current_period_end)
  VALUES (v_restaurant_id, p_plan_id, 'trialing', v_now, v_trial_end, v_trial_end);

  INSERT INTO public.profiles (user_id, full_name, role, default_restaurant_id)
  VALUES (p_owner_user_id, '', 'owner', v_restaurant_id)
  ON CONFLICT (user_id) DO UPDATE SET default_restaurant_id = v_restaurant_id;

  RETURN jsonb_build_object(
    'id', v_restaurant_id,
    'name', p_name,
    'slug', p_slug,
    'owner_user_id', p_owner_user_id,
    'timezone', p_timezone,
    'currency', p_currency,
    'locale', p_locale,
    'created_at', v_now
  );
END;
$$;
