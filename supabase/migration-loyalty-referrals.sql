-- Loyalty referral system
-- Adds referral codes per loyalty account + referral tracking table

-- Add referral_code column to loyalty_accounts
ALTER TABLE public.loyalty_accounts
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_account_id UUID REFERENCES public.loyalty_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_referral_code ON public.loyalty_accounts (referral_code);

-- Add 'referral_earn' and 'referral_bonus' to loyalty_transactions type check
ALTER TABLE public.loyalty_transactions
  DROP CONSTRAINT IF EXISTS loyalty_transactions_type_check;
ALTER TABLE public.loyalty_transactions
  ADD CONSTRAINT loyalty_transactions_type_check
  CHECK (type IN ('earn', 'redeem', 'adjust', 'referral_earn', 'referral_bonus', 'birthday_bonus', 'welcome'));

-- Add referral config to loyalty_config
ALTER TABLE public.loyalty_config
  ADD COLUMN IF NOT EXISTS referral_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_points_referrer INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_points_referee INTEGER NOT NULL DEFAULT 0;

-- Function: generate a short unique referral code for a loyalty account
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_account_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- 6-char alphanumeric code from account id + random salt
    v_code := UPPER(SUBSTRING(MD5(p_account_id::text || gen_random_uuid()::text) FROM 1 FOR 6));
    SELECT EXISTS(
      SELECT 1 FROM public.loyalty_accounts WHERE referral_code = v_code
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Auto-assign referral_code when a new loyalty_account is created
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_referral_code ON public.loyalty_accounts;
CREATE TRIGGER trg_assign_referral_code
  BEFORE INSERT ON public.loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION public.assign_referral_code();

-- Backfill referral codes for existing accounts without one
UPDATE public.loyalty_accounts
SET referral_code = public.generate_referral_code(id)
WHERE referral_code IS NULL;

-- RPC: apply a referral — called when a new customer uses a referral code on first order
-- Returns: {ok: bool, referrer_points: int, referee_points: int, error: text}
CREATE OR REPLACE FUNCTION public.apply_referral(
  p_restaurant_id UUID,
  p_referee_account_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_referrer_account_id UUID;
  v_config RECORD;
  v_referee RECORD;
BEGIN
  -- Check referral is enabled and get point config
  SELECT enabled, referral_enabled, referral_points_referrer, referral_points_referee
  INTO v_config
  FROM public.loyalty_config
  WHERE restaurant_id = p_restaurant_id;

  IF NOT FOUND OR NOT v_config.enabled OR NOT v_config.referral_enabled THEN
    RETURN jsonb_build_object('ok', false, 'error', 'referral_not_enabled');
  END IF;

  IF v_config.referral_points_referrer <= 0 AND v_config.referral_points_referee <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_points_configured');
  END IF;

  -- Find referrer account by code (must be same restaurant)
  SELECT id INTO v_referrer_account_id
  FROM public.loyalty_accounts
  WHERE referral_code = UPPER(p_referral_code)
    AND restaurant_id = p_restaurant_id;

  IF v_referrer_account_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  -- Prevent self-referral
  IF v_referrer_account_id = p_referee_account_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  -- Check referee hasn't already been referred
  SELECT referred_by_account_id INTO v_referee
  FROM public.loyalty_accounts
  WHERE id = p_referee_account_id;

  IF (v_referee).referred_by_account_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_referred');
  END IF;

  -- Link referee to referrer
  UPDATE public.loyalty_accounts
  SET referred_by_account_id = v_referrer_account_id
  WHERE id = p_referee_account_id;

  -- Award referee points
  IF v_config.referral_points_referee > 0 THEN
    UPDATE public.loyalty_accounts
    SET points = points + v_config.referral_points_referee,
        lifetime_points = lifetime_points + v_config.referral_points_referee,
        updated_at = now()
    WHERE id = p_referee_account_id;

    INSERT INTO public.loyalty_transactions (restaurant_id, account_id, type, points, description)
    VALUES (p_restaurant_id, p_referee_account_id, 'referral_earn', v_config.referral_points_referee, 'Bono por usar código de referido');
  END IF;

  -- Award referrer points + increment referral_count
  IF v_config.referral_points_referrer > 0 THEN
    UPDATE public.loyalty_accounts
    SET points = points + v_config.referral_points_referrer,
        lifetime_points = lifetime_points + v_config.referral_points_referrer,
        referral_count = referral_count + 1,
        updated_at = now()
    WHERE id = v_referrer_account_id;

    INSERT INTO public.loyalty_transactions (restaurant_id, account_id, type, points, description)
    VALUES (p_restaurant_id, v_referrer_account_id, 'referral_bonus', v_config.referral_points_referrer, 'Bono por referir un nuevo cliente');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'referrer_points', v_config.referral_points_referrer,
    'referee_points', v_config.referral_points_referee
  );
END;
$$;
