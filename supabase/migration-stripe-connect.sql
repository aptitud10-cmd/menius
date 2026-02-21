-- Stripe Connect: store connected account ID per restaurant
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;
