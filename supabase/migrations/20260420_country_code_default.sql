-- Backfill country_code for existing restaurants that don't have one yet.
-- Derives country from the existing currency field (best-effort mapping).
-- Restaurants that already have a country_code (from the taxes section) are untouched.

UPDATE restaurants
SET country_code = CASE currency
  WHEN 'MXN' THEN 'MX'
  WHEN 'COP' THEN 'CO'
  WHEN 'PEN' THEN 'PE'
  WHEN 'CLP' THEN 'CL'
  WHEN 'ARS' THEN 'AR'
  WHEN 'DOP' THEN 'DO'
  WHEN 'BRL' THEN 'BR'
  WHEN 'GBP' THEN 'GB'
  WHEN 'CAD' THEN 'CA'
  WHEN 'AUD' THEN 'AU'
  WHEN 'EUR' THEN 'ES'
  WHEN 'USD' THEN 'US'
  ELSE 'MX'
END
WHERE country_code IS NULL OR country_code = '';
