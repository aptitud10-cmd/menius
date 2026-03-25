-- Update Buccaneer Diner product images to use the new Imagen 4 seed images
-- Maps each product to the most visually appropriate seed image based on name/type
-- Base URL: https://menius.app/seed/en/

DO $$
DECLARE
  base TEXT := 'https://menius.app/seed/en/';
  rid  UUID := 'a1f5af6a-1805-49d2-b494-f074ac657357';
BEGIN

  -- ── BREAKFAST ────────────────────────────────────────────────────────────────

  -- Pancakes / Silver Dollar
  UPDATE products SET image_url = base || 'pancakes.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%pancake%' OR name ILIKE '%silver dollar%');

  -- Waffles
  UPDATE products SET image_url = base || 'waffles.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%waffle%' OR name ILIKE '%nutella waffle%');

  -- French Toast / Challah / Brioche
  UPDATE products SET image_url = base || 'french-toast.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%french toast%' OR name ILIKE '%challah%' OR name ILIKE '%brioche%');

  -- Eggs Benedict (Classic, Smoked Salmon, Crab Cakes)
  UPDATE products SET image_url = base || 'eggs-benedict.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%benedict%' OR name ILIKE '%hollandaise%');

  -- Omelettes
  UPDATE products SET image_url = base || 'omelette.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%omelette%' OR name ILIKE '%omelet%');

  -- Avocado Toast
  UPDATE products SET image_url = base || 'avocado-toast.webp'
  WHERE restaurant_id = rid
    AND name ILIKE '%avocado toast%';

  -- Eggs & Meat combos (not omelette)
  UPDATE products SET image_url = base || 'eggs-benedict.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%egg%' OR name ILIKE '%corned beef hash%')
    AND image_url NOT IN (base || 'eggs-benedict.webp', base || 'omelette.webp', base || 'avocado-toast.webp', base || 'french-toast.webp', base || 'waffles.webp', base || 'pancakes.webp')
    AND name NOT ILIKE '%fried chicken%'
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%breakfast%'
    );

  -- Bagels
  UPDATE products SET image_url = base || 'club-sandwich.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%bagel%' OR name ILIKE '%new yorker%');

  -- Burritos & Wraps (breakfast)
  UPDATE products SET image_url = base || 'omelette.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%burrito%' OR name ILIKE '%wrap%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%breakfast%'
    );

  -- Juices & Drinks (breakfast)
  UPDATE products SET image_url = base || 'lemonade.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%juice%' OR name ILIKE '%lemonade%' OR name ILIKE '%cranberry%'
         OR name ILIKE '%grapefruit%' OR name ILIKE '%pineapple%' OR name ILIKE '%apple juice%'
         OR name ILIKE '%tomato%' OR name ILIKE '%v-8%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%breakfast%'
    );

  -- Smoothies
  UPDATE products SET image_url = base || 'smoothie.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%smoothie%' OR name ILIKE '%shake%' OR name ILIKE '%blend%');

  -- Yogurt & Fruit
  UPDATE products SET image_url = base || 'ice-cream.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%yogurt%' OR name ILIKE '%fruit salad%' OR name ILIKE '%granola%');

  -- Fried Chicken & Waffle
  UPDATE products SET image_url = base || 'wings.webp'
  WHERE restaurant_id = rid
    AND name ILIKE '%fried chicken%';

  -- Rolls & Bread
  UPDATE products SET image_url = base || 'club-sandwich.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%roll%' OR name ILIKE '%bread%' OR name ILIKE '%toast%')
    AND image_url NOT IN (base || 'french-toast.webp', base || 'avocado-toast.webp');

  -- ── BURGERS ───────────────────────────────────────────────────────────────────

  UPDATE products SET image_url = base || 'burger.webp'
  WHERE restaurant_id = rid
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%burger%'
    );

  -- ── SANDWICHES & WRAPS ────────────────────────────────────────────────────────

  -- Fish sandwiches
  UPDATE products SET image_url = base || 'fish-tacos.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%fish%' OR name ILIKE '%tuna%' OR name ILIKE '%cod%' OR name ILIKE '%flounder%' OR name ILIKE '%tilapia%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%sandwich%'
    );

  -- Chicken sandwiches / wraps
  UPDATE products SET image_url = base || 'grilled-chicken.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%chicken%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%sandwich%'
    );

  -- Turkey / Club / BLT / Reuben
  UPDATE products SET image_url = base || 'club-sandwich.webp'
  WHERE restaurant_id = rid
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%sandwich%'
    )
    AND image_url NOT IN (base || 'fish-tacos.webp', base || 'grilled-chicken.webp');

  -- ── MAINS & STEAKS ────────────────────────────────────────────────────────────

  -- Steaks
  UPDATE products SET image_url = base || 'steak.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%steak%' OR name ILIKE '%sirloin%' OR name ILIKE '%ribeye%'
         OR name ILIKE '%rib eye%' OR name ILIKE '%t-bone%' OR name ILIKE '%porterhouse%'
         OR name ILIKE '%filet%' OR name ILIKE '%romanian%' OR name ILIKE '%strip%');

  -- Ribs
  UPDATE products SET image_url = base || 'ribs.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%rib%' AND name NOT ILIKE '%ribeye%');

  -- Salmon / Fish mains
  UPDATE products SET image_url = base || 'salmon.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%salmon%' OR name ILIKE '%halibut%' OR name ILIKE '%sea bass%'
         OR name ILIKE '%snapper%' OR name ILIKE '%tilapia%' OR name ILIKE '%sole%'
         OR name ILIKE '%trout%' OR name ILIKE '%cod%' OR name ILIKE '%flounder%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%main%'
    );

  -- Lobster / Seafood
  UPDATE products SET image_url = base || 'lobster.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%lobster%' OR name ILIKE '%crab%' OR name ILIKE '%shrimp%'
         OR name ILIKE '%seafood%' OR name ILIKE '%clam%' OR name ILIKE '%oyster%'
         OR name ILIKE '%scallop%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%main%'
    );

  -- Chicken mains
  UPDATE products SET image_url = base || 'grilled-chicken.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%chicken%' OR name ILIKE '%poultry%' OR name ILIKE '%turkey%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%main%'
    );

  -- Pasta / Spaghetti
  UPDATE products SET image_url = base || 'pasta.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%pasta%' OR name ILIKE '%spaghetti%' OR name ILIKE '%linguine%'
         OR name ILIKE '%fettuccine%' OR name ILIKE '%penne%' OR name ILIKE '%rigatoni%'
         OR name ILIKE '%risotto%');

  -- Everything else in mains
  UPDATE products SET image_url = base || 'steak.webp'
  WHERE restaurant_id = rid
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%main%'
    )
    AND image_url NOT IN (base || 'steak.webp', base || 'ribs.webp', base || 'salmon.webp',
                          base || 'lobster.webp', base || 'grilled-chicken.webp', base || 'pasta.webp',
                          base || 'shrimp.webp');

  -- ── APPETIZERS & SIDES ────────────────────────────────────────────────────────

  -- Wings
  UPDATE products SET image_url = base || 'wings.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%wing%' OR name ILIKE '%drumstick%');

  -- Nachos
  UPDATE products SET image_url = base || 'nachos.webp'
  WHERE restaurant_id = rid
    AND name ILIKE '%nacho%';

  -- Onion rings / fries / sides
  UPDATE products SET image_url = base || 'onion-rings.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%onion ring%' OR name ILIKE '%fries%' OR name ILIKE '%french fry%'
         OR name ILIKE '%french fries%' OR name ILIKE '%home fries%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%appetizer%'
    );

  -- Calamari / seafood appetizers
  UPDATE products SET image_url = base || 'calamari.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%calamari%' OR name ILIKE '%clam%' OR name ILIKE '%oyster%'
         OR name ILIKE '%shrimp cocktail%' OR name ILIKE '%ceviche%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%appetizer%'
    );

  -- Sliders
  UPDATE products SET image_url = base || 'sliders.webp'
  WHERE restaurant_id = rid
    AND name ILIKE '%slider%';

  -- Spring rolls / dumplings
  UPDATE products SET image_url = base || 'spring-rolls.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%spring roll%' OR name ILIKE '%dumpling%' OR name ILIKE '%egg roll%');

  -- Everything else in appetizers
  UPDATE products SET image_url = base || 'nachos.webp'
  WHERE restaurant_id = rid
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%appetizer%'
    )
    AND image_url NOT IN (base || 'wings.webp', base || 'nachos.webp', base || 'onion-rings.webp',
                          base || 'calamari.webp', base || 'sliders.webp', base || 'spring-rolls.webp');

  -- ── SOUPS & SALADS ────────────────────────────────────────────────────────────

  -- Caesar Salad
  UPDATE products SET image_url = base || 'caesar-salad.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%caesar%' OR name ILIKE '%salad%' OR name ILIKE '%greens%');

  -- Soups
  UPDATE products SET image_url = base || 'smoothie.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%soup%' OR name ILIKE '%chowder%' OR name ILIKE '%bisque%' OR name ILIKE '%stew%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%soup%'
    );

  -- ── COCKTAILS ─────────────────────────────────────────────────────────────────

  -- Margaritas
  UPDATE products SET image_url = base || 'margarita.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%margarita%' OR name ILIKE '%tequila%' OR name ILIKE '%mojito%'
         OR name ILIKE '%daiquiri%' OR name ILIKE '%cosmopolitan%' OR name ILIKE '%cosmo%');

  -- Whiskey / Bourbon / Old Fashioned
  UPDATE products SET image_url = base || 'whiskey.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%whiskey%' OR name ILIKE '%bourbon%' OR name ILIKE '%scotch%'
         OR name ILIKE '%old fashioned%' OR name ILIKE '%manhattan%' OR name ILIKE '%sour%'
         OR name ILIKE '%martini%' OR name ILIKE '%gin%' OR name ILIKE '%vodka%'
         OR name ILIKE '%rum%' OR name ILIKE '%sangria%' OR name ILIKE '%mimosa%'
         OR name ILIKE '%bellini%');

  -- Beer
  UPDATE products SET image_url = base || 'beer.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%beer%' OR name ILIKE '%lager%' OR name ILIKE '%ale%'
         OR name ILIKE '%ipa%' OR name ILIKE '%stout%' OR name ILIKE '%porter%');

  -- Wine
  UPDATE products SET image_url = base || 'wine.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%wine%' OR name ILIKE '%cabernet%' OR name ILIKE '%merlot%'
         OR name ILIKE '%pinot%' OR name ILIKE '%chardonnay%' OR name ILIKE '%prosecco%'
         OR name ILIKE '%champagne%');

  -- Everything else in cocktails
  UPDATE products SET image_url = base || 'margarita.webp'
  WHERE restaurant_id = rid
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%cocktail%'
    )
    AND image_url NOT IN (base || 'margarita.webp', base || 'whiskey.webp',
                          base || 'beer.webp', base || 'wine.webp');

  -- ── COFFEE & DRINKS ───────────────────────────────────────────────────────────

  UPDATE products SET image_url = base || 'coffee.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%coffee%' OR name ILIKE '%espresso%' OR name ILIKE '%cappuccino%'
         OR name ILIKE '%latte%' OR name ILIKE '%mocha%' OR name ILIKE '%tea%'
         OR name ILIKE '%hot chocolate%' OR name ILIKE '%chai%')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%coffee%'
    );

  UPDATE products SET image_url = base || 'lemonade.webp'
  WHERE restaurant_id = rid
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%coffee%'
    )
    AND image_url NOT IN (base || 'coffee.webp');

  -- ── DESSERTS ──────────────────────────────────────────────────────────────────

  -- Cheesecake
  UPDATE products SET image_url = base || 'cheesecake.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%cheesecake%' OR name ILIKE '%cheese cake%');

  -- Brownie / Chocolate cake
  UPDATE products SET image_url = base || 'brownie.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%brownie%' OR name ILIKE '%chocolate cake%' OR name ILIKE '%lava%'
         OR name ILIKE '%fudge%' OR name ILIKE '%mousse%');

  -- Tiramisu / Cannoli / Italian
  UPDATE products SET image_url = base || 'tiramisu.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%tiramisu%' OR name ILIKE '%cannoli%' OR name ILIKE '%panna cotta%');

  -- Crème brûlée / Custard / Flan
  UPDATE products SET image_url = base || 'creme-brulee.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%crème brûlée%' OR name ILIKE '%creme brulee%' OR name ILIKE '%custard%'
         OR name ILIKE '%flan%' OR name ILIKE '%panna%');

  -- Ice Cream / Sorbet / Gelato
  UPDATE products SET image_url = base || 'ice-cream.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%ice cream%' OR name ILIKE '%sorbet%' OR name ILIKE '%gelato%'
         OR name ILIKE '%sundae%' OR name ILIKE '%parfait%' OR name ILIKE '%float%');

  -- Pie / Apple pie / Key lime
  UPDATE products SET image_url = base || 'apple-pie.webp'
  WHERE restaurant_id = rid
    AND (name ILIKE '%pie%' OR name ILIKE '%cobbler%' OR name ILIKE '%crisp%');

  -- Everything else in desserts
  UPDATE products SET image_url = base || 'brownie.webp'
  WHERE restaurant_id = rid
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%dessert%'
    )
    AND image_url NOT IN (base || 'cheesecake.webp', base || 'brownie.webp', base || 'tiramisu.webp',
                          base || 'creme-brulee.webp', base || 'ice-cream.webp', base || 'apple-pie.webp');

  -- ── FIX EMPTY OR VERY OLD IMAGES ─────────────────────────────────────────────
  -- Any remaining empty or null image_url gets a default
  UPDATE products SET image_url = base || 'burger.webp'
  WHERE restaurant_id = rid
    AND (image_url IS NULL OR image_url = '')
    AND category_id IN (
      SELECT id FROM categories WHERE restaurant_id = rid AND name ILIKE '%burger%'
    );

  UPDATE products SET image_url = base || 'steak.webp'
  WHERE restaurant_id = rid
    AND (image_url IS NULL OR image_url = '');

END $$;
