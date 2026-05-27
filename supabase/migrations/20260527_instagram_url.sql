ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT NULL;
