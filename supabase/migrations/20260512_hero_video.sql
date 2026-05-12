-- Sprint 4.1: Hero video URL for restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS hero_video_url TEXT DEFAULT NULL;
