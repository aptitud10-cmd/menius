-- ============================================================
-- Master Style Anchors — global visual references shared across all
-- restaurants. Used as fallback when a restaurant doesn't have its own
-- style_anchor for a given category. Matched by alias (case/diacritic
-- insensitive) against the restaurant's category name.
--
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS master_style_anchors (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_slug TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  aliases       TEXT[] NOT NULL DEFAULT '{}',
  anchor_url    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_master_style_anchors_aliases
  ON master_style_anchors USING gin (aliases);

ALTER TABLE master_style_anchors ENABLE ROW LEVEL SECURITY;

-- Public read: any signed-in user can read master anchors (used at image
-- generation time across every restaurant). No PII here, just visual refs.
CREATE POLICY "Anyone can read master style anchors"
  ON master_style_anchors
  FOR SELECT
  USING (true);

-- Writes are restricted: only the service role (admin client) can insert,
-- update or delete. The admin UI calls API routes that use createAdminClient(),
-- which bypasses RLS — so no policy needed for write paths.
-- (We explicitly omit any FOR INSERT/UPDATE/DELETE policy so they default-deny
-- for non-service-role connections.)

-- Seed the 15 standard categories (no anchor_url yet — populated by calibration).
INSERT INTO master_style_anchors (category_slug, display_name, aliases) VALUES
  ('omelette',  'Omelettes',          ARRAY['omelette','omelet','tortilla francesa','egg specialty','huevos']),
  ('burger',    'Burgers',            ARRAY['burger','hamburguesa','smash','cheeseburger']),
  ('pizza',     'Pizza',              ARRAY['pizza','calzone']),
  ('taco',      'Tacos',              ARRAY['taco','taquitos','quesadilla','burrito','enchilada']),
  ('salad',     'Salads',             ARRAY['salad','ensalada','caesar','césar','garden']),
  ('pasta',     'Pasta',              ARRAY['pasta','fettuccine','spaghetti','lasagna','alfredo','linguine','carbonara']),
  ('dessert',   'Desserts',           ARRAY['cheesecake','brownie','tiramisu','postre','flan','cake','pie','dessert']),
  ('cocktail',  'Cocktails',          ARRAY['cocktail','margarita','mojito','martini','daiquiri','sangria']),
  ('coffee',    'Coffee & hot drinks',ARRAY['coffee','café','latte','cappuccino','espresso','mocha','tea','té','chocolate caliente']),
  ('breakfast', 'Breakfast plates',   ARRAY['pancake','waffle','french toast','tostada francesa','benedict','chilaquiles','hotcake','molletes','avena']),
  ('sandwich',  'Sandwiches',         ARRAY['sandwich','sub','club','panini','torta','wrap','bocadillo']),
  ('chicken',   'Chicken',            ARRAY['wing','alita','fried chicken','chicken breast','pollo','nuggets']),
  ('steak',     'Steaks & meats',     ARRAY['steak','ribeye','filete','churrasco','asado','sirloin','tenderloin']),
  ('seafood',   'Seafood',            ARRAY['salmon','shrimp','camaron','lobster','langosta','ceviche','fish','pescado','tuna','atún']),
  ('juice',     'Juices & smoothies', ARRAY['jugo','juice','smoothie','batido','lemonade','limonada','horchata'])
ON CONFLICT (category_slug) DO NOTHING;

-- Trigger to auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION trg_master_style_anchors_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS master_style_anchors_touch ON master_style_anchors;
CREATE TRIGGER master_style_anchors_touch
  BEFORE UPDATE ON master_style_anchors
  FOR EACH ROW
  EXECUTE FUNCTION trg_master_style_anchors_touch();
