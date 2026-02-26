-- ============================================================
-- MIGRATION: MENIUS Social Posts (automated marketing)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS menius_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin', 'tiktok')),
  post_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  hook TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  image_idea TEXT,
  best_time TEXT,
  tip TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'published')),
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menius_posts_status ON menius_posts(status);
CREATE INDEX IF NOT EXISTS idx_menius_posts_platform ON menius_posts(platform);
CREATE INDEX IF NOT EXISTS idx_menius_posts_created ON menius_posts(created_at DESC);

ALTER TABLE menius_posts ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/update (cron jobs + admin API)
CREATE POLICY "Service role full access on menius_posts"
  ON menius_posts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Storage bucket for marketing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menius-posts', 'menius-posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read menius-posts" ON storage.objects
  FOR SELECT USING (bucket_id = 'menius-posts');

CREATE POLICY "Service insert menius-posts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'menius-posts');

CREATE POLICY "Service update menius-posts" ON storage.objects
  FOR UPDATE USING (bucket_id = 'menius-posts');

CREATE POLICY "Service delete menius-posts" ON storage.objects
  FOR DELETE USING (bucket_id = 'menius-posts');
