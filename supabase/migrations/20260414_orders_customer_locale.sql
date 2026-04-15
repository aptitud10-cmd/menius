-- Add customer_locale to orders to persist the language the customer used at checkout.
-- This enables status update notifications to be sent in the customer's language,
-- regardless of the restaurant's default locale setting.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_locale text DEFAULT 'es';
