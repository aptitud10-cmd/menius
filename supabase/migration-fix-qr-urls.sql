-- Fix QR code URLs: replace vercel.app domain with menius.app
-- Run this in Supabase SQL Editor

-- Preview what will be updated
-- SELECT id, name, qr_code_value FROM tables WHERE qr_code_value LIKE '%vercel.app%';

-- Update all QR code values that contain vercel.app
UPDATE tables
SET qr_code_value = REPLACE(qr_code_value, 'menius.vercel.app', 'menius.app')
WHERE qr_code_value LIKE '%menius.vercel.app%';

-- Also catch any other vercel.app variants
UPDATE tables
SET qr_code_value = REPLACE(qr_code_value, '.vercel.app', '.app')
WHERE qr_code_value LIKE '%vercel.app%'
  AND qr_code_value NOT LIKE '%menius.app%';
